---
publish: true
created: 2026-07-11T21:40:45.828Z
modified: 2026-07-11T21:40:45.830Z
published: 2026-07-11T21:40:45.830Z
tags:
  - FolderNote
topic:
  - Cloud
subtopic:
  - Azure
summary: Microsoft's public cloud, a natural home for .NET and AI workloads.
level:
  - "3"
priority: Medium
status: Creation
---

# Intro

Azure is Microsoft's public cloud platform. For .NET and AI engineers, Azure is the natural home for workloads that integrate with Microsoft identity, Active Directory, and the Microsoft AI ecosystem. This page covers the Azure services most relevant to .NET/AI development.

```bash
# List subscriptions
az account list -o table
# Set active subscription
az account set --subscription "My Subscription"
```

<nav style="--card-accent: 59, 130, 246;" class="folder-structure-map" aria-label="Azure section map"><p class="folder-map-empty">No notes in this section yet.</p><style>
.db-card {
  position: relative;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.db-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--card-accent, 125, 125, 125), 0.09) 0%,
    rgba(var(--card-accent, 125, 125, 125), 0.04) 38%,
    rgba(var(--card-accent, 125, 125, 125), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.db-card:hover,
.db-card:focus-within {
  border-color: rgba(var(--card-accent, 125, 125, 125), 0.55);
  background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.db-card:hover::before,
.db-card:focus-within::before { opacity: 1; }
.db-card-body {
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: var(--db-card-pad, 0.85rem 0.9rem);
}
.db-card-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--card-accent, 125, 125, 125));
}
.db-card-icon svg { display: block; width: 100%; height: 100%; }
.db-card-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}
/* Element-qualified (p.db-card-summary) on purpose: it ties the specificity of
   Obsidian reading view's ".markdown-rendered p" and, being injected later in
   the body, wins. A bare ".db-card-summary" loses to it, so Obsidian keeps its
   default paragraph spacing and the description gets large gaps above/below.
   Quartz doesn't add those margins, which is why the gap only showed there. */
p.db-card-summary {
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.db-card-hit { position: absolute; inset: 0; z-index: 1; }
.db-card-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.db-card-hit a:focus-visible {
  outline: 2px solid rgb(var(--card-accent, 125, 125, 125));
  outline-offset: -0.3rem;
}
@media (prefers-reduced-motion: reduce) {
  .db-card { transition: none; }
  .db-card::before { transition: none; }
  .db-card:hover,
  .db-card:focus-within { transform: none; }
}

.folder-structure-map {
\--card-accent: 16, 185, 129;
\--map-gap: 0.75rem;
width: 100%;
box-sizing: border-box;
margin: 0.5rem 0 0.75rem;
container-name: folder-map;
container-type: inline-size;
}
.folder-map-children {
/\* Flex (not grid) so each card sizes to its own title — a long title widens
its card and pushes to another row instead of being truncated, and rows
grow to fill the width with no empty tracks when there are few cards. _/
display: flex;
flex-wrap: wrap;
gap: var(--map-gap);
}
.folder-map-node {
/_ No overflow:hidden on a flex item whose min-width:auto collapses to 0: that
would let the card shrink below its title + note-count and clip them.
Without it the card's min size is its content, so long titles widen the card
(and wrap to another row) instead of being cut off. The shared ::before
accent uses border-radius:inherit to stay inside the rounded corners. \*/
flex: 1 1 12rem;
min-height: 2.75rem;
\--db-card-pad: 0.5rem 0.75rem;
}
.folder-map-node .db-card-body {
min-height: 2.75rem;
justify-content: center;
}
.folder-map-node-heading {
display: flex;
align-items: center;
justify-content: space-between;
gap: 0.75rem;
}
.folder-map-node-title-group {
display: flex;
align-items: center;
gap: 0.5rem;
}
.folder-map-node .db-card-title {
white-space: nowrap;
}
.folder-map-node-count {
display: block;
flex: 0 0 auto;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
white-space: nowrap;
}
.folder-map-node .db-card-summary {
display: none;
}
.folder-map-empty {
margin: 1rem 0 0;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
}
@container folder-map (min-width: 40rem) {
.folder-map-node {
min-height: 6rem;
\--db-card-pad: 0.85rem 0.9rem;
}
.folder-map-node .db-card-body {
min-height: 6rem;
justify-content: flex-start;
}
.folder-map-node .db-card-summary { display: block; }
}
@container folder-map (min-width: 64rem) {
.folder-map-node,
.folder-map-node .db-card-body { min-height: 6.75rem; }
} </style></nav>

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
