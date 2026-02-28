---
{"dg-publish":true,"permalink":"/software-engineering/10-cloud/aws/sqs/","noteIcon":"3"}
---


# Intro

Amazon SQS is a managed message queue.

Core concerns: visibility timeout, retries, dead-letter queues, and idempotent consumers.

## Questions

> [!QUESTION]- Messages can be delivered more than once. How do you implement an idempotent consumer (dedup key, storage, TTL), and what failure modes do you watch for?
> Use a stable idempotency key per business operation (for example, `orderId`/`paymentId`), not a per-attempt GUID.
> Persist processed keys in a durable store with a uniqueness guarantee and a TTL window (DB table with a unique constraint, or Redis with expiry).
> Make side effects idempotent (upsert/conditional update) and, when possible, commit the dedup key + state change atomically (inbox/outbox pattern).
> Watch for: visibility timeout shorter than processing (duplicate in-flight), retries after partial failure, poison messages (DLQ), parallel consumers racing, and TTL that is too short.

## Example

List queues:

```bash
aws sqs list-queues
```

## Links

- [Amazon SQS documentation](https://docs.aws.amazon.com/sqs/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/10 Cloud/10 Cloud\|10 Cloud]]
>
> **Pages**
> - [[Software Engineering/10 Cloud/AWS/DynamoDB\|DynamoDB]]
> - [[Software Engineering/10 Cloud/AWS/EC2\|EC2]]
> - [[Software Engineering/10 Cloud/AWS/S3\|S3]]
<!-- whats-next:end -->
