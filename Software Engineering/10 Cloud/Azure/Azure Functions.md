---
topic:
  - Cloud
subtopic:
  - Azure
level:
  - "3"
priority: Medium
status: Creation

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
