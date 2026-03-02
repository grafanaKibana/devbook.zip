---
topic:
  - Cloud
subtopic:
  - Cloud
level:
  - "2"
priority: High
status: Creation

dg-publish: true
---

# IaaS, PaaS, SaaS, CaaS

Cloud service models define how much of the infrastructure stack the cloud provider manages versus how much you manage. Choosing the wrong model adds unnecessary operational burden (too much IaaS) or loses necessary control (too much SaaS).

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

## Comparison

| Model | You Manage | Provider Manages | Control | Operational Overhead |
|-------|-----------|-----------------|---------|---------------------|
| IaaS | OS, runtime, app, data | Hardware, network, virtualization | Highest | Highest |
| CaaS | Containers, app, data | Hardware, OS, K8s control plane | High | Medium |
| PaaS | App code, data | Hardware, OS, runtime, middleware | Medium | Low |
| SaaS | Configuration, data | Everything | Lowest | Lowest |

## Decision Rule

**Start with PaaS** (Azure App Service, AWS Elastic Beanstalk) for new web applications. It eliminates OS management while keeping full application control.

**Move to CaaS** (AKS, EKS, GKE) when you need: container portability, multi-service orchestration, or fine-grained resource control that PaaS cannot provide.

**Use IaaS** only when: you need a specific OS configuration, GPU instances, or are lifting-and-shifting an on-prem workload that cannot be containerized.

**Use SaaS** for any business function where the software is a commodity (email, CRM, source control, CI/CD).

## Pitfalls

### Starting with IaaS When PaaS Suffices

**What goes wrong**: teams choose IaaS (raw VMs) for new web applications because it feels more familiar or 'more control.' They end up managing OS patches, security groups, and scaling policies — operational work that adds no business value.

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
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering|Software Engineering]]
>
> **Topics**
> - [[Software Engineering/10 Cloud/AWS/AWS|AWS]]
> - [[Software Engineering/10 Cloud/Azure/Azure|Azure]]
> - [[Software Engineering/10 Cloud/Google Cloud/Google Cloud|Google Cloud]]
<!-- whats-next:end -->
