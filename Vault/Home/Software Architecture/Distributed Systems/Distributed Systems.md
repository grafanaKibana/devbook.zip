---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Core distributed-systems concepts for production: consistency tradeoffs, messaging, coordination, and failure handling under an unreliable network."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "4"
status: Creation
---

Distributed systems are hard because the network is unreliable and time is messy: partial failures, latency, and inconsistent views of the world. These notes focus on the core concepts that show up in production: consistency tradeoffs, messaging, coordination, and failure handling. Example: CAP is not a slogan; it explains why a partition forces you to pick between availability and strong consistency.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Quality attributes and measurable targets

![[System Design 101/7fbb3588d967cd7b05cbb658f23cb5b34df18067d8be6eedbe58ca89b57b3eb1.png]]

The four labels are an orientation mnemonic, not independent boxes. Logging does not create reliability, and load balancing alone does not create availability. Turn each attribute into a workload, target, failure model, and measurement window:

| Attribute | Concrete target | Mechanism question |
|---|---|---|
| [[Home/Software Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability]] | Sustain 10,000 checkout RPS with p99 below 400 ms, errors below 0.1%, and cost below $0.002/request | Which resource saturates first, and how much capacity does one added unit buy? |
| Availability | 99.95% successful eligible checkout requests over 30 days | Which zone, region, dependency, or control-plane failures remain in the request path? |
| Reliability | No duplicate charges; committed ledger entries survive a zone loss; RPO 0 and RTO 15 minutes for payment writes | What correctness, durability, detection, and recovery evidence proves this? |
| Performance | p50/p95/p99 latency plus completed throughput and CPU, memory, I/O, and network per unit of work | Which stage consumes the latency and resource budget under the declared traffic mix? |

Targets conflict. Synchronous multi-region replication may improve durability and recovery while raising write latency and reducing partition-time availability. Caching may improve latency and origin efficiency while weakening freshness. State the business invariant that wins, then test the counter-cost.

# Map symptoms to mechanisms, then test the tradeoff

![[System Design 101/19e6e41c6f45bfaadff482d71bfe2d84a784c4a26c8354aca996d53a7b6bea86.png]]

Treat the visual as diagnostic prompts, not prescriptions:

| Symptom | Candidate mechanism | Condition that must hold | Counter-cost and proof |
|---|---|---|---|
| Read-heavy origin | [[Home/Data Persistence/Caching|Cache]], read replica, or index | Reads repeat, tolerate a freshness budget, or scan avoidable data | Invalidation/lag/write amplification; compare hit ratio, query plan, and p99 |
| High write load | Batch, partition, append log, or queue | Writes can be grouped, distributed by a stable key, or acknowledged asynchronously | Hot partitions, delayed visibility, replay; load-test the real key distribution |
| Single point of failure | Replication plus [[Home/Software Architecture/Distributed Systems/Failure Detection]] and tested failover | Replicas do not share the same failure domain | Coordination, lag, split brain; inject the failure and measure RTO/RPO |
| High request latency | Trace the critical path, then cache, index, colocate, or defer work | The measured slow stage matches the chosen mechanism | Staleness, coupling, or async complexity; compare end-to-end percentiles |
| Large immutable payloads | Object storage plus a claim-check reference | Consumers can fetch by durable ID and checksum | Extra fetch, authorization, lifecycle; test loss and expired credentials |
| Poor diagnosis | [[Home/DevOps/Observability|Correlated traces, metrics, and logs]] | Context propagates through sync and async boundaries | Telemetry cost/cardinality; reconstruct one failed request from evidence |

# Decision table for recurring system tradeoffs

Ask the same four questions for every choice: what is the workload, what fails, what consistency is required, and who operates the added machinery?

| Choice | Prefer first side when | Prefer second side when | Follow-up note |
|---|---|---|---|
| Scale up / scale out | Immediate headroom and one-node simplicity matter | Replica interchangeability and failure isolation justify distribution | [[Home/Software Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns]] |
| Synchronous / asynchronous | The caller needs the result inside its latency budget | Work can complete later and bursts need buffering | [[Home/Software Architecture/Distributed Systems/Message Queues/Message Queues|Message Queues]] |
| Strong / eventual consistency | A stale or conflicting result breaks an invariant | Temporary divergence has a repair rule and UX budget | [[Home/Software Architecture/Distributed Systems/Consistency Models]] and [[Home/Software Architecture/Distributed Systems/CAP theorem]] |
| Normalized / denormalized reads | Write integrity and flexible queries dominate | A known read shape needs predictable low latency | [[Home/Software Architecture/Patterns/Architectural Patterns/CQRS]] |
| Stateful / stateless service | Local state is intrinsic and partitioned deliberately | Any healthy replica should serve the next request | [[Home/Software Architecture/Distributed Systems/Load Balancing]] |
| Central orchestration / event choreography | Ordered workflow state and compensation must be explicit | Reactions are independent and ownership can stay distributed | [[Home/Software Architecture/System Architecture/Event-Driven Architecture|Event-Driven Architecture]] |

Do not select SQL versus key-value, REST versus GraphQL, or batch versus stream from a label alone. Start from access patterns, ordering/freshness, replay window, failure recovery, and the team's operating skills.

# Distributed identifier requirements and failure modes

Design IDs from the contract:

- **Collision domain:** unique within a table, tenant, region, or the whole system?
- **Ordering scope:** no order, rough creation order, or monotonic order per generator?
- **Clock behavior:** what happens when time moves backward or two nodes share a timestamp?
- **Bit budget:** how many years, nodes, and IDs per time unit fit before exhaustion?
- **Node allocation:** static worker IDs, leased IDs, coordination service, or random space?
- **Storage locality:** random IDs can fragment B-tree indexes; time-ordered IDs improve locality but create hot ranges.
- **Information leakage:** timestamps, node IDs, and sequence rates can reveal creation time or volume.
- **Recovery:** generator restarts must not reuse sequence state or an expired node lease.

A Snowflake-like 63-bit payload might allocate 41 bits to milliseconds, 10 to a worker ID, and 12 to a per-millisecond sequence: about 69 years from a custom epoch, 1,024 workers, and 4,096 IDs/ms/worker. Those numbers are a contract, not defaults. Clock rollback must block, switch to a safe logical time, or fail closed; silently reusing a prior timestamp and sequence can collide.

Use [[Home/Software Architecture/Distributed Systems/Unique ID Generation]] for the full decision. UUIDv4 buys coordination-free randomness; UUIDv7 adds time ordering with a standardized 128-bit layout; database sequences buy compact monotonic IDs inside one coordination domain. None should be judged by whether it is "numeric" or whether creation order can always be reconstructed from the identifier.

# Pattern Map

![[System Design 101/205a022f29aa3226f1bcb69e5a6fa2172b203ab51cbc6ce34be66a3e541646d0.png]]

The visual mixes patterns from different layers. Use this linked map to keep the problem and cost visible:

| Group | Pattern note | Problem solved | Cost introduced |
|---|---|---|---|
| Communication | [[Home/Software Architecture/Distributed Systems/API Gateway]] | Stable policy and routing boundary for many APIs | Central latency, configuration, and blast radius |
| Communication | [[Home/Software Architecture/Distributed Systems/Webhooks]] | Push events across organizational boundaries | Signature, retry, replay, and reconciliation contract |
| Resilience | [[Home/Software Architecture/Patterns/Resilience Patterns/Circuit Breaker]] | Stop repeated calls to a failing dependency | Threshold tuning and open-state degraded behavior |
| Resilience | [[Home/Software Architecture/Distributed Systems/High Availability]] and [[Home/Software Architecture/Distributed Systems/Failure Detection]] | Maintain service through component failure | Redundancy, detection delay, failover ambiguity |
| Data modeling | [[Home/Software Architecture/Patterns/Architectural Patterns/CQRS]] and [[Home/Software Architecture/Patterns/Architectural Patterns/Event Sourcing]] | Separate read/write models or retain authoritative event history | Projection lag, schema evolution, replay operations |
| Coordination | [[Home/Software Architecture/Distributed Systems/Distributed Locks]] | Serialize one lease-scoped critical action | Fencing, expiry, quorum availability, deadlock risk |
| Messaging | [[Home/Software Architecture/Distributed Systems/Message Queues/Message Queues|Message Queues]] and [[Home/Software Architecture/Distributed Systems/Idempotency]] | Buffer, fan out, and safely retry work | Duplicates, ordering scope, backlog, DLQ ownership |
| Partitioning | [[Home/Software Architecture/Distributed Systems/Consistent Hashing]] | Limit key remapping as nodes change | Virtual-node tuning, hotspots, membership changes |

Patterns compose but are not substitutes. A leader election can choose one coordinator; a circuit breaker protects calls to it; pub/sub distributes its events; sharding partitions data. Each operates at a different boundary and needs its own failure test.

# References

- [Distributed computing (Wikipedia)](https://en.wikipedia.org/wiki/Distributed_computing) — overview of distributed-computing definitions, history, and problem classes.
- [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) — primary operational guidance for measurable indicators, targets, and evaluation windows.
- [UUIDs (RFC 9562)](https://www.rfc-editor.org/rfc/rfc9562.html) — current IETF UUID layouts and requirements, including time-ordered UUID version 7.
- [Azure Architecture Center design patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/) — official catalog for distributed communication, resilience, data, and coordination patterns with consequences.

## ByteByteGo provenance

- [Fantastic four of system design](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/who-are-the-fantastic-four-of-system-design.md) — provenance for the four-attribute mnemonic, converted into measurable targets.
- [Common system-design problems and solutions](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/8-common-system-design-problems-and-solutions.md) — provenance for the symptom map, qualified with conditions and counter-costs.
- [System-design tradeoffs](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/10-system-design-tradeoffs-you-cannot-ignore.md) — editorial lead for the decision table; its false CAP/CA visual was rejected.
- [Unique ID generator](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/unique-id-generator.md) — provenance for identifier requirements; its inaccurate UUID and Redis allocation visual was rejected.
- [Distributed-system patterns](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-7-most-used-distributed-system-patterns.md) — provenance for the pattern inventory, regrouped by layer and linked to detailed notes.
