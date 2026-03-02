---
topic:
  - Architecture
subtopic:
  - Distributed Systems
level:
  - "2"
priority: High
status: Creation
dg-publish: true
---

# MSMQ

Microsoft Message Queuing (MSMQ) is a Windows-native message queuing technology that provides reliable, asynchronous messaging for on-premise environments. Messages are stored durably on disk and delivered to consumers even if the consumer is temporarily unavailable. MSMQ was the standard Windows messaging infrastructure before cloud-managed brokers (Azure Service Bus, RabbitMQ) became the default choice.

MSMQ is a legacy technology. For new systems, use Azure Service Bus, RabbitMQ, or Kafka. MSMQ remains relevant in on-premise Windows environments where it is already deployed and replacing it is not justified.

## Basic Usage

In .NET Framework, MSMQ is accessed via `System.Messaging`:

```csharp
using System.Messaging;

// Create a private queue (if it doesn't exist)
if (!MessageQueue.Exists(@".\Private$\orders"))
    MessageQueue.Create(@".\Private$\orders", transactional: true);

// Send a message
using var queue = new MessageQueue(@".\Private$\orders");
queue.Send("order-123", MessageQueueTransactionType.Single);

// Receive a message (blocking)
var msg = queue.Receive(timeout: TimeSpan.FromSeconds(5));
Console.WriteLine(msg.Body);
```

In .NET 5+, `System.Messaging` is not available. Use the community `MSMQ.Messaging` NuGet package or migrate to a supported broker.

## Key Characteristics

- **Durable**: messages are written to disk before the send returns. Messages survive process and machine restarts.
- **Transactional**: MSMQ supports local and distributed (MSDTC) transactions, enabling exactly-once delivery within a Windows environment.
- **Windows-only**: MSMQ is a Windows component. It cannot run on Linux or in containers.
- **Point-to-point**: MSMQ queues are point-to-point by default. Fan-out requires multiple queues or a separate routing layer.

## When to Use MSMQ Today

MSMQ is appropriate only when:
- The system already uses MSMQ and migration cost is not justified.
- The environment is on-premise Windows with no cloud connectivity.
- MSDTC-based distributed transactions are required and cannot be replaced with Saga/Outbox patterns.

For all new systems, prefer Azure Service Bus (cloud), RabbitMQ (self-hosted cross-platform), or Kafka (high-throughput streaming). See [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/RabbitMQ|RabbitMQ]] and [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/Kafka|Kafka]] for modern alternatives.

## References

- [System.Messaging namespace (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.messaging) — API reference for the .NET Framework MSMQ client; note this is not available in .NET 5+.
- [Message Queuing (MSMQ) overview (Microsoft Learn)](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/msmq/ms711472(v=vs.85)) — Windows MSMQ architecture, queue types, and transactional messaging.
- [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/RabbitMQ|RabbitMQ]] — the standard modern alternative for on-premise or self-hosted message brokering; cross-platform, actively maintained.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/Distributed Systems/Distributed Systems|Distributed Systems]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/Kafka|Kafka]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/RabbitMQ|RabbitMQ]]
<!-- whats-next:end -->
