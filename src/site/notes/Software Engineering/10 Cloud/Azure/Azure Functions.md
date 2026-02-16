---
{"dg-publish":true,"permalink":"/software-engineering/10-cloud/azure/azure-functions/","noteIcon":""}
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
>  [[Software Engineering/10 Cloud/10 Cloud\|10 Cloud]]
>
> **Pages**
> - [[Software Engineering/10 Cloud/Azure/Azure Cosmos DB\|Azure Cosmos DB]]
> - [[Software Engineering/10 Cloud/Azure/Azure Storage\|Azure Storage]]
<!-- whats-next:end -->
