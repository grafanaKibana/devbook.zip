---
publish: true
created: 2026-07-11T21:40:45.828Z
modified: 2026-07-18T11:59:15.653Z
published: 2026-07-18T11:59:15.653Z
tags:
  - FolderNote
topic:
  - Cloud
subtopic:
  - Azure
summary: Azure capability map for .NET, data, integration, and AI workloads.
level:
  - "3"
priority: Medium
status: Creation
---

Azure is Microsoft's public cloud platform. A .NET workload can use the Azure SDK, `DefaultAzureCredential`, and Microsoft Entra workload identities to call managed services without storing long-lived credentials. Those integrations can reduce identity and operations work when the organization already uses Azure, but they do not make Azure the automatic choice; region, service contract, portability, compliance, and total operating cost still decide.

```bash
# List subscriptions
az account list -o table
# Set active subscription
az account set --subscription "My Subscription"
```

<nav style="--card-accent: 59, 130, 246;" class="folder-structure-map" aria-label="Azure section map"><div class="folder-map-children"><article class="db-card folder-map-node folder-map-node-empty"><div class="db-card-body"><span class="folder-map-empty-text">No notes in this section yet.</span></div></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Choose Services by Capability

Start with the workload contract, not the product list. Decide how much runtime control the team needs, whether data is operational or analytical, the delivery semantics between components, regional availability, private-network requirements, and how much provider-specific API surface is acceptable.

| Capability | Representative services | Decision question |
| --- | --- | --- |
| Compute | Virtual Machines, App Service, Container Apps, AKS, Functions | Do you need OS control, a managed web platform, container orchestration, Kubernetes APIs, or event-bound functions? |
| Storage | Blob Storage, Azure Files, Managed Disks | Is the data an object, a shared file, or a block device, and what redundancy/latency tier applies? |
| Relational data | Azure SQL, Azure Database for PostgreSQL/MySQL | Which engine semantics, compatibility, high-availability, and administrative controls are required? |
| Purpose-built data | Cosmos DB, Azure DocumentDB, Managed Instance for Apache Cassandra, Azure Managed Redis, Data Explorer | What data model, consistency, partitioning, query, and retention contract drives the workload? |
| Messages and events | Service Bus, Event Grid, Event Hubs, Storage Queues | Is the boundary a command queue, discrete event notification, telemetry stream, or simple storage-backed queue? |
| Integration | Logic Apps, Functions, Data Factory, API Management | Is the flow designer-led orchestration, code, data movement, or an API governance boundary? |
| Analytics | Fabric, Databricks, Data Explorer, Stream Analytics, Power BI | Is the stage ingestion, transformation, real-time analytics, governed warehouse/lakehouse, or presentation? |
| Networking | Virtual Network, Load Balancer, Application Gateway, Front Door, Private Link, VPN Gateway, ExpressRoute | Is traffic regional or global, public or private, layer 4 or layer 7, and hybrid or cloud-only? |

Use this page to translate capability needs into Azure product names. Provider-neutral mechanisms live in [[Data Persistence/Object Storage|Object Storage]], [[Data Persistence/NoSQL/NoSQL|NoSQL]], [[Networks/Networks|Networks]], [[Software Architecture/Distributed Systems/Message Queues/Message Queues|Message Queues]], [[Software Architecture/System Architecture/Event-Driven Architecture|Event-Driven Architecture]], and [[DevOps/Kubernetes|Kubernetes]]. Azure documentation owns current hosting plans, regional availability, quotas, pricing, and retirement state.

![[Assets/Cloud/Cloud-Azure-18120000.png]]

The visual is an orientation aid. Product names, retirement state, regional availability, quotas, and feature contracts must be checked against current Microsoft documentation. Portability is also a per-capability decision: container images can move more easily than Cosmos DB consistency or Service Bus settlement semantics.

# Compute

## Azure Functions

Azure Functions hosts event-driven code for HTTP, timer, queue, blob, Event Hubs, and Service Bus triggers. Scaling, idle capacity, billing, networking, and timeout depend on the hosting plan: Flex Consumption, Premium, Dedicated, legacy Consumption, and Container Apps are not interchangeable. Use asynchronous handoff or Durable Functions for long-running workflows rather than holding an HTTP request open, and make handlers safe for the trigger's retry and duplicate-delivery behavior.

```bash
func init MyFuncApp --dotnet && cd MyFuncApp
func new --name Hello --template "HTTP trigger" --authlevel Anonymous
func start  # local dev
```

# Storage

## Azure Storage

Azure Storage is a family of distinct contracts: Blob Storage for objects, Azure Files for SMB/NFS shares, Queue Storage for simple queues, and Table Storage for key-value data. Choose by access semantics rather than treating the account as one generic store. [[Data Persistence/Object Storage|Object Storage]] owns the object-key, multipart, lifecycle, and publication boundaries.

```bash
az storage account create --name mystorageacct --resource-group my-rg --sku Standard_LRS
az storage blob upload --account-name mystorageacct --container-name mycontainer --file ./data.csv --name data.csv
```

## Azure Cosmos DB

Azure Cosmos DB is a distributed database family with several APIs and configurable consistency and multi-region write behavior. Reach for it only after fixing partition keys, query patterns, consistency, transactional scope, indexing, and request-unit cost. API compatibility does not make the service operationally identical to MongoDB, Cassandra, Gremlin, or another provider's document database.

```bash
az cosmosdb create --name my-cosmos --resource-group my-rg --default-consistency-level Session
```

# AI & ML

## Azure OpenAI

Azure-hosted OpenAI models with enterprise controls such as RBAC, private networking, content filtering, and quota management. The v1 surface supports OpenAI clients with small code changes, but it is not endpoint-transparent: Azure uses an Azure resource endpoint, supports Azure-specific key or Microsoft Entra authentication, and requires the deployment name in the `model` parameter rather than only the underlying model name.

**When to reach for it**: Choose Azure OpenAI when the workload needs Azure-specific identity, private networking, policy, or governance integration, or supported residency and compliance controls. Verify that the chosen model, deployment type, feature, and Azure region satisfy those requirements; availability and compliance scope are not implied by selecting the service.

## Microsoft Foundry

Microsoft Foundry, formerly Azure AI Foundry, is the unified Azure platform for building, evaluating, and operating AI applications. It groups model deployments, agents, tools, evaluators, tracing, monitoring, and governance under shared project and resource controls.

**When to reach for it**: Building RAG pipelines, agent systems, or any AI app that needs evaluation and safety controls. Replaces the older Azure AI Studio.

## Azure Machine Learning

MLOps platform for training, tracking, evaluating, registering, and deploying ML models. Core concepts: Workspace (system of record), Compute (clusters/instances), Jobs (reproducible training runs), Model Registry (versioned promotion), Online Endpoints (real-time inference).

**When to reach for it**: Training custom ML models at scale, managing model lifecycle (train → evaluate → register → deploy → monitor), or running batch inference pipelines.

## Azure AI Content Safety

Content filtering and safety controls for AI applications. Features include harmful-content classification, Prompt Shields, protected-material detection, and groundedness detection where the selected surface supports them. PII detection is a separate Azure Language in Foundry Tools capability; for supported LLM output filtering, Microsoft Foundry also exposes a distinct personal-information filter.

**When to reach for it**: Any production AI app that processes user input or generates user-facing content. Implement as a layer in your AI pipeline, not as an afterthought.

## Azure Machine Learning Data Labeling

Managed labeling workflows within Azure Machine Learning. Supports image classification, object detection, text classification, and NER labeling tasks. Exported labels become CSV, COCO, or Azure MLTable data, depending on the project type. Register the export as a versioned data asset and pass that asset to training jobs; lineage records which jobs or pipelines consumed the data asset, while those jobs produce model artifacts separately.

**When to reach for it**: When you need to produce labeled training or evaluation data at scale with audit trails and quality controls.

## Microsoft Foundry Evaluation and Observability

Microsoft Foundry provides evaluation runs, tracing, and monitoring for models and agents. Validate the availability and release status of each evaluator and observability feature in the target project type and region before making it a production gate.

**When to reach for it**: Before deploying any AI feature to production (offline evaluation), and continuously in production (online monitoring for drift and safety regressions).

# References

- [Azure documentation](https://learn.microsoft.com/en-us/azure/) — Microsoft's official Azure docs hub; starting point for any Azure service
- [Azure SDK for .NET](https://learn.microsoft.com/en-us/dotnet/azure/) — .NET integration guide for Azure services; covers authentication, SDK packages, and samples
- [Microsoft Foundry documentation](https://learn.microsoft.com/en-us/azure/foundry/) — current documentation for Foundry models, agents, tools, evaluations, tracing, monitoring, and governance.
- [Azure Functions hosting options](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale) — compares scaling, billing, timeout, networking, and container behavior across Flex Consumption, Consumption, Premium, Dedicated, and Container Apps.
- [Switch between OpenAI and Azure OpenAI endpoints](https://learn.microsoft.com/en-us/azure/developer/ai/how-to/switching-endpoints) — documents Azure endpoint, authentication, and deployment-name differences when using OpenAI clients.
- [Azure Language PII detection](https://learn.microsoft.com/en-us/azure/ai-services/language-service/personally-identifiable-information/quickstart) — the Foundry Tools surface for identifying and redacting personal information in text.
- [Manage Azure Machine Learning labeling projects](https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-labeling-projects) — documents label export formats and Azure MLTable data-asset output.
- [Azure Machine Learning data assets](https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-data-assets) — defines versioned data assets and lineage from assets to consuming jobs and pipelines.
- [Azure Architecture Center — Technology choices](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/technology-choices-overview) — current decision guides across compute, storage, data, analytics, networking, messaging, and integration.
- [Azure compute decision tree](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/compute-decision-tree) — chooses among managed compute options from workload shape and control requirements.
- [Prepare to choose an Azure data store](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/data-stores-getting-started) — current data-model and operational questions plus representative managed products.
- [Compare Azure messaging services](https://learn.microsoft.com/en-us/azure/service-bus-messaging/compare-messaging-services) — official boundary among Event Grid, Event Hubs, and Service Bus.
- [System Design 101 — Azure Services Cheat Sheet](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/azure-services-cheat-sheet.md) — visual catalog reorganized here around capability and verified with current Microsoft guidance.
