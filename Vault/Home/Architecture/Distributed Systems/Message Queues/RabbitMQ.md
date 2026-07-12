---
topic:
  - Architecture
subtopic:
  - Distributed Systems
summary: "Open-source AMQP 0-9-1 broker routing messages from exchanges to queues via bindings, decoupling producers from consumers."
level:
  - "2"
priority: High
status: Done

publish: true
---

# Intro

RabbitMQ is an open-source message broker implementing AMQP 0-9-1, where producers publish to exchanges and messages are routed to queues through bindings and routing keys before consumers process them. It matters because it decouples producers and consumers, enables asynchronous processing, and absorbs traffic spikes without forcing synchronous dependency chains. In interviews, reach for RabbitMQ when you need task queues, request-reply, pub/sub fan-out, or fair work distribution across multiple workers. In a `[[Webhooks|Webhook]] -> Queue -> Worker` system, RabbitMQ is usually the safety valve between bursty ingress and bounded worker throughput.

## AMQP Model

RabbitMQ routing is explicit: producers publish to an exchange, not directly to a queue (except via the default exchange behavior).

```mermaid
flowchart LR
    P[Producer] --> E[Exchange]
    E -->|binding with routing key| Q[Queue]
    Q --> C[Consumer]
```

Core parts:

- **Producer**: publishes a message.
- **Exchange**: decides routing destination(s).
- **Binding**: connects exchange to queue with a rule.
- **Routing key**: message attribute used in route matching.
- **Queue**: stores messages until consumed.
- **Consumer**: processes and acks or nacks messages.

### Exchange Types

| Type | Rule | Typical use |
| --- | --- | --- |
| Direct | Exact routing key match | Command-style task queues (`order.created`) |
| Fanout | Broadcast to all bound queues | One event consumed by many services |
| Topic | Pattern match with `*` and `#` | Domain events with taxonomy (`order.*`, `payment.#`) |
| Headers | Match message headers | Complex metadata-based routing |

## Delivery Guarantees

RabbitMQ provides mechanisms to build guarantees; it does not make exactly-once automatic.

### At-most-once

- Consumer uses `autoAck: true`.
- Producer does not use publisher confirms.
- If consumer crashes after delivery, message is lost.
- If broker fails before safe persistence/replication, message can be lost.

Use this only when occasional loss is acceptable.

### At-least-once

- Producer uses publisher confirms.
- Queue is durable and messages are persistent.
- Consumer uses manual ack.
- On failure before ack, message is redelivered.

Tradeoff: duplicates are possible; consumers must be idempotent.

### Exactly-once

RabbitMQ does not natively offer end-to-end exactly-once delivery. Achieve business-level exactly-once behavior with idempotent consumers, deduplication keys, and producer outbox patterns.

### Confirms, Ack, Nack, Reject, DLX

- **Publisher confirms**: broker acks or nacks a publish after it enters the broker reliability path; this does not confirm consumer processing.
- **`BasicAck`**: processing succeeded; broker can remove message.
- **`BasicNack`**: processing failed; choose requeue or dead-letter.
- **`BasicReject`**: reject one message (single-message variant).
- **DLX (Dead Letter Exchange)**: catches rejected messages (`requeue: false`), expired messages (TTL), queue overflow drops, and quorum delivery-limit failures.

## C# Example (`RabbitMQ.Client`)

### Producer

```csharp
using System.Text.Json;
using RabbitMQ.Client;

var factory = new ConnectionFactory { HostName = "localhost" };

await using var connection = await factory.CreateConnectionAsync();
await using var channel = await connection.CreateChannelAsync(
    new CreateChannelOptions(
        publisherConfirmationsEnabled: true,
        publisherConfirmationTrackingEnabled: true));

await channel.QueueDeclareAsync(
    queue: "orders",
    durable: true,
    exclusive: false,
    autoDelete: false,
    arguments: null);

var order = new Order("ord-1001", "cust-42", 129.50m);
var body = JsonSerializer.SerializeToUtf8Bytes(order);

var props = new BasicProperties
{
    DeliveryMode = 2,
    MessageId = order.OrderId,
    ContentType = "application/json"
};

await channel.BasicPublishAsync(
    exchange: "",
    routingKey: "orders",
    mandatory: true,
    basicProperties: props,
    body: body);

public sealed record Order(string OrderId, string CustomerId, decimal Amount);
```

### Consumer

```csharp
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

var factory = new ConnectionFactory { HostName = "localhost" };

await using var connection = await factory.CreateConnectionAsync();
await using var channel = await connection.CreateChannelAsync();

await channel.BasicQosAsync(prefetchSize: 0, prefetchCount: 32, global: false);

var consumer = new AsyncEventingBasicConsumer(channel);
consumer.ReceivedAsync += async (_, ea) =>
{
    try
    {
        var order = JsonSerializer.Deserialize<Order>(ea.Body.Span);
        if (order is null)
        {
            await channel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: false);
            return;
        }

        await ProcessOrderAsync(order);
        await channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
    }
    catch (TransientDependencyException)
    {
        await channel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: true);
    }
    catch
    {
        await channel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: false);
    }
};

await channel.BasicConsumeAsync(queue: "orders", autoAck: false, consumer: consumer);

await Task.Delay(Timeout.InfiniteTimeSpan);

static Task ProcessOrderAsync(Order order) => Task.CompletedTask;

public sealed class TransientDependencyException : Exception;
public sealed record Order(string OrderId, string CustomerId, decimal Amount);
```

## Key Operational Concepts

### Prefetch count (QoS)

- Controls max unacked messages per consumer.
- Prevents one slow worker from hoarding deliveries.
- Tune by workload: lower for CPU-heavy handlers, higher for IO-heavy handlers.

### Message TTL

- `x-message-ttl` expires stale messages.
- Useful for time-sensitive events.
- Expired messages can be inspected through DLX.

### Queue length limits

- `x-max-length` and `x-max-length-bytes` cap backlog.
- Protects memory and disk under producer spikes.
- Pair with alerts on queue depth and message age.

### Lazy queues

- Prioritize disk storage over memory residency.
- Good for deep buffers and burst handling.
- Tradeoff: generally higher per-message latency.

### Quorum queues

- Replicated queues based on Raft.
- Better safety and failover behavior than classic mirrored queues.
- Recommended replacement for mirrored classic queues in production designs.

## Pitfalls

### 1) Unbounded queues without TTL and length limits

- **What goes wrong**: backlog grows without bound.
- **Why**: producer rate exceeds consumer rate and no limits are configured.
- **Impact**: memory/disk exhaustion and potential node crash.
- **Mitigation**: set TTL and max-length policies, use lazy/quorum queues where appropriate, and alert aggressively.

### 2) Auto-ack in production

- **What goes wrong**: message acknowledged before work is complete.
- **Why**: consumer crashes after receive but before business side effects finish.
- **Impact**: silent message loss.
- **Mitigation**: disable auto-ack and ack only after successful processing.

### 3) Relying on classic mirrored queues

- **What goes wrong**: weaker safety profile in failure scenarios.
- **Why**: mirrored classic queues are legacy compared to quorum queues.
- **Impact**: higher data-loss/failover risk.
- **Mitigation**: use quorum queues for new systems and migration plans.

### 4) Not setting prefetch

- **What goes wrong**: one slow consumer starves others.
- **Why**: uneven distribution of in-flight deliveries.
- **Impact**: higher tail latency and poor parallelism.
- **Mitigation**: set and tune `BasicQos` prefetch via load tests.

## Questions

> [!QUESTION]- How do you use RabbitMQ to absorb bursty ingress when producers outpace consumers?
> Put a durable queue between the ingress and the workers so bursts land in the queue instead of overwhelming the worker tier. Keep the ingress path thin — validate, enqueue, return `200` fast — so a webhook sender never waits on your processing. Then scale competing consumers horizontally off the same queue, and use prefetch (`BasicQos`) so one slow worker can't hoard unacked messages while others sit idle. Route poison messages to a dead-letter exchange and watch queue depth, redelivery rate, and message age. The queue is the shock absorber: it turns a traffic spike into a temporary backlog instead of dropped requests or a melted worker tier.

> [!QUESTION]- How do you implement at-least-once delivery, and what new risk appears?
> At-least-once is four settings working together: a durable queue, persistent messages (`DeliveryMode = 2`), publisher confirms so the producer knows the broker accepted the message, and manual consumer ack so a message isn't removed until processing succeeds. If a consumer crashes before acking, the broker redelivers. The risk that buys you is duplicates — a redelivery can race an ack — so consumers must be [[Idempotency|idempotent]], keyed on a stable message ID with a dedupe store. You trade the possibility of loss for the certainty of occasional duplicates, which is the far easier problem to make safe.

> [!QUESTION]- When would you choose RabbitMQ over Kafka?
> Choose RabbitMQ when you want a smart broker doing the routing — direct, topic, fanout, and header exchanges, per-message TTL, priorities, dead-lettering — for task queues, request-reply, and command dispatch where low latency and flexible routing matter more than retention. Choose [[Kafka]] when you need a durable, replayable log: high-throughput event streams, ordering per partition, and multiple independent consumers re-reading history by offset. The rough line is that RabbitMQ moves a message and forgets it, while Kafka stores an event history. If you keep wishing you could re-consume past messages, you actually wanted Kafka.

## References

- [RabbitMQ Documentation](https://www.rabbitmq.com/docs) — official reference covering exchanges, queues, bindings, durability, and clustering.
- [RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials) — step-by-step tutorials for common messaging patterns: work queues, pub/sub, routing, topics, and RPC.
- [CloudAMQP: RabbitMQ Best Practice for High Performance](https://www.cloudamqp.com/blog/part1-rabbitmq-best-practice.html) — practitioner guide on connection pooling, prefetch count, persistent messages, and avoiding common performance pitfalls.
- [RabbitMQ .NET API Guide](https://www.rabbitmq.com/client-libraries/dotnet-api-guide) — official .NET client library reference covering connection management, channel lifecycle, and consumer patterns.
