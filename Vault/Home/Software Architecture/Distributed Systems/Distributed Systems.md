---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Core distributed-systems concepts for production: consistency tradeoffs, messaging, coordination, and failure handling under an unreliable network."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Creation
---

Distributed systems are hard because the network is unreliable and time is messy: partial failures, latency, and inconsistent views of the world. The recurring production problems are consistency tradeoffs, messaging, coordination, and failure handling. CAP, for example, is not a slogan. It explains why a partition forces a system to choose between availability and strong consistency.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Quality Attributes and Measurable Targets

![[Software Architecture/Software Architecture-Distributed Systems-18120000-2.png]]

The four labels are an orientation mnemonic, not independent boxes. Logging does not create reliability, and load balancing alone does not create availability. Turn each attribute into a workload, target, failure model, and measurement window:

| Attribute | Concrete target | Mechanism question |
|---|---|---|
| [[Home/Software Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability]] | Sustain 10,000 checkout RPS with p99 below 400 ms, errors below 0.1%, and cost below $0.002/request | Which resource saturates first, and how much capacity does one added unit buy? |
| Availability | 99.95% successful eligible checkout requests over 30 days | Which zone, region, dependency, or control-plane failures remain in the request path? |
| Reliability | No duplicate charges. Committed ledger entries survive a zone loss. RPO 0 and RTO 15 minutes for payment writes | What correctness, durability, detection, and recovery evidence proves this? |
| Performance | p50/p95/p99 latency plus completed throughput and CPU, memory, I/O, and network per unit of work | Which stage consumes the latency and resource budget under the declared traffic mix? |

Targets conflict. Synchronous multi-region replication may improve durability and recovery while raising write latency and reducing partition-time availability. Caching may improve latency and origin efficiency while weakening freshness. State the business invariant that wins, then test the counter-cost.

# Map Symptoms to Mechanisms, then Test the Tradeoff

![[Software Architecture/Software Architecture-Distributed Systems-18120000.png]]

Treat the visual as diagnostic prompts, not prescriptions:

| Symptom | Candidate mechanism                                                 | Condition that must hold | Counter-cost and proof |
|---|---|---|---|
| Read-heavy origin | [[Home/Data Persistence/Caching                                     |Cache]], read replica, or index | Reads repeat, tolerate a freshness budget, or scan avoidable data | Invalidation/lag/write amplification. Compare hit ratio, query plan, and p99 |
| High write load | Batch, partition, append log, or queue                              | Writes can be grouped, distributed by a stable key, or acknowledged asynchronously | Hot partitions, delayed visibility, replay. Load-test the real key distribution |
| Single point of failure | Replication plus failure detection and tested failover              | Replicas do not share the same failure domain | Coordination, lag, split brain. Inject the failure and measure RTO/RPO |
| High request latency | Trace the critical path, then cache, index, colocate, or defer work | The measured slow stage matches the chosen mechanism | Staleness, coupling, or async complexity. Compare end-to-end percentiles |
| Large immutable payloads | Object storage plus a claim-check reference                         | Consumers can fetch by durable ID and checksum | Extra fetch, authorization, lifecycle. Test loss and expired credentials |
| Poor diagnosis | [[Home/DevOps/Observability                                         |Correlated traces, metrics, and logs]] | Context propagates through sync and async boundaries | Telemetry cost/cardinality. Reconstruct one failed request from evidence |

# Decision Table for Recurring System Tradeoffs

Ask the same four questions for every choice: what is the workload, what fails, what consistency is required, and who operates the added machinery?

| Choice | Prefer first side when | Prefer second side when | Follow-up note |
|---|---|---|---|
| Scale up / scale out | Immediate headroom and one-node simplicity matter | Replica interchangeability and failure isolation justify distribution | [[Home/Software Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns]] |
| Synchronous / asynchronous | The caller needs the result inside its latency budget | Work can complete later and bursts need buffering | [[Home/Software Architecture/Distributed Systems/Message Queues/Message Queues|Message Queues]] |
| Strong / eventual consistency | A stale or conflicting result breaks an invariant | Temporary divergence has a repair rule and UX budget | Consistency Models and [[Home/Software Architecture/Distributed Systems/CAP theorem]] |
| Normalized / denormalized reads | Write integrity and flexible queries dominate | A known read shape needs predictable low latency | [[Home/Software Architecture/Patterns/Architectural Patterns/CQRS]] |
| Stateful / stateless service | Local state is intrinsic and partitioned deliberately | Any healthy replica should serve the next request | [[Home/Software Architecture/Distributed Systems/Load Balancing]] |
| [[Home/Software Architecture/Distributed Systems/Orchestration|Orchestration]] / [[Home/Software Architecture/Distributed Systems/Choreography|choreography]] | Ordered workflow state and compensation must be explicit | Reactions are independent and ownership can stay distributed | Compare the two coordination authorities |

Do not select SQL versus key-value, REST versus GraphQL, or batch versus stream from a label alone. Start from access patterns, ordering/freshness, replay window, failure recovery, and the team's operating skills.

# Distributed Identifier Requirements and Failure Modes

Design IDs from the contract:

- **Collision domain:** unique within a table, tenant, region, or the whole system?
- **Ordering scope:** no order, rough creation order, or monotonic order per generator?
- **Clock behavior:** what happens when time moves backward or two nodes share a timestamp?
- **Bit budget:** how many years, nodes, and IDs per time unit fit before exhaustion?
- **Node allocation:** static worker IDs, leased IDs, coordination service, or random space?
- **Storage locality:** random IDs can fragment B-tree indexes. Time-ordered IDs improve locality but create hot ranges.
- **Information leakage:** timestamps, node IDs, and sequence rates can reveal creation time or volume.
- **Recovery:** generator restarts must not reuse sequence state or an expired node lease.

A Snowflake-like 63-bit payload might allocate 41 bits to milliseconds, 10 to a worker ID, and 12 to a per-millisecond sequence: about 69 years from a custom epoch, 1,024 workers, and 4,096 IDs/ms/worker. Those numbers are a contract, not defaults. Clock rollback must block, switch to a safe logical time, or fail closed. Silently reusing a prior timestamp and sequence can collide.

Use [[Home/Software Architecture/Distributed Systems/Unique ID Generation]] for the full decision. UUIDv4 buys coordination-free randomness. UUIDv7 adds time ordering with a standardized 128-bit layout. Database sequences buy compact monotonic IDs inside one coordination domain. None should be judged by whether it is "numeric" or whether creation order can always be reconstructed from the identifier.

# Pattern Map

![[Software Architecture/Software Architecture-Distributed Systems-18120000-1.png]]

The visual mixes patterns from different layers. Use this linked map to keep the problem and cost visible:

| Group | Pattern note | Problem solved | Cost introduced |
|---|---|---|---|
| Communication | [[Home/Software Architecture/Distributed Systems/API Gateway]] | Stable policy and routing boundary for many APIs | Central latency, configuration, and blast radius |
| Communication | [[Home/Software Architecture/Distributed Systems/Webhooks]] | Push events across organizational boundaries | Signature, retry, replay, and reconciliation contract |
| Resilience | [[Home/Software Architecture/Patterns/Resilience Patterns/Circuit Breaker]] | Stop repeated calls to a failing dependency | Threshold tuning and open-state degraded behavior |
| Resilience | [[Home/Software Architecture/Distributed Systems/High Availability]] and Failure Detection | Maintain service through component failure | Redundancy, detection delay, failover ambiguity |
| Data modeling | [[Home/Software Architecture/Patterns/Architectural Patterns/CQRS]] and [[Home/Software Architecture/Patterns/Architectural Patterns/Event Sourcing]] | Separate read/write models or retain authoritative event history | Projection lag, schema evolution, replay operations |
| Coordination | [[Home/Software Architecture/Distributed Systems/Distributed Locks]] | Serialize one lease-scoped critical action | Fencing, expiry, quorum availability, deadlock risk |
| Messaging | [[Home/Software Architecture/Distributed Systems/Message Queues/Message Queues|Message Queues]] and [[Home/Software Architecture/Distributed Systems/Idempotency]] | Buffer, fan out, and safely retry work | Duplicates, ordering scope, backlog, DLQ ownership |
| Partitioning | Consistent Hashing | Limit key remapping as nodes change | Virtual-node tuning, hotspots, membership changes |

Patterns compose but are not substitutes. A leader election can choose one coordinator. A circuit breaker protects calls to it. Pub/sub distributes its events. Sharding partitions data. Each operates at a different boundary and needs its own failure test.

# References

- [Google SRE service-level objectives](https://sre.google/sre-book/service-level-objectives/)
