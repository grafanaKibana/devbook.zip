---
topic:
  - Architecture
subtopic:
  - Distributed Systems
level:
  - "2"
priority: High
status: Ready to Repeat
publish: true
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

For all new systems, prefer Azure Service Bus (cloud), RabbitMQ (self-hosted cross-platform), or Kafka (high-throughput streaming). See [[05 Architecture/Distributed Systems/Message Queues/RabbitMQ|RabbitMQ]] and [[05 Architecture/Distributed Systems/Message Queues/Kafka|Kafka]] for modern alternatives.

## Pitfalls

### Windows-Only Lock-In

**What goes wrong**: MSMQ cannot run on Linux or in containers. Teams that build on MSMQ cannot containerize their services or move to cloud-native infrastructure without replacing the messaging layer.

**Mitigation**: for any new system, use RabbitMQ (cross-platform, containerizable) or Azure Service Bus (cloud-managed). Reserve MSMQ for existing systems where migration cost is not justified.

### MSDTC Distributed Transactions

**What goes wrong**: MSMQ's distributed transaction support relies on MSDTC (Microsoft Distributed Transaction Coordinator), which is complex to configure, fragile in network partitions, and unavailable in containers.

**Mitigation**: replace MSDTC-based distributed transactions with the Outbox pattern (write message to DB in the same transaction as the domain change, then relay to the broker) or Saga pattern for multi-step workflows.

## Tradeoffs

| Broker | Platform | Managed | Throughput | Use when |
|---|---|---|---|---|
| MSMQ | Windows only | Self-hosted | Low | Existing on-prem Windows systems |
| RabbitMQ | Cross-platform | Self-hosted | Medium | On-prem or containerized, modern protocols |
| Azure Service Bus | Cloud | Fully managed | Medium-high | Azure-hosted systems, managed operations |
| Kafka | Cross-platform | Self-hosted or managed | Very high | High-throughput event streaming |

**Decision rule**: for new systems, default to Azure Service Bus (Azure) or RabbitMQ (self-hosted). Use Kafka only when you need high-throughput event streaming or event sourcing. MSMQ is a maintenance choice, not a new-system choice.

## Questions

> [!QUESTION]- Why is MSMQ a maintenance choice rather than a new-system choice?
> It's **Windows-only** — it cannot run on Linux or in containers, which blocks containerization and cloud-native deployment. Its distributed-transaction story depends on **MSDTC**, which is fragile and unavailable in containers, and `System.Messaging` doesn't exist in .NET 5+. Modern cross-platform brokers (RabbitMQ, Azure Service Bus, Kafka) provide the same durable async messaging without the platform lock-in, so MSMQ is justified only where it's already deployed and migration cost isn't worth it.

> [!QUESTION]- How does a transactional receive prevent message loss in MSMQ?
> The message is removed from the queue **only if the transaction commits**. You `Begin` a `MessageQueueTransaction`, `Receive` under it, process the message, then `Commit`. If processing throws, you `Abort` and the message is **returned to the queue** for retry. This is the local-transaction equivalent of an ack: a crash mid-processing leaves the message available rather than consumed-and-lost (the same guarantee modern brokers give via manual ack / visibility timeout).

> [!QUESTION]- What replaces MSMQ's MSDTC distributed transactions today?
> The **Outbox pattern**: write the outgoing message to a table in the *same* local DB transaction as the domain change, then a background relay publishes it to the broker with retries (at-least-once + idempotent consumers). For multi-step cross-service workflows, a **Saga** with compensating transactions. Both avoid MSDTC's coordinator fragility — see [[05 Architecture/Distributed Systems/Distributed Transactions|Distributed Transactions]].

## Receive with Transaction Example

```csharp
// Transactional receive — message is only removed if the transaction commits
using var queue = new MessageQueue(@".\Private$\orders");
using var tx = new MessageQueueTransaction();
tx.Begin();
try
{
    var msg = queue.Receive(timeout: TimeSpan.FromSeconds(5), transaction: tx);
    ProcessOrder(msg.Body as string);
    tx.Commit(); // message removed from queue only on commit
}
catch
{
    tx.Abort(); // message returned to queue for retry
    throw;
}
```

## References

- [System.Messaging namespace (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.messaging) — API reference for the .NET Framework MSMQ client; note this is not available in .NET 5+.
- [Message Queuing (MSMQ) overview (Microsoft Learn)](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/msmq/ms711472(v=vs.85)) — Windows MSMQ architecture, queue types, and transactional messaging.
- [[05 Architecture/Distributed Systems/Message Queues/RabbitMQ|RabbitMQ]] — the standard modern alternative for on-premise or self-hosted message brokering; cross-platform, actively maintained.
- [Outbox pattern (Microsoft Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transactional-outbox-cosmos) — the modern replacement for MSDTC-based distributed transactions: write message to DB in the same transaction as the domain change, then relay to the broker.
- [Azure Service Bus overview (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview) — the cloud-managed successor to MSMQ for Azure-hosted systems; supports sessions, dead-lettering, and scheduled delivery.
