---
topic:
  - "Architecture"
subtopic:
  - "Distributed Systems"
level:
  - "2"
priority: Medium
status: Creation

dg-publish: true
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
