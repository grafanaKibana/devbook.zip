---
publish: true
created: 2026-08-20T20:41:15.510Z
modified: 2026-08-20T20:41:15.510Z
published: 2026-08-20T20:41:15.510Z
topic:
  - Cloud
subtopic: []
summary: Choosing how much runtime control the application needs and which responsibilities can move to a provider.
level:
  - "2"
priority: High
status: Ready to Repeat
---

Cloud service models describe where provider responsibility ends and application responsibility begins. NIST defines IaaS, PaaS, and SaaS. CaaS and FaaS are useful industry labels for narrower managed-platform shapes, but their exact responsibility boundary varies by product.

# Responsibility and Control

| Model | Provider manages | Application team manages | Use when |
| --- | --- | --- | --- |
| IaaS | Physical infrastructure and virtualization | Guest OS, runtime, application, identity, data, capacity, and recovery | The workload needs a specific OS, host access, appliance, specialized machine, or migration boundary |
| CaaS | Infrastructure and some container orchestration; managed Kubernetes usually includes the control plane | Images, workloads, cluster policy, application data, and varying node/network duties | Kubernetes APIs or a shared container scheduler are explicit requirements |
| PaaS | Hosts, OS, and a supported application platform | Code, data, identity, configuration, scaling choices, and runtime compatibility | A web service or API fits a supported runtime and deployment contract |
| FaaS | Event-bound execution environment and platform scaling | Function code, data, identity, trigger semantics, limits, and idempotency | Work is bounded, event-driven, and compatible with the plan's latency and duration limits |
| SaaS | The application and underlying platform | Tenant configuration, identities, data governance, integrations, and endpoint policy | Operating the capability creates no useful product differentiation |

Managed does not mean responsibility-free. Moving up the table removes lower-level infrastructure work, but data, access, configuration, dependency behavior, and application recovery remain.

# Selection Rule

Use the highest managed layer that satisfies the real constraints:

1. Choose **SaaS** for commodity business capability.
2. Choose **PaaS** as the default for a new application that fits the supported runtime, networking, and scaling model.
3. Choose **FaaS** for bounded event handlers where trigger delivery, cold-start behavior, duration, and concurrency limits fit.
4. Choose **CaaS** when the system genuinely needs Kubernetes APIs, scheduling controls, or a shared container platform.
5. Choose **IaaS** when host-level control is itself a requirement.

Familiarity alone is not a host-level requirement. Starting with VMs or Kubernetes for an ordinary web API adds patching, capacity, policy, and recovery surfaces that a managed application platform may already solve.

# Developer and Architect Consequences

- **Runtime constraints:** managed platforms restrict supported versions, process lifetime, filesystem behavior, networking, or background work. Confirm these before adoption.
- **Failure semantics:** serverless and messaging integrations can retry or redeliver. Externally visible side effects need idempotency regardless of who operates the runtime.
- **Portability:** a container standardizes the executable and filesystem, not identity, networking, storage, messaging, or database semantics.
- **Upgrade ownership:** the provider may patch hosts, but the team still tracks runtime retirement, SDK compatibility, schema migration, and application dependencies.
- **Cost shape:** less infrastructure work can come with per-request pricing, minimum instances, reserved capacity, data transfer, or managed-service premiums. Compare the complete workload rather than one SKU.

# References

- [Azure shared responsibility in the cloud](https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility)
