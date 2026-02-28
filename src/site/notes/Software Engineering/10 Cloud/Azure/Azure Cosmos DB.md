---
{"dg-publish":true,"permalink":"/software-engineering/10-cloud/azure/azure-cosmos-db/","noteIcon":"3"}
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
>  [[Software Engineering/10 Cloud/10 Cloud\|10 Cloud]]
>
> **Pages**
> - [[Software Engineering/10 Cloud/Azure/Azure AI Content Safety and Guardrails\|Azure AI Content Safety and Guardrails]]
> - [[Software Engineering/10 Cloud/Azure/Azure AI Data Labeling\|Azure AI Data Labeling]]
> - [[Software Engineering/10 Cloud/Azure/Azure AI Evaluation and Observability\|Azure AI Evaluation and Observability]]
> - [[Software Engineering/10 Cloud/Azure/Azure AI Foundry\|Azure AI Foundry]]
> - [[Software Engineering/10 Cloud/Azure/Azure Functions\|Azure Functions]]
> - [[Software Engineering/10 Cloud/Azure/Azure Machine Learning\|Azure Machine Learning]]
> - [[Software Engineering/10 Cloud/Azure/Azure OpenAI\|Azure OpenAI]]
> - [[Software Engineering/10 Cloud/Azure/Azure Storage\|Azure Storage]]
<!-- whats-next:end -->
