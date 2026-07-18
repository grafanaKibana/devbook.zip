---
publish: true
created: 2026-07-16T16:57:20.526Z
modified: 2026-07-16T16:57:20.526Z
published: 2026-07-16T16:57:20.526Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: A durable .NET message worker boundary with acknowledgement, idempotency, retry, and dead-letter behavior.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

A .NET message worker receives one delivery, applies a bounded business operation, and acknowledges only after the durable effect succeeds. The broker may redeliver after a timeout or process crash, so the handler must be idempotent even when acknowledgements are manual.

## Worker boundary

```csharp
public sealed class InvoiceWorker(
    IQueueConsumer consumer,
    IInvoiceHandler handler,
    IDeadLetterPublisher deadLetters) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var delivery in consumer.ReadAllAsync(stoppingToken))
        {
            try
            {
                await handler.HandleAsync(delivery.Message, stoppingToken);
                await delivery.AckAsync(stoppingToken);
            }
            catch (InvalidMessageException error)
            {
                await deadLetters.PublishAsync(delivery, error.Code, stoppingToken);
                await delivery.AckAsync(stoppingToken);
            }
            catch (TransientDependencyException)
            {
                await delivery.RetryAsync(stoppingToken);
            }
        }
    }
}
```

`HandleAsync` should use a unique message or business-operation key in the same transaction as its state change. A crash after that commit but before `AckAsync` then produces a harmless redelivery.

Dead-letter or quarantine publishing must succeed before the original delivery is acknowledged. Attach the original message identifier, source queue/topic, receive count, schema version, and a stable failure code. Keep secrets and sensitive payloads out of logs.

## Operating rules

Bound concurrency by downstream capacity, not CPU alone. Stop intake or extend acknowledgement deadlines during shutdown. Track queue age, in-flight count, handler latency, retries, dead-letter rate, and idempotency conflicts. A short queue can still be unhealthy if one old message never completes.

## References

- [Worker services in .NET](https://learn.microsoft.com/dotnet/core/extensions/workers) — official `BackgroundService`, hosting, and cancellation model.
- [Hosted services in ASP.NET Core](https://learn.microsoft.com/aspnet/core/fundamentals/host/hosted-services) — official queued background-task and shutdown guidance.
- [RabbitMQ consumer acknowledgements](https://www.rabbitmq.com/docs/confirms#consumer-acks) — primary acknowledgement and redelivery semantics.
- [Azure Service Bus message transfers, locks, and settlement](https://learn.microsoft.com/azure/service-bus-messaging/message-transfers-locks-settlement) — official peek-lock, completion, abandonment, and dead-letter behavior.
