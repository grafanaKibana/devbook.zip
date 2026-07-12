---
topic:
  - Cloud
subtopic:
  - AWS
summary: "The largest public cloud, with mature SDKs and the broadest service catalog."
level:
  - "3"
priority: Medium
status: Creation
tags:
  - FolderNote
publish: true
---

# Intro

AWS (Amazon Web Services) is the largest public cloud platform by market share. For .NET engineers, AWS provides mature SDKs, deep Kubernetes support (EKS), and the broadest service catalog. This page covers the four AWS services most commonly used in .NET/AI workloads.

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

## References

- [AWS Documentation](https://docs.aws.amazon.com/) — AWS official docs hub; covers all services with API references and tutorials
- [AWS SDK for .NET](https://docs.aws.amazon.com/sdk-for-net/v3/developer-guide/welcome.html) — .NET integration guide; covers authentication, service clients, and async patterns
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html) — AWS best practices for reliability, security, performance, and cost optimization
