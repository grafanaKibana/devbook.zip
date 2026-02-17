---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/distributed-systems/message-queues/rabbit-mq/","noteIcon":"1"}
---


# Intro

RabbitMQ is a message broker that implements AMQP. It is commonly used to decouple services via queues, exchanges, and routing keys.

## Example

Run RabbitMQ locally with the management UI:

```bash
docker run --rm -it \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management
```

Then open `http://localhost:15672` (default credentials: `guest`/`guest`).

## Links

- [RabbitMQ Documentation](https://www.rabbitmq.com/docs)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/Distributed Systems/Distributed Systems\|Distributed Systems]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/Kafka\|Kafka]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/MSMQ\|MSMQ]]
<!-- whats-next:end -->
