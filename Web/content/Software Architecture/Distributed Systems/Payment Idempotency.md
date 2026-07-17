---
publish: true
created: 2026-07-16T16:55:27.919Z
modified: 2026-07-16T16:55:27.919Z
published: 2026-07-16T16:55:27.919Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Coordinating a local payment attempt with a provider idempotency contract and unknown outcomes.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

Payment idempotency prevents one logical payment request from creating multiple provider charges when clients, gateways, or workers retry. It needs two separate contracts: a durable local attempt keyed by the merchant's idempotency key, and a provider that honors that same key for repeated charge calls. It does not make the whole distributed workflow exactly once.

## Safe sequence

1. In a short database transaction, insert a `Pending` attempt with a unique `(merchant, idempotency_key)` constraint and commit.
2. If an existing attempt is `Completed`, return its stored response. If it is `Pending` or `Unknown`, return an in-progress response or enter reconciliation; do not create another provider key.
3. Call the provider outside the database transaction and pass the same idempotency key.
4. In a second short transaction, atomically move the attempt from `Pending` or `Unknown` to `Completed` and store the provider charge ID and stable response.

Never hold a database transaction open across the provider call. That keeps locks and connections alive during network latency and still cannot atomically commit the provider's database with yours.

## Unknown outcomes

A timeout means the provider may have charged successfully but the response was lost. Mark the attempt `Unknown` without deleting it. Query the provider by idempotency key or reconcile from provider webhooks. Retrying is safe only with the same key and only when the provider documents its deduplication retention and request-equivalence rules.

The defensible claim is: one durable effect at the declared idempotency boundary. The provider may guarantee one charge per key; the local database may guarantee one completed attempt per key. Email, ledger posting, and downstream events each need their own inbox, outbox, or idempotent state transition.

## References

- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests) — provider contract for key retention, parameter comparison, and repeated results.
- [Adyen API idempotency](https://docs.adyen.com/development-resources/api-idempotency/) — provider behavior for duplicate requests, transient errors, and regional keys.
- [Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html) — reliable handoff from a local transaction to downstream messaging.
