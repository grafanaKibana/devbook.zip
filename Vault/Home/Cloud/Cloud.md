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

# Intro

Cloud computing is renting capabilities (compute, storage, networking) with managed building blocks and pay-as-you-go economics. The engineering work is choosing the right abstraction level and designing for failure, cost, and scale. Example: using a managed database can eliminate ops toil, but you must understand limits, backups, and recovery.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Cross-Provider Comparison

The three major providers offer equivalent building blocks under different names. This table maps a capability across AWS, Azure, and Google Cloud so you can translate between them.

| Capability | AWS | Azure | Google Cloud |
|------------|-----|-------|--------------|
| Virtual machines | EC2 | Azure VMs | Compute Engine |
| Serverless compute | Lambda | Azure Functions | Cloud Functions |
| Object storage | S3 | Blob Storage | Cloud Storage |
| NoSQL document DB | DynamoDB | Cosmos DB | Firestore |
| Message queue | SQS | Service Bus / Storage Queues | Cloud Pub/Sub |
| Data warehouse | Redshift | Synapse | BigQuery |
| Cross-region relational DB | Aurora Global | Azure SQL Database (geo-replication) | Cloud Spanner |
| Managed ML platform | SageMaker | Azure ML | Vertex AI |
| LLM API | Bedrock | Azure OpenAI | Vertex AI Gemini |

These map capabilities, not guarantees: Cloud Spanner is synchronously global, whereas Aurora Global and Azure geo-replication are asynchronous primary + read-replica designs.

## Questions

> [!QUESTION]- How do you choose a compute abstraction — VMs, containers, or serverless?
> - Serverless (functions) minimizes ops for spiky, event-driven, short-lived work; you pay per invocation and give up control over runtime and cold-start latency
> - Containers (managed Kubernetes or container services) fit long-running services that need portability and fine-grained resource control, at the cost of running the orchestration
> - VMs are the escape hatch for legacy workloads, specialized OS/kernel needs, or lift-and-shift: most control, most ops
> - Decide by workload shape (spiky vs steady), operational appetite, and whether container portability is worth more than serverless's low-ops

## References

- [NIST definition of cloud computing (SP 800-145)](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-145.pdf) — the standard vendor-neutral definition of cloud service and deployment models.
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/) — the reliability, cost, security, and operational-excellence pillars of cloud design (broadly applicable beyond AWS).
- [Azure Architecture Center — Cloud design patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/) — a catalog of provider-neutral cloud patterns (retry, circuit breaker, sharding, and more).
