---
topic:
  - Cloud
subtopic:
  - Azure
summary: "Microsoft's public cloud, a natural home for .NET and AI workloads."
level:
  - "3"
priority: Medium
status: Creation
tags:
  - FolderNote
publish: true
---

# Intro

Azure is Microsoft's public cloud platform. For .NET and AI engineers, Azure is the natural home for workloads that integrate with Microsoft identity, Active Directory, and the Microsoft AI ecosystem. This page covers the Azure services most relevant to .NET/AI development.

```bash
# List subscriptions
az account list -o table
# Set active subscription
az account set --subscription "My Subscription"
```

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Compute

### Azure Functions
Serverless compute for event-driven code. Triggers: HTTP, Timer, Queue, Blob, Event Hub, Service Bus. Scales to zero; you pay per execution.

**When to reach for it**: Short-lived, stateless tasks triggered by events. Background processing, webhooks, scheduled jobs. Avoid for long-running (>10 min) or stateful workflows — use Durable Functions or Azure Container Apps instead.

```bash
func init MyFuncApp --dotnet && cd MyFuncApp
func new --name Hello --template "HTTP trigger" --authlevel Anonymous
func start  # local dev
```

## Storage

### Azure Storage
Family of storage services: **Blobs** (object storage, like S3), **Files** (SMB/NFS shares), **Queues** (simple messaging), **Tables** (key-value NoSQL).

**When to reach for it**: Blob storage for any unstructured data (images, documents, ML datasets, backups). Files for lift-and-shift of on-prem file shares. Queues for simple decoupling without Service Bus overhead.

```bash
az storage account create --name mystorageacct --resource-group my-rg --sku Standard_LRS
az storage blob upload --account-name mystorageacct --container-name mycontainer --file ./data.csv --name data.csv
```

### Azure Cosmos DB
Globally distributed, multi-model database. APIs: NoSQL (document), MongoDB, Cassandra, Gremlin (graph), Table. Single-digit millisecond reads/writes. Multi-region active-active replication.

**When to reach for it**: Global apps needing low-latency reads/writes across regions. Flexible schema (document model). Avoid for complex relational queries — use Azure SQL instead. Cost scales with RU/s provisioning.

```bash
az cosmosdb create --name my-cosmos --resource-group my-rg --default-consistency-level Session
```

## AI & ML

### Azure OpenAI
Azure-hosted OpenAI models (GPT-4o, GPT-4, embeddings, DALL-E) with enterprise controls: RBAC, private networking, content filtering, quota management. Same API as OpenAI but with Azure identity and compliance.

**When to reach for it**: Any .NET app calling GPT models in production. Use Azure OpenAI over direct OpenAI API when you need: private networking (no public internet), Azure AD auth, compliance (SOC 2, HIPAA), or regional data residency.

### Azure AI Foundry
The unified platform for building, evaluating, and operating generative AI applications. Provides: model deployments/endpoints, built-in evaluators, tracing/observability, and guardrails (content filtering, prompt shields, groundedness detection).

**When to reach for it**: Building RAG pipelines, agent systems, or any AI app that needs evaluation and safety controls. Replaces the older Azure AI Studio.

### Azure Machine Learning
MLOps platform for training, tracking, evaluating, registering, and deploying ML models. Core concepts: Workspace (system of record), Compute (clusters/instances), Jobs (reproducible training runs), Model Registry (versioned promotion), Online Endpoints (real-time inference).

**When to reach for it**: Training custom ML models at scale, managing model lifecycle (train → evaluate → register → deploy → monitor), or running batch inference pipelines.

### Azure AI Content Safety
Content filtering and safety controls for AI applications. Features: prompt shields (prompt injection defense), groundedness detection (RAG hallucination detection), PII detection, content classification.

**When to reach for it**: Any production AI app that processes user input or generates user-facing content. Implement as a layer in your AI pipeline, not as an afterthought.

### Azure AI Data Labeling
Managed labeling workflows within Azure Machine Learning. Supports image classification, object detection, text classification, and NER labeling tasks. Integrates with Azure ML model registry for training data lineage.

**When to reach for it**: When you need to produce labeled training or evaluation data at scale with audit trails and quality controls.

### Azure AI Evaluation and Observability
Built-in evaluation runs and tracing in Azure AI Foundry. Evaluators: groundedness, relevance, coherence, fluency, safety. Tracing: OpenTelemetry-compatible traces for every LLM call.

**When to reach for it**: Before deploying any AI feature to production (offline evaluation), and continuously in production (online monitoring for drift and safety regressions).

## References

- [Azure documentation](https://learn.microsoft.com/en-us/azure/) — Microsoft's official Azure docs hub; starting point for any Azure service
- [Azure SDK for .NET](https://learn.microsoft.com/en-us/dotnet/azure/) — .NET integration guide for Azure services; covers authentication, SDK packages, and samples
- [Azure AI Foundry docs](https://learn.microsoft.com/en-us/azure/ai-foundry/) — Azure's unified AI development platform; covers model deployments, evaluation, and guardrails
