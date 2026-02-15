---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/distributed-systems/message-queues/kafka/","noteIcon":""}
---


# Intro

Apache Kafka is a distributed event streaming platform built around an append-only log (topics/partitions) and consumer groups.

It is often used for event-driven architectures, log aggregation, and streaming pipelines.

## Example

Create a topic and describe it (commands depend on your Kafka distribution):

```bash
kafka-topics.sh --create --topic orders --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
kafka-topics.sh --describe --topic orders --bootstrap-server localhost:9092
```


## Questions

> [!QUESTION]- What is Kafka?
> Apache Kafka is a distributed event streaming platform built around an append-only log (topics/partitions) and consumer groups.

## Links

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
