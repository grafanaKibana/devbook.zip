---
publish: true
created: 2026-07-11T21:40:40.549Z
modified: 2026-07-16T07:37:36.713Z
published: 2026-07-16T07:37:36.713Z
tags:
  - FolderNote
topic:
  - Cloud
subtopic:
  - AWS
summary: AWS service-selection notes for compute, storage, data, networking, and messaging.
level:
  - "3"
priority: Medium
status: Creation
---

# Intro

AWS (Amazon Web Services) is a public cloud platform with managed compute, storage, networking, data, integration, and AI services. For .NET engineers, its SDK and identity tooling make provider APIs available without hiding their consistency, retry, cost, or failure contracts. This page organizes representative services by the capability a workload needs.

```bash
# Verify active identity
aws sts get-caller-identity
# List S3 buckets
aws s3 ls
```

<nav style="--card-accent: 59, 130, 246;" class="folder-structure-map" aria-label="AWS section map"><div class="folder-map-children"><article class="db-card folder-map-node folder-map-node-empty"><div class="db-card-body"><span class="folder-map-empty-text">No notes in this section yet.</span></div></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

## Choose Services by Capability

The catalog is not a design method. Start with control, workload shape, data model, delivery semantics, regional availability, and portability, then choose the narrowest managed capability that satisfies them.

| Capability | Representative services | Decision question |
| --- | --- | --- |
| Compute | EC2, ECS, EKS, Lambda | Do you need OS control, container scheduling, Kubernetes APIs, or event-bound functions? |
| Storage | S3, EBS, EFS | Is the data an object, a block device, or a shared file system, and what latency/durability contract applies? |
| Relational data | RDS, Aurora | Which engine semantics, failover mode, extensions, and operational controls are required? |
| Purpose-built data | DynamoDB, DocumentDB, Keyspaces, Neptune, Timestream for InfluxDB, ElastiCache | What data model, partition key, query shape, consistency, and transaction boundary does the workload need? |
| Messaging and events | SQS, SNS, EventBridge, MSK, Kinesis | Is the contract a queue, fan-out notification, routed event, ordered log, or replayable stream? |
| Analytics | Glue, EMR, Athena, Redshift, OpenSearch Service, QuickSight | Is the stage ingestion, transformation, interactive query, warehouse, search, or presentation? |
| Integration | Step Functions, AppFlow, API Gateway | Is the workflow code-first, stateful orchestration, managed data movement, or an HTTP API boundary? |

![[Assets/System Design 101/d863fbffc5675c925dfd9ea7ff6c96638c0919e416b40c9b59845db932380e6b.png]]

The visual is an orientation aid, not a lifecycle guarantee. Confirm current service status, regional support, quotas, and pricing in the official service documentation before adopting one.

Amazon Timestream for LiveAnalytics closed to new customers on June 20, 2025. Existing customers can continue using it, but new time-series workloads should evaluate Timestream for InfluxDB or another database whose ingestion, query, retention, and operational model fits the workload.

## Compute

### EC2 (Elastic Compute Cloud)

Virtual machines in the cloud. Choose instance type (CPU/memory/GPU), OS, and networking. The foundation of most AWS workloads.

**When to reach for it**: When you need full control over the OS, custom software, or GPU instances for ML training. For containerized .NET apps, prefer ECS or EKS over raw EC2. EC2 is the right choice for lift-and-shift of on-prem VMs.

```bash
# Launch the current regional Amazon Linux 2023 x86_64 AMI
aws ec2 run-instances --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 --instance-type t3.micro --key-name my-key
```

### Lambda

Lambda runs event-triggered functions in isolated execution environments. An environment moves through initialization, invocation, and shutdown; after an invocation Lambda may freeze it and reuse it, so initialization outside the handler can reduce repeated work but must not hold correctness-critical per-request state.

Invocation mode changes the failure contract:

- A synchronous caller receives the function result or error and owns retry policy.
- Asynchronous invocation queues the event inside Lambda and uses configurable retry and failure destinations.
- An event source mapping polls a stream or queue in batches; ordering, visibility timeouts, partial-batch handling, retry, and discard behavior depend on the source.

Concurrency is the number of active execution environments. Reserved concurrency isolates capacity and caps a function; provisioned concurrency prepares environments to reduce initialization latency but adds idle cost. Observe duration, errors, throttles, concurrent executions, iterator age for streams, and destination/DLQ depth. Make handlers idempotent because retries and duplicate delivery are normal failure behavior.

![[Assets/System Design 101/03a0fa5987095ab9dd4c73cfbd13e79b33de4e1df7c1ead9fe296305107744f1.jpg]]

Use Lambda for event-driven, bursty, bounded work when managed scaling is worth runtime limits and variable initialization latency. Prefer a continuously running container or VM for sustained workloads that require long-lived processes, specialized host control, or stable low-latency execution.

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

### S3 Object Model and Request Path

An S3 object is addressed by bucket, key, and optionally version ID. It contains bytes plus system and user-defined metadata; a bucket is the policy, namespace, region, and configuration boundary. A request is authenticated and authorized through IAM, bucket/access-point policies, and related controls before S3 applies the object operation. Do not model ByteByteGo's illustrative metadata store and data store as AWS's documented internal topology: AWS publishes the service contract, not that implementation.

After a successful write, S3 provides strong read-after-write consistency for object PUT and DELETE operations and for relevant listing operations. Use a supported checksum through the API or SDK to validate payload integrity. The ETag is an HTTP entity tag, not a universal content checksum: multipart objects and some encryption modes do not yield a whole-object MD5.

### S3 Multipart Uploads

Multipart upload separates a large object into independently retriable parts:

1. `CreateMultipartUpload` returns an upload ID and fixes upload options such as encryption and checksum algorithm.
2. The client uploads numbered parts, usually with bounded parallelism, and records each returned ETag/checksum.
3. It retries only failed parts with backoff and preserves their part numbers.
4. `CompleteMultipartUpload` submits the ordered part list; S3 assembles the object.
5. On cancellation or unrecoverable failure, `AbortMultipartUpload` removes uploaded parts. Incomplete parts keep accruing storage charges until aborted or removed by a lifecycle rule.

Except for the final part, each part must be at least 5 MiB; S3 accepts at most 10,000 parts. Choose a part size that stays below that count, and cap parallel requests so client memory, connection pools, upstream bandwidth, and S3 request rates remain controlled. Prefer the SDK's checksum support and validate the stored checksum rather than comparing the final ETag with a local MD5.

![[Assets/System Design 101/d94d95b4b0e8bab46e58b81b9cdc493760dfeebf89cda8c28920e9d2acba97e4.png]]

## Databases

### DynamoDB

Fully managed NoSQL key-value and document database. Single-digit millisecond performance at any scale. On-demand or provisioned capacity. Global tables for multi-region replication.

**When to reach for it**: High-throughput, low-latency key-value access patterns. Session stores, user profiles, IoT data, gaming leaderboards. Avoid for complex relational queries or ad-hoc analytics — use RDS or Redshift instead. Equivalent to Azure Cosmos DB.

```bash
# Get an item by primary key
aws dynamodb get-item --table-name Users --key '{"UserId": {"S": "user-123"}}'
```

## Networking

Choose an AWS path from the communicating endpoints, then check routing, addressing, transitivity, DNS, bandwidth, failure domain, and price.

| Need | Path | Contract to verify |
| --- | --- | --- |
| Public internet to a VPC resource | Internet gateway plus public addressing and routes | Security controls, IPv4/IPv6 behavior, ingress/egress path, and public-address charges |
| Private egress to the internet | NAT gateway or managed NAT alternative | Per-hour and per-byte cost, AZ placement, route tables, and failure isolation |
| Two VPCs with direct private routing | VPC peering | Peering is not transitive; routes and overlapping CIDRs constrain the design |
| Many VPCs and hybrid networks | Transit Gateway or Cloud WAN | Attachment, route-table, propagation, bandwidth, and regional boundaries |
| VPC to S3 or DynamoDB | Gateway VPC endpoint | Supported service, route-table entries, endpoint policy, and regional scope |
| VPC to a supported AWS/SaaS service | Interface VPC endpoint through PrivateLink | ENI/subnet placement, security groups, private DNS, AZ and data-processing cost |
| On-premises to AWS | Site-to-Site VPN or Direct Connect | Encryption, redundancy, bandwidth, BGP, lead time, and failover path |

The source diagram combines valid service names with shortcuts that can misstate gateway-endpoint support and path details, so it is not embedded. Build the actual map from the VPC route tables, endpoint type, DNS answers, and the source/destination pair.

## Messaging

### SQS (Simple Queue Service)

Fully managed message queue. Standard queues provide at-least-once delivery and best-effort ordering. FIFO queues preserve strict order within each `MessageGroupId`; different groups can be processed concurrently and have no global order relative to one another. FIFO deduplication suppresses repeated sends with the same deduplication ID during the five-minute deduplication interval, which is the scope of SQS's exactly-once claim. Consumers still need idempotent side effects and must delete a processed message before its visibility timeout because a failed or timed-out consumer can receive it again. Dead-letter queues isolate messages that exhaust the configured receive policy.

**When to reach for it**: Decoupling producers from consumers. Background job processing. Buffer between high-throughput producers and slower consumers. Equivalent to Azure Storage Queues (simple) or Azure Service Bus (FIFO/advanced).

```bash
# Send a message
aws sqs send-message --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-queue --message-body 'Hello'
# Receive messages
aws sqs receive-message --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-queue
```

## References

- [AWS Documentation](https://docs.aws.amazon.com/) — AWS official docs hub; covers all services with API references and tutorials
- [AWS SDK for .NET](https://docs.aws.amazon.com/sdk-for-net/v3/developer-guide/welcome.html) — .NET integration guide; covers authentication, service clients, and async patterns
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html) — AWS best practices for reliability, security, performance, and cost optimization
- [AWS decision guides](https://docs.aws.amazon.com/decision-guides/latest/) — capability-first comparisons for compute, containers, storage, databases, integration, and other service families.
- [S3 multipart upload overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html) — lifecycle, independent retries, parallel upload, completion, abort, and incomplete-upload costs.
- [S3 multipart upload limits](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html) — official part-size, part-count, and object-size limits.
- [S3 object integrity](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html) — checksum APIs and the limits of treating ETags as content MD5 values.
- [S3 data consistency model](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel) — documented read-after-write and list consistency guarantees.
- [AWS VPC connectivity options](https://docs.aws.amazon.com/whitepapers/latest/aws-vpc-connectivity-options/welcome.html) — routing, transitivity, bandwidth, and failure-domain tradeoffs among VPC and hybrid paths.
- [Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html) — initialization, invocation, freezing/reuse, shutdown, and provisioned concurrency.
- [Lambda retry behavior](https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html) — distinct retry and failure-destination behavior for synchronous, asynchronous, and event-source invocations.
- [Timestream for LiveAnalytics availability change](https://docs.aws.amazon.com/timestream/latest/developerguide/AmazonTimestreamForLiveAnalytics-availability-change.html) — records the June 20, 2025 new-customer closure and AWS's Timestream for InfluxDB recommendation.
- [Amazon Linux 2023 on EC2](https://docs.aws.amazon.com/linux/al2023/ug/ec2.html) — documents the regional SSM public parameter used to resolve the current AL2023 AMI.
- [SQS FIFO delivery logic](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html) — defines ordering per message group and the concurrency boundary between groups.
- [SQS FIFO key terms](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-key-terms.html) — defines deduplication IDs, their five-minute interval, message groups, and receive-attempt deduplication.
- [System Design 101 — AWS Services Cheat Sheet](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/aws-services-cheat-sheet.md) — visual catalog used only as orientation; official docs decide service fit and lifecycle.
- [System Design 101 — How to Upload a Large File to S3](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-to-upload-a-large-file-to-s3.md) — multipart sequence used after correcting the ETag/checksum claim.
- [System Design 101 — What Happens When You Upload a File to Amazon S3?](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-happens-when-you-upload-a-file-to-amazon-s3.md) — editorial object-model prompt; its speculative internal topology is intentionally excluded.
- [System Design 101 — Typical AWS Network Architecture](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/typical-aws-network-architecture-in-one-diagram.md) — connectivity inventory rebuilt around documented endpoint and route contracts; the defective visual is not embedded.
- [System Design 101 — How AWS Lambda Works Behind the Scenes](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-aws-lambda-work-behind-the-scenes.md) — visual lifecycle prompt; invocation semantics here follow current AWS documentation.
