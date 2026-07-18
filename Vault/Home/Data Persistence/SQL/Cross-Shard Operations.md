---
topic:
  - Data Persistence
subtopic:
  - SQL
summary: "Executing queries, transactions, and global constraints when one operation spans several independent shards."
level:
  - "4"
priority: High
status: Creation
publish: true
---

# Intro

Cross-shard work starts when one request cannot be routed to a single owner. The router must fan out queries, coordinate commits, or maintain a global constraint outside any one shard. That cost grows with shard count and failure probability, which is why a useful shard key co-locates the data that must transact and query together.

[[Sharding]] owns strategy selection. [[Shard Routing and Rebalancing]] owns the ownership map and movement protocol. This note owns operations that deliberately cross those owners.

## Scatter-Gather Reads

Suppose an administrator requests the newest 100 orders across 32 tenant shards. Each shard can return its local top 100, and a coordinator merges those 3,200 candidates into the global top 100:

```text
for each shard in parallel:
    SELECT ... ORDER BY CreatedAt DESC LIMIT 100
merge candidates by CreatedAt
return first 100
```

The operation needs a deadline, per-shard concurrency limit, deterministic tie-breaker, and an explicit partial-result policy. One slow shard otherwise controls tail latency. Pagination also needs a cursor containing enough per-shard progress to avoid duplicates or omissions; a single global offset becomes increasingly expensive.

Do not assume every query without a shard key must hit every shard. A global secondary index or directory can narrow candidates, but that index becomes another distributed data product with its own lag and repair contract.

## Transactions

A transaction inside one shard uses that database's ordinary ACID boundary. A write spanning shards needs one of three explicit designs:

- **Distributed commit.** Two-phase commit can produce one atomic decision when every participant and coordinator implement durable prepare/recovery. It adds coordination latency and can leave prepared work waiting during failures.
- **Saga or workflow.** Commit local steps and compensate later when a downstream step fails. This preserves progress, not isolation; intermediate states are visible and compensation must be idempotent.
- **Redesign ownership.** Place all data required for the invariant on one shard, or reserve inventory/funds through a single authoritative service. This is usually the simplest hot-path design.

For example, transferring value between accounts on different shards cannot be implemented as two unrelated updates. Use a documented distributed transaction, or model the operation as a durable transfer workflow with one operation ID, debit/credit ledger entries, retries, and reconciliation.

## Global Constraints

A local unique index can prove uniqueness only inside its shard. Global usernames or order numbers require one authority:

- route the unique value itself to a registry shard and reserve it conditionally;
- allocate disjoint prefixes or ranges per shard;
- generate globally unique identifiers when semantic uniqueness is unnecessary.

Foreign keys across independent shard databases are not enforced by one local engine. Co-locate the relationship, validate through an owning service, or accept asynchronous repair. Copying small reference data such as country codes to every shard avoids remote reads, but updates need a version and rollout policy.

## Failure Boundaries

- Retry each shard request only when the operation is idempotent or deduplicated.
- Record which participants committed before attempting compensation or repair.
- Bound fan-out concurrency; one client request must not create an unbounded fleet-wide burst.
- Expose partial results as partial. Silently omitting an unavailable shard corrupts totals and rankings.
- Reconcile distributed workflows from durable operation state, not from in-memory retry loops.

## Questions

> [!QUESTION]- Why is a saga not equivalent to a cross-shard ACID transaction?
> A saga commits each local step independently and compensates later. Other transactions can observe intermediate states, and compensation may not restore the exact prior world. It is a workflow consistency model, not distributed isolation.

> [!QUESTION]- How can a system enforce a globally unique username across shards?
> Route the username to one reservation authority, conditionally insert it there, and use that reservation as the operation's idempotent proof before creating the user on the owning shard. A unique index on each user shard proves only per-shard uniqueness.

## References

- [Sharding pattern](https://learn.microsoft.com/azure/architecture/patterns/sharding) — Azure Architecture Center coverage of multi-shard queries, reference data, and operational considerations.
- [Compensating transaction pattern](https://learn.microsoft.com/azure/architecture/patterns/compensating-transaction) — Microsoft guidance on recording, retrying, and compensating eventually consistent workflow steps.
- [Vitess distributed transactions](https://vitess.io/docs/reference/features/distributed-transaction/) — official description of multi-shard transaction modes and their availability and latency costs.
- [Designing Data-Intensive Applications, Ch. 9: Consistency and Consensus](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/) — treatment of distributed transactions, atomic commit, consensus, and failure boundaries.
