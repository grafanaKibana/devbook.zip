---
{"dg-publish":true,"permalink":"/software-engineering/10-cloud/azure/azure-storage/","noteIcon":"3"}
---


# Intro

Azure Storage is a family of services for durable storage: Blobs (object storage), Files (SMB shares), Queues (messaging), and Tables (key-value).

## Example

Create a storage account with Azure CLI:

```bash
az storage account create \
  --name mystorageacct123 \
  --resource-group my-rg \
  --location westeurope \
  --sku Standard_LRS
```

## Links

- [Azure Storage documentation](https://learn.microsoft.com/en-us/azure/storage/)

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
> - [[Software Engineering/10 Cloud/Azure/Azure Cosmos DB\|Azure Cosmos DB]]
> - [[Software Engineering/10 Cloud/Azure/Azure Functions\|Azure Functions]]
> - [[Software Engineering/10 Cloud/Azure/Azure Machine Learning\|Azure Machine Learning]]
> - [[Software Engineering/10 Cloud/Azure/Azure OpenAI\|Azure OpenAI]]
<!-- whats-next:end -->
