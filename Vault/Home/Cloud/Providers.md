---
topic:
  - Cloud
subtopic: []
summary: "A developer-oriented introduction to AWS, Azure, and Google Cloud and the constraints that should choose between them."
level:
  - "2"
priority: Medium
status: Creation
publish: true
---

AWS, Microsoft Azure, and Google Cloud expose the same broad capability families: compute, storage, databases, messaging, identity, networking, observability, analytics, and AI. They are not interchangeable implementations. Each provider has different APIs, identity conventions, regions, quotas, pricing meters, consistency guarantees, and failure behavior.

# Quick Orientation

| Provider | Developer entry point | Architecture guidance | .NET integration |
| --- | --- | --- | --- |
| AWS | Service APIs grouped across compute, storage, data, integration, and AI | AWS Well-Architected Framework and service decision guides | AWS SDK for .NET packages and the AWS credential provider chain |
| Microsoft Azure | Services integrated with Microsoft Entra identity and the wider Microsoft platform | Azure Architecture Center and Azure Well-Architected Framework | Azure SDK for .NET packages, `DefaultAzureCredential`, and managed identities |
| Google Cloud | Managed compute, data, container, analytics, and AI services | Google Cloud Well-Architected Framework | Google Cloud .NET client libraries and Application Default Credentials |

A familiar ecosystem is useful, but it is not sufficient. The exact managed-service contract still needs to fit the workload.

# Representative Capability Map

| Capability | AWS | Azure | Google Cloud |
| --- | --- | --- | --- |
| Managed web or container application | App Runner, ECS with Fargate | App Service, Container Apps | Cloud Run |
| Event-driven functions | Lambda | Functions | Cloud Run functions |
| Object storage | S3 | Blob Storage | Cloud Storage |
| Managed relational database | RDS, Aurora | Azure SQL, Azure Database for PostgreSQL | Cloud SQL, AlloyDB |
| Managed messaging | SQS, SNS, EventBridge | Service Bus, Event Grid, Event Hubs | Pub/Sub |
| Foundation-model platform | Bedrock | Azure OpenAI, Microsoft Foundry | Vertex AI |

The table translates categories, not guarantees. A queue is not defined only by being a queue: delivery, ordering, replay, transaction, and dead-letter behavior decide whether it fits. The same caution applies to databases, functions, identity, and AI services.

# How to Choose

1. **Honor fixed constraints first.** Organization identity, compliance, data residency, procurement, and existing network boundaries can remove options before technical comparison begins.
2. **Compare the critical managed services.** Select by the transaction, consistency, scaling, integration, and recovery contracts the application actually needs.
3. **Include developer workflow.** SDK quality, local debugging, authentication, deployment feedback, observability, and team experience affect delivery and incident diagnosis.
4. **Model the complete cost.** Include steady capacity, requests, data retention, transfer, observability, support, and the recovery posture required by the system.
5. **Name provider dependencies.** Identity, database semantics, messaging behavior, and control-plane configuration usually create more lock-in than the application executable.

Do not build a lowest-common-denominator cloud abstraction without a real multi-provider requirement. Keep business logic independent of provider SDKs where a normal application boundary already exists, but let infrastructure adapters use the selected provider directly. Add another provider only when an explicit availability, regulatory, acquisition, or migration requirement justifies the extra system.

# References

- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/)
- [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework)
