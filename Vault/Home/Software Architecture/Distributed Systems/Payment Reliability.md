---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Payment reliability resolves ambiguous provider outcomes with durable idempotency, verified callbacks, constrained failover, and reconciliation."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Payment Reliability

Payments fail in the gap between local certainty and remote side effects. A capture request can time out after the PSP accepted it, a webhook can arrive twice or out of order, and a retry can reach a different worker. The system cannot promise exactly-once communication. It can persist one business operation, suppress duplicate execution, apply monotonic state transitions, and use independent evidence to resolve uncertainty.

## Durable Idempotency

Create an immutable payment attempt before calling a provider. Bind the idempotency key to the operation and request fingerprint, not merely the customer session:

```http
POST /payments
Idempotency-Key: order_8127:card:capture:v1
Content-Type: application/json

{
  "amount": 10000,
  "currency": "USD"
}
```

Reusing the key with `12000 USD` must return a conflict. A unique persistence invariant closes the race between workers:

```sql
CREATE UNIQUE INDEX ux_payment_attempt_provider_key
ON payment_attempt(provider, idempotency_key);
```

The creation transaction stores the request fingerprint, creates `attempt_44` in `PENDING`, and stores the initial replayable response:

```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "attempt_id": "attempt_44",
  "state": "PENDING"
}
```

A duplicate with the same key and fingerprint replays that `202` and attempt ID; a different fingerprint returns a conflict. The provider call runs after the creation transaction commits. Its result is persisted later through a conditional state transition such as `PENDING -> AUTHORIZED` or `PENDING -> UNKNOWN`, and the client reads the current attempt state by ID. An [[Idempotency]] header without durable uniqueness, fingerprint comparison, and a stored response can still execute twice.

## Unknown Outcomes

Suppose capture `attempt_44` times out after five seconds. The PSP may not have received it, may have accepted it before the response was lost, or may still be processing it. Use this order:

1. Mark the attempt `UNKNOWN` and keep the same merchant reference and idempotency key.
2. Query the PSP by provider or merchant reference.
3. Retry the same provider operation with the same key only when its contract documents replay safety.
4. Accept signed callback evidence through a conditional state transition.
5. Reconcile the attempt against provider reports before declaring it missing.
6. Route elsewhere only after the first attempt is terminal or an explicit duplicate-risk policy permits it.

Blind failover converts uncertainty into a probable double charge.

## PSP Routing and Failure Isolation

Route before creating the provider attempt and persist the rule version. Inputs may include currency, country, method, merchant contract, provider health, cost, and measured authorization rate.

| Strategy | Benefit | Cost | Use when |
| --- | --- | --- | --- |
| One PSP | Simple integration and reconciliation | One provider outage stops acceptance | Early products and low volume |
| Terminal failover | Better availability for proven failures | Portable tokens and normalized failures required | A second PSP materially reduces outage risk |
| Dynamic routing | Cost or authorization optimization | More paths, experiments, and reconciliation surfaces | Volume funds a dedicated payments platform |

Trip circuit breakers on technical failure and saturation, not issuer declines. Bound calls by the checkout latency budget, isolate pools, cap concurrent attempts, and shed load before queues exhaust the database.

![[System Design 101/1adb865f841a8c5c151bbe3f1e971ed5a58335ff6ddbda5d983c0ba7152b8953.png]]

Measure latency, traffic, technical errors, declines by reason, unknown outcomes, saturation, webhook lag, and reconciliation breaks. Load tests must include retries and callback bursts because those are the paths that amplify an incident.

## Verified Webhooks

[[Webhooks]] are asynchronous evidence, not trusted commands. Verify the signature over the exact raw body and signed timestamp, reject stale timestamps, and store `(provider, event_id)` under a unique constraint. Persist the event before returning `2xx`, then process it asynchronously.

An `AUTHORIZED` event after `CAPTURED` must not move the state backward. A duplicate `payment_succeeded` must not fulfill twice. If a handler commits the state transition but fails before acknowledging its queue message, the retry should observe the applied event and become a no-op. Retrieval APIs and scheduled reconciliation recover callbacks that never arrive.

## References

- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests) — provider contract for stable keys, parameter comparison, replayed responses, and retry behavior.
- [Stripe Payment Intents](https://docs.stripe.com/payments/payment-intents) — official durable intent lifecycle for asynchronous and multi-step payment methods.
- [Stripe payment status updates](https://docs.stripe.com/payments/payment-intents/verifying-status) — official server-side webhook, fulfillment, polling, and status-verification guidance.
- [Adyen idempotency](https://docs.adyen.com/development-resources/api-idempotency/) — official key scope, concurrent request behavior, and retry boundary.
