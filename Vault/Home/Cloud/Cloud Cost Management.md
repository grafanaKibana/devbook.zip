---
topic:
  - Cloud
subtopic: []
summary: "Designing application behavior so cloud cost stays attributable, measurable, and proportional to useful work."
level:
  - "2"
priority: High
status: Ready to Repeat
publish: true
---

Cloud cost is partly an application behavior. A request can consume compute time, database operations, queue deliveries, object storage, network transfer, and telemetry. The monthly bill shows the total; architecture explains why the work happened.

A useful measure connects spend to successful output. If an image pipeline costs more because it processes more images, the total alone cannot distinguish growth from waste. Cost per 1,000 successful images can.

# Cost Surfaces Developers Influence

| Application behavior | Cost it can create | Design question |
| --- | --- | --- |
| Request fan-out and retries | API calls, queue operations, database reads/writes, and compute duration | Is work duplicated, retried without bounds, or repeated instead of cached or batched? |
| Data shape and retention | Primary storage, replicas, indexes, backups, logs, and retrieval charges | Which copies are required, and when can derived or temporary data expire? |
| Service boundaries | Cross-zone, cross-region, gateway, and internet transfer | Does this boundary need a network call, and can the payload or call frequency shrink? |
| Capacity model | Always-on instances, reserved throughput, minimum replicas, or scale-to-zero startup cost | Is demand steady, bursty, latency-sensitive, or schedulable? |
| Observability | Log, metric, trace, indexing, and retention volume | Which signals support a decision, and which fields or sampling rates only add volume? |

Prices change by service, region, tier, and date. Architecture records should link to the current pricing page and state the workload assumptions rather than copy a price as if it were permanent.

# Unit Economics

Choose one denominator that represents useful work and keep its quality definition stable:

```text
cost_per_1_000_successful_jobs =
  (compute + storage + requests + network + observability + allocated_shared_cost)
  / successful_jobs * 1_000
```

Track attempted jobs beside successful jobs. Otherwise a system can appear cheaper by rejecting hard work early or counting degraded output as success. Latency, error rate, and recovery requirements remain guardrails: lowering cost by violating them is not an optimization.

# Design Responses

- Cache only when freshness and authorization allow it; include tenant or access scope in the key.
- Batch operations when added latency and partial-failure behavior remain acceptable.
- Use asynchronous work to absorb bursts, then bound retries and dead-letter handling so failures do not multiply cost indefinitely.
- Expire temporary data, incomplete uploads, verbose logs, and derived artifacts according to explicit retention rules.
- Match the compute model to demand. Serverless can reduce idle capacity, while a steady workload may be cheaper and more predictable on reserved or continuously running capacity.
- Preserve redundancy required by [[Disaster Recovery]]. Recovery capacity is intentional cost, not waste.

# References

- [FinOps Framework: Unit Economics](https://www.finops.org/framework/capabilities/unit-economics/)
