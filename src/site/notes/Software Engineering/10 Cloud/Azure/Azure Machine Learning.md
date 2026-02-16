---
{"dg-publish":true,"permalink":"/software-engineering/10-cloud/azure/azure-machine-learning/","noteIcon":"1"}
---


# Intro

Azure Machine Learning (Azure ML) is the service for training, tracking, evaluating, registering, and deploying ML models with enterprise MLOps primitives (workspaces, jobs/pipelines, registries, endpoints, monitoring).

## Deeper Explanation

Core building blocks (SDK v2 / CLI v2 terminology):

- Workspace: the system of record for assets and lineage.
- Compute: clusters/instances used to execute jobs.
- Jobs + pipelines: reproducible execution units and multi-step workflows.
- Model registry: versioned promotion boundary across environments.
- Online endpoints: managed deployment surface for real-time inference.
- Monitoring: drift, data quality, and (when available) performance monitoring.

## Links

- [How Azure Machine Learning works: resources and assets](https://learn.microsoft.com/azure/machine-learning/concept-azure-machine-learning-v2?view=azureml-api-2)
- [Create an Azure Machine Learning compute cluster](https://learn.microsoft.com/azure/machine-learning/how-to-create-attach-compute-cluster?view=azureml-api-2)
- [Deploy and score a model by using an online endpoint](https://learn.microsoft.com/azure/machine-learning/how-to-deploy-online-endpoints?view=azureml-api-2)

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
> - [[Software Engineering/10 Cloud/Azure/Azure OpenAI\|Azure OpenAI]]
> - [[Software Engineering/10 Cloud/Azure/Azure Storage\|Azure Storage]]
<!-- whats-next:end -->
