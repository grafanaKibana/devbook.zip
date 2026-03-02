---
topic:
  - Architecture
subtopic:
  - Distributed Systems
level:
  - "2"
priority: High
status: Ready To Repeat

dg-publish: true
---

# Intro

Microsoft Message Queuing (MSMQ) is a Windows message-queueing technology historically used for reliable, asynchronous messaging in on-premise environments.

## Example

In .NET Framework, MSMQ is commonly accessed via `System.Messaging`.

```csharp
using System.Messaging;

MessageQueue.Create(@".\\Private$\\orders");
using var q = new MessageQueue(@".\\Private$\\orders");
q.Send("order-123");
```


## Questions

> [!QUESTION]- When should MSMQ be used today?
> Mostly in legacy/on-prem Windows environments where MSMQ is already part of the system. For new systems, prefer actively supported managed brokers/queues appropriate for your platform and operational model.

## Links

- [System.Messaging namespace](https://learn.microsoft.com/en-us/dotnet/api/system.messaging)

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
