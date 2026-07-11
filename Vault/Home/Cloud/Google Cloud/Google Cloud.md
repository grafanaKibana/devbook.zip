---
topic:
  - Cloud
subtopic:
  - Google Cloud
summary: "Google's public cloud known for data analytics, machine learning, and Kubernetes."
level:
  - "3"
priority: Medium
tags:
  - FolderNote
publish: true
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

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

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

**When to reach for it**: Global financial systems, inventory management, or any workload that needs both horizontal scale and strong consistency. Expensive — minimum ~$0.90/hour per node. Equivalent to Azure Cosmos DB (with strong consistency) or CockroachDB.

### Firebase
Mobile and web application platform. Includes: Firestore (real-time NoSQL document database), Authentication, Hosting, Cloud Messaging (push notifications), and Analytics.

**When to reach for it**: Mobile apps and web apps that need real-time data sync, offline support, and built-in authentication. Firestore is the primary database — it syncs data to clients in real time. Not suitable for complex server-side workloads.

## References

- [Google Cloud documentation](https://cloud.google.com/docs) — GCP official docs hub; covers all services with quickstarts and API references
- [Google Cloud .NET client libraries](https://cloud.google.com/dotnet/docs/reference) — .NET integration guide for GCP services
- [BigQuery documentation](https://cloud.google.com/bigquery/docs) — comprehensive BigQuery guide including BigQuery ML and data transfer service
