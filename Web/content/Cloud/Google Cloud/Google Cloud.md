---
publish: true
created: 2026-07-11T18:27:13.749Z
modified: 2026-07-11T18:27:13.751Z
published: 2026-07-11T18:27:13.751Z
tags:
  - FolderNote
topic:
  - Cloud
subtopic:
  - Google Cloud
summary: Google Cloud Platform (GCP) is a public cloud known for data analytics, machine learning, and Kubernetes, with strong managed services for .NET data and AI workloads.
level:
  - "3"
priority: Medium
status: Creation
---

# Intro

Google Cloud Platform (GCP) is a public cloud platform known for its data analytics, machine learning, and Kubernetes capabilities (Google invented Kubernetes). For .NET engineers, GCP offers strong managed services for data-intensive and AI workloads.

```bash
# Set active project
gcloud config set project "my-project-id"
# List available services
gcloud services list --enabled
```

<nav style="--map-accent: 59, 130, 246;" class="folder-structure-map" aria-label="Google Cloud section map"><p class="folder-map-empty">No notes in this section yet.</p><style>
.folder-structure-map {
  --map-accent: 16, 185, 129;
  --map-gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  margin: 0.5rem 0 0.75rem;
  container-name: folder-map;
  container-type: inline-size;
}
.folder-map-children {
  /* Flex (not grid) so each card sizes to its own title — a long title widens
     its card and pushes to another row instead of being truncated, and rows
     grow to fill the width with no empty tracks when there are few cards. */
  display: flex;
  flex-wrap: wrap;
  gap: var(--map-gap);
}
.folder-map-node {
  position: relative;
  /* No overflow:hidden here: on a flex item that collapses min-width:auto to 0,
     letting the card shrink below its title + note-count and clip them. Without
     it, the card's min size is its content, so long titles widen the card (and
     wrap to another row) instead of being cut off. The accent gradient gets its
     own border-radius below to stay inside the rounded corners. */
  flex: 1 1 12rem;
  min-height: 2.75rem;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.folder-map-node::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--map-accent), 0.09) 0%,
    rgba(var(--map-accent), 0.04) 38%,
    rgba(var(--map-accent), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.folder-map-node:hover,
.folder-map-node:focus-within {
  border-color: rgba(var(--map-accent), 0.55);
  background-color: color-mix(in srgb, rgb(var(--map-accent)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.folder-map-node:hover::before,
.folder-map-node:focus-within::before {
  opacity: 1;
}
.folder-map-node-body {
  position: relative;
  z-index: 0;
  display: flex;
  min-height: 2.75rem;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  padding: 0.5rem 0.75rem;
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
.folder-map-entry-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--map-accent));
}
.folder-map-entry-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}
.folder-map-node-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
}
.folder-map-node p {
  display: none;
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.folder-map-node-count {
  display: block;
  flex: 0 0 auto;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  white-space: nowrap;
}
.folder-map-hit {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.folder-map-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.folder-map-hit a:focus-visible {
  outline: 2px solid rgb(var(--map-accent));
  outline-offset: -0.3rem;
}
.folder-map-empty {
  margin: 1rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
}
@container folder-map (min-width: 40rem) {
  .folder-map-node {
    min-height: 6rem;
  }
  .folder-map-node-body {
    min-height: 6rem;
    justify-content: flex-start;
    padding: 0.85rem 0.9rem;
  }
  .folder-map-node p { display: block; }
}
@container folder-map (min-width: 64rem) {
  .folder-map-node,
  .folder-map-node-body { min-height: 6.75rem; }
}
@media (prefers-reduced-motion: reduce) {
  .folder-map-node { transition: none; }
  .folder-map-node::before { transition: none; }
  .folder-map-node:hover,
  .folder-map-node:focus-within { transform: none; }
}
</style></nav>

## Compute

### Cloud Functions

Serverless, event-driven functions. Triggers: HTTP, Pub/Sub, Cloud Storage events, Firestore events. Scales to zero. Gen 2 functions run on Cloud Run under the hood.

**When to reach for it**: Lightweight event handlers, webhooks, and data transformation pipelines. Equivalent to AWS Lambda and Azure Functions. For longer-running or containerized workloads, use Cloud Run instead.

```bash
# Deploy a function
gcloud functions deploy my-function --runtime dotnet8 --trigger-http --allow-unauthenticated
```

## Storage

### Cloud Storage

Object storage for any file type. Globally distributed. Storage classes: Standard (hot), Nearline (monthly access), Coldline (quarterly), Archive (yearly). Equivalent to AWS S3 and Azure Blob Storage.

**When to reach for it**: ML datasets, model artifacts, backups, static assets. Default object storage on GCP. Lifecycle policies automatically move objects to cheaper storage classes as they age.

```bash
# Upload a file
gsutil cp ./data.csv gs://my-bucket/data/data.csv
# Sync a directory
gsutil -m rsync -r ./data/ gs://my-bucket/data/
```

## Databases

### BigQuery

Serverless, columnar data warehouse for analytics. Petabyte-scale. SQL interface. Pay per query (TB scanned) or flat-rate slots. Built-in ML (BigQuery ML) for training models with SQL.

**When to reach for it**: Ad-hoc analytics, business intelligence, and large-scale data processing. Not for OLTP workloads — use Cloud Spanner or Firestore for transactional data. Equivalent to AWS Redshift and Azure Synapse Analytics.

```bash
# Run a query
bq query --use_legacy_sql=false 'SELECT COUNT(*) FROM `my-project.my-dataset.my-table`'
```

### Cloud Spanner

Globally distributed, strongly consistent relational database. Combines the horizontal scalability of NoSQL with the ACID guarantees of SQL. Unique: external consistency across regions.

**When to reach for it**: Global financial systems, inventory management, or any workload that needs both horizontal scale and strong consistency. Expensive — minimum ~\$0.90/hour per node. Equivalent to Azure Cosmos DB (with strong consistency) or CockroachDB.

### Firebase

Mobile and web application platform. Includes: Firestore (real-time NoSQL document database), Authentication, Hosting, Cloud Messaging (push notifications), and Analytics.

**When to reach for it**: Mobile apps and web apps that need real-time data sync, offline support, and built-in authentication. Firestore is the primary database — it syncs data to clients in real time. Not suitable for complex server-side workloads.

## Cross-Provider Comparison

| Service | GCP | AWS Equivalent | Azure Equivalent |
|---------|-----|----------------|-----------------|
| Serverless compute | Cloud Functions | AWS Lambda | Azure Functions |
| Object storage | Cloud Storage | S3 | Azure Blob Storage |
| Data warehouse | BigQuery | Redshift | Azure Synapse |
| Global relational DB | Cloud Spanner | Aurora Global | Cosmos DB (SQL API) |
| Mobile/real-time DB | Firebase/Firestore | DynamoDB | Cosmos DB |

## References

- [Google Cloud documentation](https://cloud.google.com/docs) — GCP official docs hub; covers all services with quickstarts and API references
- [Google Cloud .NET client libraries](https://cloud.google.com/dotnet/docs/reference) — .NET integration guide for GCP services
- [BigQuery documentation](https://cloud.google.com/bigquery/docs) — comprehensive BigQuery guide including BigQuery ML and data transfer service
