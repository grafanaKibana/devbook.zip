---
topic:
  - Cloud
subtopic:
  - AWS
summary: "AWS service-selection notes for compute, storage, data, networking, and messaging."
level:
  - "3"
priority: Medium
status: Creation
tags:
  - FolderNote
publish: true
---

# Intro

AWS (Amazon Web Services) is a public cloud platform with managed compute, storage, networking, data, integration, and AI services. For .NET engineers, its SDK and identity tooling make provider APIs available without hiding their consistency, retry, cost, or failure contracts. This page organizes representative services by the capability a workload needs.

```bash
# Verify active identity
aws sts get-caller-identity
# List S3 buckets
aws s3 ls
```

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

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

Use this page to translate workload capabilities into AWS names. The provider-neutral mechanisms live in [[Home/Data Persistence/Object Storage|Object Storage]], [[Home/Data Persistence/NoSQL/NoSQL|NoSQL]], [[Home/Networks/Networks|Networks]], [[Home/Software Architecture/Distributed Systems/Message Queues/Message Queues|Message Queues]], [[Home/Software Architecture/System Architecture/Event-Driven Architecture|Event-Driven Architecture]], and [[Home/DevOps/Kubernetes|Kubernetes]]. Those notes own the durable design tradeoffs; AWS documentation owns the current regional, quota, pricing, and lifecycle contract.

![[System Design 101/d863fbffc5675c925dfd9ea7ff6c96638c0919e416b40c9b59845db932380e6b.png]]

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

Lambda runs event-triggered functions in managed execution environments. Synchronous invocation leaves retries with the caller; asynchronous invocation and event-source mappings have source-specific queueing, retry, ordering, batch, and failure-destination behavior. Handlers need idempotent side effects because duplicate delivery and ambiguous outcomes are normal at those boundaries.

Reserved concurrency isolates and caps capacity; provisioned concurrency prepares environments to reduce initialization latency but adds idle cost. Use Lambda for bursty bounded work when managed scaling is worth runtime limits and variable initialization latency. Prefer a continuously running container or VM for sustained work that needs long-lived processes, specialized host control, or stable low-latency execution.

![[System Design 101/03a0fa5987095ab9dd4c73cfbd13e79b33de4e1df7c1ead9fe296305107744f1.jpg]]

## Storage

### S3 (Simple Storage Service)
S3 stores objects addressed by bucket, key, and optional version ID. It is a fit for immutable or replace-as-a-whole payloads such as media, backups, artifacts, and data-lake files. Strong single-object and listing consistency does not create a multi-object transaction, and an ETag is not a universal content checksum.

```bash
# Upload a file
aws s3 cp ./model.pkl s3://my-bucket/models/model.pkl
# Sync a directory
aws s3 sync ./data/ s3://my-bucket/data/
```

Multipart upload makes large transfers independently retriable, but unfinished parts accrue charges until aborted or removed by lifecycle policy. [[Home/Data Persistence/Object Storage|Object Storage]] owns the multipart, checksum, lifecycle, and multi-object publication mechanisms; use S3 documentation for current limits and API behavior.

![[System Design 101/d94d95b4b0e8bab46e58b81b9cdc493760dfeebf89cda8c28920e9d2acba97e4.png]]

## Databases

### DynamoDB
DynamoDB is a managed key-value and document database with on-demand or provisioned capacity and optional global tables. Reach for it when partition-key and sort-key access patterns are known up front and its per-operation consistency, transaction, indexing, capacity, and multi-Region contracts fit. Do not treat Cosmos DB or another document store as behaviorally equivalent because the capability category is similar.

```bash
# Get an item by primary key
aws dynamodb get-item --table-name Users --key '{"UserId": {"S": "user-123"}}'
```

## Networking

Choose an AWS path from the communicating endpoints, then check routing, addressing, transitivity, DNS, bandwidth, failure domain, and price. Internet gateways, NAT gateways, VPC peering, Transit Gateway, PrivateLink endpoints, VPN, and Direct Connect solve different paths; none is a generic "private networking" switch. [[Home/Networks/Networks|Networks]] owns the provider-neutral routing and transport concepts.

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
SQS is a managed queue. Standard queues provide at-least-once delivery and best-effort ordering. FIFO queues order within a `MessageGroupId`; their five-minute send-deduplication window does not make downstream side effects exactly once. Consumers still need idempotency, visibility-timeout handling, bounded retries, and dead-letter policy. [[Home/Software Architecture/Distributed Systems/Message Queues/Message Queues|Message Queues]] owns those mechanisms; compare SQS with SNS, EventBridge, Kinesis, and MSK by queue, fan-out, routing, ordering, and replay requirements.

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
