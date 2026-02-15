---
{"dg-publish":true,"permalink":"/software-engineering/10-cloud/azure/azure-cosmos-db/","noteIcon":""}
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
