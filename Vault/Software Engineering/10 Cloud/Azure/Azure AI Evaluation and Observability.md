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

Evaluation and observability are how you ship AI systems safely: you measure quality and safety before release, then trace/monitor behavior in production to catch regressions, drift, and incidents.
In Azure AI Foundry, you get built-in evaluators, cloud evaluation runs, and tracing/observability integrations.

## Example

Minimal CI gate for a RAG assistant:

```text
Block release if:
- groundedness score drops below threshold
- jailbreak test suite pass rate drops
- schema-valid JSON rate drops
```

## Links

- [Observability in generative AI](https://learn.microsoft.com/azure/ai-foundry/concepts/observability)
- [Built-in evaluators reference](https://learn.microsoft.com/azure/ai-foundry/concepts/built-in-evaluators)
- [Evaluate locally with the Azure AI Evaluation SDK](https://learn.microsoft.com/azure/ai-foundry/how-to/develop/evaluate-sdk)
- [Run evaluations in the cloud by using the Microsoft Foundry SDK](https://learn.microsoft.com/azure/ai-foundry/how-to/develop/cloud-evaluation)
- [View trace results for AI applications using OpenAI SDK](https://learn.microsoft.com/azure/ai-foundry/how-to/develop/trace-application)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/10 Cloud/10 Cloud|10 Cloud]]
>
> **Pages**
> - [[Software Engineering/10 Cloud/Azure/Azure AI Content Safety and Guardrails|Azure AI Content Safety and Guardrails]]
> - [[Software Engineering/10 Cloud/Azure/Azure AI Data Labeling|Azure AI Data Labeling]]
> - [[Software Engineering/10 Cloud/Azure/Azure AI Foundry|Azure AI Foundry]]
> - [[Software Engineering/10 Cloud/Azure/Azure Cosmos DB|Azure Cosmos DB]]
> - [[Software Engineering/10 Cloud/Azure/Azure Functions|Azure Functions]]
> - [[Software Engineering/10 Cloud/Azure/Azure Machine Learning|Azure Machine Learning]]
> - [[Software Engineering/10 Cloud/Azure/Azure OpenAI|Azure OpenAI]]
> - [[Software Engineering/10 Cloud/Azure/Azure Storage|Azure Storage]]
<!-- whats-next:end -->
