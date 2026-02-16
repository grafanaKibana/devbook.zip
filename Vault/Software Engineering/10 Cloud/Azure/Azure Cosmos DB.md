---
topic:
  - Cloud
subtopic:
  - Azure
level:
  - "3"
priority: Medium
status: Creation

dg-publish: true
---

# Intro

Azure Cosmos DB is a globally distributed database service with multiple APIs (for example: NoSQL, MongoDB, Cassandra, Gremlin, Table).

It is commonly used when you need low-latency reads/writes and multi-region replication.

## Example

Create a Cosmos DB account (NoSQL API) with Azure CLI:

```bash
az cosmosdb create \
  --name my-cosmos-account \
  --resource-group my-rg
```

## Links

- [Azure Cosmos DB documentation](https://learn.microsoft.com/en-us/azure/cosmos-db/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/10 Cloud/10 Cloud|10 Cloud]]
>
> **Pages**
> - [[Software Engineering/10 Cloud/Azure/Azure Functions|Azure Functions]]
> - [[Software Engineering/10 Cloud/Azure/Azure Storage|Azure Storage]]
<!-- whats-next:end -->
