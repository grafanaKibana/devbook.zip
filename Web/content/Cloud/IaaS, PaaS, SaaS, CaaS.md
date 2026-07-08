---
publish: true
created: 2026-07-08T16:14:17.507+03:00
modified: 2026-07-08T16:14:17.507+03:00
published: 2026-07-08T16:14:17.507+03:00
topic:
  - Cloud
subtopic:
  - Cloud
level:
  - "2"
priority: High
status: Ready to Repeat
---

# IaaS, PaaS, SaaS, CaaS

Cloud service models define how much of the infrastructure stack the cloud provider manages versus how much you manage. Choosing the wrong model adds unnecessary operational burden (too much IaaS) or loses necessary control (too much SaaS). A startup running a CRUD web API on IaaS (Azure VMs) spent 20 hours/month on OS patching, security group updates, and scaling policies; migrating to PaaS (Azure App Service) eliminated that operational overhead entirely and reduced their monthly infrastructure cost from $1,200 to $400 because the auto-scaling was more efficient than their manually provisioned VMs.

## IaaS — Infrastructure as a Service

The provider manages physical hardware, networking, and virtualization. You manage: OS, runtime, middleware, application, and data.

**Examples**: AWS EC2, Azure VMs, Google Compute Engine.

**When to use**: Lift-and-shift of on-prem workloads, custom OS configurations, GPU instances for ML training, or when you need full control over the software stack. Highest operational overhead — you patch the OS, manage security groups, and handle scaling.

## PaaS — Platform as a Service

The provider manages hardware, OS, runtime, and middleware. You manage: application code and data.

**Examples**: Azure App Service, AWS Elastic Beanstalk, Google App Engine, Azure Functions (serverless PaaS).

**When to use**: Web applications and APIs where you want to focus on code, not infrastructure. The provider handles OS patches, runtime upgrades, and auto-scaling. Tradeoff: less control over the runtime environment.

## SaaS — Software as a Service

The provider manages everything. You consume the software via a browser or API.

**Examples**: Microsoft 365, Salesforce, GitHub, Azure OpenAI (from the consumer perspective).

**When to use**: Business applications where you need the functionality, not the infrastructure. No deployment, no patching, no scaling — just configuration and usage.

## CaaS — Containers as a Service

The provider manages the container orchestration layer (Kubernetes control plane). You manage: container images, deployments, and application configuration.

**Examples**: Azure Kubernetes Service (AKS), AWS EKS, Google GKE, Azure Container Apps (higher-level CaaS).

**When to use**: Containerized workloads that need orchestration (scaling, rolling updates, self-healing) without managing the Kubernetes control plane. Sits between IaaS (raw VMs) and PaaS (managed app platform) in terms of control vs. convenience.

## FaaS — Functions as a Service (Serverless)

The provider manages _everything_ up to and including the runtime process — you supply only individual **functions** that run in response to events (an HTTP request, a queue message, a timer). There are **no servers to provision and no idle cost**: you're billed per invocation and per millisecond of execution, and the platform scales from zero to thousands of concurrent instances automatically.

**Examples**: AWS Lambda, Azure Functions, Google Cloud Functions, Cloudflare Workers.

**When to use**: event-driven, spiky, or low-baseline workloads — webhooks, scheduled jobs, glue between services, image/file processing. **The catch is the cold start** (a scaled-to-zero function pays startup latency on the first request) and a stateless, time-limited execution model that doesn't suit long-running or latency-critical request paths. "Serverless" is the umbrella term: FaaS plus fully-managed backing services (managed DBs, queues, auth) that also scale to zero — see [[Serverless Architecture]] for the design-level treatment.

## Comparison

| Model | You Manage | Provider Manages | Control | Operational Overhead |
|-------|-----------|-----------------|---------|---------------------|
| IaaS | OS, runtime, app, data | Hardware, network, virtualization | Highest | Highest |
| CaaS | Containers, app, data | Hardware, OS, K8s control plane | High | Medium |
| PaaS | App code, data | Hardware, OS, runtime, middleware | Medium | Low |
| FaaS | Function code, data | Everything incl. the runtime process & scaling | Low (event-bound) | Lowest (scales to zero) |
| SaaS | Configuration, data | Everything | Lowest | Lowest |

> [!TIP]
> The classic mnemonic is **"Pizza as a Service"**: cook at home (on-prem) → take-and-bake (IaaS) → delivery (PaaS) → dine-out (SaaS). Each step the provider supplies more of the stack so you focus on less plumbing and more product.

## Decision Rule

**Start with PaaS** (Azure App Service, AWS Elastic Beanstalk) for new web applications. It eliminates OS management while keeping full application control.

**Move to CaaS** (AKS, EKS, GKE) when you need: container portability, multi-service orchestration, or fine-grained resource control that PaaS cannot provide.

**Use IaaS** only when: you need a specific OS configuration, GPU instances, or are lifting-and-shifting an on-prem workload that cannot be containerized.

**Reach for FaaS** for event-driven, bursty, or low-baseline work (webhooks, scheduled jobs, light glue code) where scale-to-zero billing wins — provided cold-start latency and the stateless, time-limited model are acceptable.

**Use SaaS** for any business function where the software is a commodity (email, CRM, source control, CI/CD).

## Examples

**IaaS — Azure VM via Bicep (Infrastructure as Code)**

```bicep
resource vm 'Microsoft.Compute/virtualMachines@2023-03-01' = {
  name: 'my-vm'
  location: resourceGroup().location
  properties: {
    hardwareProfile: { vmSize: 'Standard_D2s_v3' }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: 'UbuntuServer'
        sku: '22_04-lts'
        version: 'latest'
      }
    }
    osProfile: {
      computerName: 'my-vm'
      adminUsername: 'azureuser'
      // You manage: OS patches, security groups, scaling
    }
  }
}
```

**PaaS — Azure App Service deployment config**

```yaml
# azure-pipelines.yml — deploy to Azure App Service (PaaS)
# Provider manages: OS, runtime, scaling, TLS certificates
- task: AzureWebApp@1
  inputs:
    azureSubscription: 'my-subscription'
    appType: 'webApp'
    appName: 'my-app-service'
    package: '$(Build.ArtifactStagingDirectory)/**/*.zip'
    # No OS config, no runtime version pinning — provider handles it
```

## Pitfalls

### Starting with IaaS When PaaS Suffices

**What goes wrong**: teams choose IaaS (raw VMs) for new web applications because it feels more familiar or 'more control.' They end up managing OS patches, security groups, and scaling policies — operational work that adds no business value. A 5-developer team running 12 VMs for a web application spent an average of 30 engineer-hours/month on infrastructure maintenance (security patches, disk space alerts, certificate renewals, failed health checks) — work that PaaS handles automatically.

**Mitigation**: default to PaaS (Azure App Service, AWS Elastic Beanstalk) for new web applications. Move to CaaS or IaaS only when you have a specific requirement that PaaS cannot meet (custom OS, GPU, container portability).

### Vendor Lock-In with PaaS

**What goes wrong**: PaaS services use provider-specific APIs and configuration. Migrating from Azure App Service to AWS Elastic Beanstalk requires significant rework.

**Mitigation**: containerize applications (Docker) before deploying to PaaS where possible. Containers are portable across CaaS providers (AKS, EKS, GKE) and reduce lock-in. Accept PaaS lock-in only when the operational savings justify it.

## Questions

> [!QUESTION]- What is the key operational difference between IaaS and PaaS?
> With IaaS you manage the OS, runtime, and middleware — you patch the OS, configure security groups, and handle scaling policies. With PaaS the provider manages all of that; you only deploy application code and data. The tradeoff: IaaS gives full control (custom OS, GPU, specific runtime versions); PaaS eliminates operational overhead at the cost of flexibility. Start with PaaS for new web applications; move to IaaS only when PaaS cannot meet your requirements.

> [!QUESTION]- Where does CaaS fit between IaaS and PaaS?
> CaaS (e.g., AKS, EKS) sits between them: you manage container images and deployments, but the provider manages the Kubernetes control plane and underlying OS. It gives more control than PaaS (you define your own container images, resource limits, and networking) while eliminating the Kubernetes control plane management burden of IaaS. Use CaaS when you need container portability or multi-service orchestration that PaaS cannot provide.

## References

- [NIST Cloud Computing Definition (SP 800-145)](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-145.pdf) — the authoritative NIST definition of cloud service models (IaaS, PaaS, SaaS) and deployment models
- [Azure — What are IaaS, PaaS, SaaS?](https://azure.microsoft.com/en-us/resources/cloud-computing-dictionary/what-is-iaas/) — Microsoft's explanation with Azure service examples for each model
- [Azure App Service overview](https://learn.microsoft.com/en-us/azure/app-service/overview) — PaaS reference: what the platform manages, supported runtimes, scaling options, and deployment slots
- [Azure Kubernetes Service (AKS) overview](https://learn.microsoft.com/en-us/azure/aks/intro-kubernetes) — CaaS reference: what AKS manages vs what you manage, and when to choose AKS over App Service
