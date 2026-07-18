---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Operating .NET Kafka consumers with manual offsets, idempotency, poison-record quarantine, and lag telemetry."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

The Confluent .NET client maps Kafka's group, partition, and offset model into a poll loop. Correctness depends on when the application advances the offset. Commit only after the business effect or an owned quarantine path is durable.

## Consumer loop

```csharp
using Confluent.Kafka;

var config = new ConsumerConfig
{
    BootstrapServers = "kafka:9092",
    GroupId = "billing-v1",
    EnableAutoCommit = false,
    AutoOffsetReset = AutoOffsetReset.Earliest
};

using var consumer = new ConsumerBuilder<string, string>(config).Build();
consumer.Subscribe("orders.v1");

while (!cancellationToken.IsCancellationRequested)
{
    var record = consumer.Consume(cancellationToken);

    try
    {
        var order = OrderPlaced.Parse(record.Message.Value);
        await handler.HandleAsync(order, cancellationToken);
        consumer.Commit(record);
    }
    catch (InvalidOrderEventException error)
    {
        await quarantine.PublishAsync(record, error.Code, cancellationToken);
        consumer.Commit(record);
    }
}
```

If parsing or validation identifies a poison record, publish the original topic, partition, offset, key, payload, schema identifier, and reason to a controlled quarantine topic first. Commit only after that publish succeeds. Logging and continuing without a commit creates a poison loop; committing before quarantine loses the evidence.

Transient failures should leave the offset uncommitted and use bounded retry or pause/resume so one hot partition does not spin. Business handlers still need idempotency because a crash can happen after the side effect but before the commit.

## Operations

Track consumer lag by group and partition, oldest-record age, rebalance duration, quarantine rate, processing latency, and commit failures. Lag is work not yet acknowledged, not proof that derived data is correct. Use stable group IDs per logical projection and plan reset/replay procedures before an incident.

## References

- [Confluent .NET client overview](https://docs.confluent.io/kafka-clients/dotnet/current/overview.html) — official consumer, commit, and delivery-semantics guidance.
- [Apache Kafka consumer configuration](https://kafka.apache.org/documentation/#consumerconfigs) — primary group, offset, heartbeat, and fetch settings.
- [Confluent poison pill handling](https://www.confluent.io/blog/spring-kafka-can-your-kafka-consumers-handle-a-poison-pill/) — practical quarantine and deserialization-failure handling; concepts apply beyond the Java example.
