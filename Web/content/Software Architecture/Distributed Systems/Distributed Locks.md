---
publish: true
created: 2026-08-20T20:41:15.677Z
modified: 2026-08-20T20:41:15.677Z
published: 2026-08-20T20:41:15.677Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Distributed locks are expiring leases whose users need ownership and fencing tokens to survive pauses, expiry, and partitions.
level:
  - "4"
priority: High
status: Ready to Repeat
---

A distributed lock is usually a lease: exclusive ownership for a bounded time, not permanent mutual exclusion. A process can pause longer than its lease, resume, and still believe it owns the resource. Correct designs make stale owners harmless.

# Lease, Ownership, and Fencing

Acquire the lease from a linearizable store with an owner token, expiry, and monotonically increasing fencing token. Renew only while the owner token still matches. Release by compare-and-delete, never by deleting a key solely by name.

```text
worker A acquires reports/monthly -> fence 41
A pauses; lease expires
worker B acquires reports/monthly -> fence 42
A resumes and sends write with fence 41 -> storage rejects 41 < 42
```

The protected resource must remember the highest accepted fence. Without that check, the lease service can exclude current holders while a stale holder still corrupts the resource. A quorum or consensus-backed store improves the ownership decision. It does not remove process pauses or make an unfenced downstream write safe.

# Prefer Constraints, Version Checks, Idempotency, or Partitioning

A unique database constraint can prevent duplicate orders. Optimistic concurrency rejects stale document updates, idempotency keys suppress retries, and partition ownership serializes queue work. These mechanisms protect the data invariant directly and are often safer than a separate lock.

A distributed lease fits when the resource has no stronger atomic primitive and duplicate work is expensive, such as singleton maintenance or exclusive access to a legacy device. Its contract includes lease duration, renewal failure behavior, fencing, and recovery ownership. The duration must cover expected pauses without delaying recovery for too long.

Mutual exclusion alone does not protect against a stale lock holder. Fencing, a database constraint, idempotency, or partition ownership may be the stronger control.

# References

- [The Chubby lock service](https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/)
- [etcd concurrency API](https://etcd.io/docs/v3.6/dev-guide/api_concurrency_reference_v3/)
- [How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
