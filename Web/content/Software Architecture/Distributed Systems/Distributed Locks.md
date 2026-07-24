---
publish: true
created: 2026-07-18T14:02:44.149Z
modified: 2026-07-18T14:02:44.150Z
published: 2026-07-18T14:02:44.150Z
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

The protected resource must remember the highest accepted fence. Without that check, the lease service can exclude current holders while a stale holder still corrupts the resource. A quorum or consensus-backed store improves the ownership decision; it does not remove process pauses or make an unfenced downstream write safe.

# Prefer a Native Invariant

Use a unique database constraint to prevent duplicate order creation, optimistic concurrency to reject stale document updates, idempotency keys to suppress retries, and partition ownership to serialize queue work. These mechanisms protect the actual data invariant and are often safer than a separate lock.

Use a distributed lease when the resource has no stronger atomic primitive and duplicate work is expensive: singleton maintenance, leader-only scheduling, or exclusive access to a legacy device. Define lease duration from the worst expected pause, renewal failure behavior, fencing, and recovery ownership.

The source visual remains rejected because it presents mutual exclusion as sufficient and recommends locks for cases better served by constraints, idempotency, or partition ownership.

# References

- [The Chubby lock service](https://research.google/pubs/the-chubby-lock-service-for-loosely-coupled-distributed-systems/) — primary design for coarse-grained distributed locking, sessions, sequencers, and failure semantics.
- [etcd concurrency API](https://etcd.io/docs/v3.6/dev-guide/api_concurrency_reference_v3/) — official lease, mutex, election, and session interfaces backed by etcd consensus.
- [How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) — practitioner analysis of leases, pauses, and fencing-token requirements.
- [ByteByteGo: why distributed locks](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/why-do-we-need-to-use-a-distributed-lock.md) — provenance for the problem inventory; its visual is rejected because it omits fencing and stronger alternatives.
