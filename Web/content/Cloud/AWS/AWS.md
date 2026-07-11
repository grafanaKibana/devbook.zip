---
publish: true
created: 2026-07-11T18:27:06.521Z
modified: 2026-07-11T18:27:06.521Z
published: 2026-07-11T18:27:06.521Z
tags:
  - FolderNote
topic:
  - Cloud
subtopic:
  - AWS
summary: AWS is the largest public cloud platform, offering .NET engineers mature SDKs, deep Kubernetes support, and the broadest service catalog.
level:
  - "3"
priority: Medium
status: Creation
---

# Intro

AWS (Amazon Web Services) is the largest public cloud platform by market share. For .NET engineers, AWS provides mature SDKs, deep Kubernetes support (EKS), and the broadest service catalog. This page covers the four AWS services most commonly used in .NET/AI workloads.

<nav style="--map-accent: 59, 130, 246;" class="folder-structure-map" aria-label="AWS section map"><p class="folder-map-empty">No notes in this section yet.</p><style>
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

```bash
# Verify active identity
aws sts get-caller-identity
# List S3 buckets
aws s3 ls
```

## Compute

### EC2 (Elastic Compute Cloud)

Virtual machines in the cloud. Choose instance type (CPU/memory/GPU), OS, and networking. The foundation of most AWS workloads.

**When to reach for it**: When you need full control over the OS, custom software, or GPU instances for ML training. For containerized .NET apps, prefer ECS or EKS over raw EC2. EC2 is the right choice for lift-and-shift of on-prem VMs.

```bash
# Launch an instance (Amazon Linux 2, t3.micro)
aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type t3.micro --key-name my-key
```

## Storage

### S3 (Simple Storage Service)

Object storage for any file type. Virtually unlimited capacity. 11 nines durability. Versioning, lifecycle policies, and event notifications built in.

**When to reach for it**: Any unstructured data storage — ML datasets, model artifacts, backups, static website assets, application logs. The default choice for object storage on AWS. Equivalent to Azure Blob Storage.

```bash
# Upload a file
aws s3 cp ./model.pkl s3://my-bucket/models/model.pkl
# Sync a directory
aws s3 sync ./data/ s3://my-bucket/data/
```

## Databases

### DynamoDB

Fully managed NoSQL key-value and document database. Single-digit millisecond performance at any scale. On-demand or provisioned capacity. Global tables for multi-region replication.

**When to reach for it**: High-throughput, low-latency key-value access patterns. Session stores, user profiles, IoT data, gaming leaderboards. Avoid for complex relational queries or ad-hoc analytics — use RDS or Redshift instead. Equivalent to Azure Cosmos DB.

```bash
# Get an item by primary key
aws dynamodb get-item --table-name Users --key '{"UserId": {"S": "user-123"}}'
```

## Messaging

### SQS (Simple Queue Service)

Fully managed message queue. Standard queues (at-least-once, best-effort ordering) and FIFO queues (exactly-once, strict ordering). Scales automatically. Dead-letter queues for failed messages.

**When to reach for it**: Decoupling producers from consumers. Background job processing. Buffer between high-throughput producers and slower consumers. Equivalent to Azure Storage Queues (simple) or Azure Service Bus (FIFO/advanced).

```bash
# Send a message
aws sqs send-message --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-queue --message-body 'Hello'
# Receive messages
aws sqs receive-message --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-queue
```

## Cross-Provider Comparison

| Service | AWS | Azure Equivalent | GCP Equivalent |
|---------|-----|-----------------|----------------|
| Virtual machines | EC2 | Azure VMs | Compute Engine |
| Object storage | S3 | Azure Blob Storage | Cloud Storage |
| NoSQL database | DynamoDB | Cosmos DB | Firestore |
| Message queue | SQS | Azure Service Bus / Storage Queues | Cloud Pub/Sub |

## References

- [AWS Documentation](https://docs.aws.amazon.com/) — AWS official docs hub; covers all services with API references and tutorials
- [AWS SDK for .NET](https://docs.aws.amazon.com/sdk-for-net/v3/developer-guide/welcome.html) — .NET integration guide; covers authentication, service clients, and async patterns
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html) — AWS best practices for reliability, security, performance, and cost optimization
