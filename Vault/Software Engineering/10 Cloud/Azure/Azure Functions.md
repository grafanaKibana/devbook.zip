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

Azure Functions is a serverless compute service for running event-driven code without managing servers.

Common triggers include HTTP, timers, queues, blobs, and event streams.

## Example

Create and publish a function app using Azure Functions Core Tools:

```bash
func init MyFuncApp --dotnet
cd MyFuncApp
func new --name Hello --template "HTTP trigger" --authlevel "Anonymous"
```

## Links

- [Azure Functions documentation](https://learn.microsoft.com/en-us/azure/azure-functions/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/10 Cloud/10 Cloud|10 Cloud]]
>
> **Pages**
> - [[Software Engineering/10 Cloud/Azure/Azure AI Content Safety and Guardrails|Azure AI Content Safety and Guardrails]]
> - [[Software Engineering/10 Cloud/Azure/Azure AI Data Labeling|Azure AI Data Labeling]]
> - [[Software Engineering/10 Cloud/Azure/Azure AI Evaluation and Observability|Azure AI Evaluation and Observability]]
> - [[Software Engineering/10 Cloud/Azure/Azure AI Foundry|Azure AI Foundry]]
> - [[Software Engineering/10 Cloud/Azure/Azure Cosmos DB|Azure Cosmos DB]]
> - [[Software Engineering/10 Cloud/Azure/Azure Machine Learning|Azure Machine Learning]]
> - [[Software Engineering/10 Cloud/Azure/Azure OpenAI|Azure OpenAI]]
> - [[Software Engineering/10 Cloud/Azure/Azure Storage|Azure Storage]]
<!-- whats-next:end -->
