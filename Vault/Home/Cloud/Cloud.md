---
icon: cloud
order: 90
color: "#3b82f6"
topic:
  - Cloud
subtopic: []
summary: "Renting managed compute, storage, and networking with pay as you go economics."
tags:
  - FolderNote
publish: true
status: Done
priority: High
level:
  - "2"
---

Cloud computing is renting capabilities (compute, storage, networking) with managed building blocks and pay-as-you-go economics. The engineering work is choosing the right abstraction level and designing for failure, cost, and scale. Example: using a managed database can eliminate ops toil, but you must understand limits, backups, and recovery.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Cross-Provider Comparison

The three major providers expose analogous capability categories under different names. The products are not equivalent: APIs, consistency, regional topology, failure modes, quotas, and prices differ. Use the table to translate a requirement into candidates, then follow the provider hub and current documentation for the actual contract.

| Capability | AWS | Azure | Google Cloud |
|------------|-----|-------|--------------|
| Virtual machines | EC2 | Azure VMs | Compute Engine |
| Serverless compute | Lambda | Azure Functions | Cloud Run functions |
| Object storage | S3 | Blob Storage | Cloud Storage |
| NoSQL document DB | DynamoDB | Cosmos DB | Firestore |
| Message queue | SQS | Service Bus / Storage Queues | Cloud Pub/Sub |
| Data warehouse | Redshift | Synapse | BigQuery |
| Cross-region relational DB | Aurora Global | Azure SQL Database (geo-replication) | Cloud Spanner |
| Managed ML platform | Amazon SageMaker AI | Azure ML | Vertex AI |
| LLM API | Bedrock | Azure OpenAI | Vertex AI Gemini |

These map capabilities, not guarantees. Spanner commits writes through synchronous Paxos quorum replication within the selected instance configuration; replication crosses regions only for dual-region and multi-region configurations. Aurora Global and Azure geo-replication instead use asynchronous primary + replica designs.

# Data Pipeline Capability Map

A data pipeline is easier to reason about as stages than as a provider catalog. Pick a service only after fixing the stage's contract: delivery semantics, replay window, schema evolution, latency, data volume, query shape, and ownership.

| Stage | AWS examples | Azure examples | Google Cloud examples | Question that decides |
| --- | --- | --- | --- | --- |
| Ingest | Kinesis Data Streams, Amazon MSK, DMS | Event Hubs, Data Factory | Pub/Sub, Datastream | Is the source a replayable stream, database change log, or scheduled batch? |
| Land | S3 | Data Lake Storage Gen2 / OneLake | Cloud Storage | Which format, partition key, retention rule, and encryption boundary make raw data reproducible? |
| Process | Glue, EMR, Managed Service for Apache Flink | Databricks, Fabric, Stream Analytics | Dataflow, Dataproc | Is processing batch or streaming, stateful or stateless, and who operates the runtime? |
| Serve | Redshift, Athena, OpenSearch Service | Fabric Warehouse/Lakehouse, Data Explorer, Azure AI Search | BigQuery, Bigtable, BigQuery search | Is the consumer doing OLAP, low-latency key lookup, time-series analysis, or full-text/vector search? |
| Present | QuickSight | Power BI | Looker / Looker Studio | Does the consumer need governed semantic models, embedded analytics, or exploratory dashboards? |

This is a capability map, not a claim of service equivalence. Cosmos DB, for example, is an operational distributed database rather than Azure's data-warehouse stage. The original source visual is therefore not embedded.

# Managed Database Capability Map

Choose the data model and access pattern before the provider product. A managed label removes some operational work; it does not make consistency, indexing, partitioning, backup, or portability decisions disappear.

| Workload | AWS examples | Azure examples | Google Cloud examples | Portability boundary |
| --- | --- | --- | --- | --- |
| Relational OLTP | RDS, Aurora | Azure SQL, Azure Database for PostgreSQL/MySQL | Cloud SQL, AlloyDB | Engine-compatible services still differ in extensions, replication, failover, and control-plane APIs |
| Document | DocumentDB, DynamoDB document items | Cosmos DB for NoSQL, Azure DocumentDB | Firestore | Query language, transactions, partitioning, and consistency APIs are provider-specific |
| Key-value | DynamoDB | Cosmos DB, Azure Managed Redis | Bigtable, Memorystore | Data model alone does not establish durability or multi-key transaction behavior |
| Wide-column | Keyspaces | Managed Instance for Apache Cassandra | Bigtable | Cassandra API compatibility does not imply identical topology or operations |
| Graph | Neptune | Cosmos DB for Apache Gremlin | Spanner Graph | Query languages and graph semantics differ |
| Time-series | Timestream for InfluxDB; Timestream for LiveAnalytics for existing customers only | Azure Data Explorer | Bigtable / BigQuery patterns | Retention, downsampling, ingestion rate, and query engine drive the choice |
| Warehouse | Redshift | Fabric Warehouse / Synapse dedicated SQL pools | BigQuery | Storage layout, workload management, governance, and pricing are not portable |
| Cache | ElastiCache, MemoryDB | Azure Managed Redis | Memorystore | Decide whether cache loss is acceptable before choosing persistence or replication options |

The rejected source visual aligned managed products with open-source engines as if their APIs and guarantees were interchangeable. Validate the exact region, feature, consistency, and recovery contract in provider documentation.

Timestream for LiveAnalytics closed to new AWS customers on June 20, 2025. New workloads should evaluate Timestream for InfluxDB or a different time-series path against their query language, retention, scale, and operating requirements rather than treating LiveAnalytics as generally adoptable.

# Cloud Cost Loop

![[System Design 101/877ac6b7b01095b5d70802541b9e3bb154989931a8508a233e0fab3e428ce309.png]]

Run cost work in dependency order: allocate and measure, eliminate idle resources, right-size from utilization and reliability data, schedule variable demand, then commit only the stable baseline. Buying a reservation before removing waste discounts the wrong architecture. [[Home/Cloud/Cloud Cost Management|Cloud Cost Management]] develops the loop into allocation rules, anomaly handling, and unit economics.

# Cloud-Native Anti-Patterns

![[System Design 101/9804d3f9208a05336ae9de0fa80da20fee41ad45e9c7236d182a8f57f1d5510d.png]]

> [!WARNING] Non-normative source visual
> The labels are prompts to inspect operational coupling, not universal anti-patterns. A modular monolith or stateful component can be the simpler correct design when its ownership, lifecycle, and failure boundary are explicit.

Cloud abstractions move complexity; they do not remove it. A small system split into many services replaces local calls with fallible network calls and distributed ownership. A managed service per feature adds another IAM model, meter, quota, failure mode, and portability boundary. Treating every process as stateless merely moves durable state into databases, queues, object stores, and idempotency protocols. Keep a modular monolith, shared database, or explicit colocated state while one ownership and failure boundary remains the simpler correct design; split only when independent scale, release, security, or recovery requirements justify the distributed work.

# Questions

> [!QUESTION]- How do you choose a compute abstraction — VMs, containers, or serverless?
> - Serverless functions minimize ops for spiky, event-driven work; billing usually combines request count with execution duration and allocated resources, while cold starts, duration limits, and runtime constraints reduce control
> - Containers fit custom runtimes and long-lived services, but the operating cost depends on the platform: a managed serverless container service can own orchestration and scale-to-zero mechanics, while managed Kubernetes still leaves cluster policy, upgrades, capacity, and workload operations to the platform team
> - VMs are the escape hatch for legacy workloads, specialized OS/kernel needs, or lift-and-shift: most control, most ops
> - Decide by workload shape, runtime limits, scaling model, and which layer the team is prepared to operate; the container image alone does not imply Kubernetes or VM-level operations

# References

- [NIST definition of cloud computing (SP 800-145)](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-145.pdf) — the standard vendor-neutral definition of cloud service and deployment models.
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/) — the reliability, cost, security, and operational-excellence pillars of cloud design (broadly applicable beyond AWS).
- [Azure Architecture Center — Cloud design patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/) — a catalog of provider-neutral cloud patterns (retry, circuit breaker, sharding, and more).
- [AWS Prescriptive Guidance — Modern data architecture](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-aws-data/aws-architecture.html) — current AWS stages and representative ingestion, storage, processing, search, and warehouse services.
- [AWS — Timestream for LiveAnalytics availability change](https://docs.aws.amazon.com/timestream/latest/developerguide/AmazonTimestreamForLiveAnalytics-availability-change.html) — documents the June 20, 2025 new-customer closure and the recommended evaluation of Timestream for InfluxDB.
- [Azure Architecture Center — Technology choices](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/technology-choices-overview) — current capability-first decision guides for compute, data, messaging, analytics, networking, and integration.
- [Google Cloud — Data lifecycle](https://cloud.google.com/architecture/data-lifecycle-cloud-platform) — provider guidance for ingesting, storing, processing, analyzing, and presenting data.
- [Google Cloud — Cloud Run functions](https://cloud.google.com/functions/docs/concepts/overview) — current product documentation for Google Cloud's function deployment surface.
- [Google Cloud — Spanner replication](https://cloud.google.com/spanner/docs/replication) — documents synchronous Paxos quorum commits and the regional, dual-region, and multi-region replica topologies.
- [AWS — What is Amazon SageMaker AI?](https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html) — documents the December 2024 rename from Amazon SageMaker to Amazon SageMaker AI.
- [System Design 101 — Big Data Pipeline Cheatsheet](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/big-data-pipeline-cheatsheet-for-aws-azure-and-google-cloud.md) — editorial stage model; its stale and incorrect provider mappings were rebuilt rather than embedded.
- [System Design 101 — Cloud Database Cheat Sheet](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/cloud-database-cheat-sheet.md) — editorial prompt for a capability map; its provider equivalences were not treated as guarantees.
- [System Design 101 — Cloud Cost Reduction Techniques](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/cloud-cost-reduction-techniques.md) — visual checklist reorganized here into a measurable optimization loop.
- [System Design 101 — Cloud Native Anti-Patterns](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/cloud-native-anti-patterns.md) — visual inventory used to connect each smell to its actual complexity cost.
