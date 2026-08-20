---
icon: cloudy
order: 90
color: "#3b82f6"
topic:
  - Cloud
subtopic: []
summary: "Using managed infrastructure without losing sight of the application responsibilities that remain."
tags: [FolderNote]
publish: true
status: Creation
priority: High
level:
  - "2"
---

Cloud computing turns compute, storage, networking, and higher-level platforms into services that can be provisioned on demand. It moves an application's operating boundary; it does not remove it. A managed database can eliminate host maintenance while leaving schema design, access control, consistency, recovery, service limits, and cost with the application team.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# What the Application Team Still Owns

The exact split changes by service model, but several responsibilities remain with the system regardless of provider:

- **Application behavior:** correctness, authorization, input validation, idempotency, and safe retries.
- **Data:** classification, access policy, retention, consistency, migration, backup requirements, and restore validation.
- **Service configuration:** region, capacity, scaling limits, network exposure, encryption settings, and dependency timeouts.
- **Resilience:** failure handling, recovery objectives, degraded modes, and dependency fallbacks.
- **Economics:** which code paths generate compute, requests, storage, transfer, and observability volume.

[[IaaS, PaaS, SaaS, CaaS]] shows how this boundary moves as the provider manages more of the stack.

# Architecture Questions Before Product Names

Start from the workload contract:

1. What kind of execution is required: request-driven service, event handler, batch job, container, or VM-bound process?
2. What data model, consistency, transaction scope, retention, and query patterns must the system support?
3. Which latency, throughput, availability, recovery point, and recovery time targets are real requirements?
4. Which identity, residency, compliance, and network boundaries are fixed by the organization?
5. Which provider-specific behaviors are worth accepting, and what would make migration necessary?

[[Providers]] introduces AWS, Azure, and Google Cloud without treating similarly named products as equivalent. Product documentation must still confirm regional support, quotas, lifecycle, failure semantics, and price before a service becomes an architecture assumption.

# Cloud Behavior Appears in Code

Cloud failures are ordinary distributed-system failures. APIs throttle, queues redeliver, functions retry, credentials expire, and regional dependencies become unavailable. The application therefore needs bounded retries, backpressure, idempotent side effects, observable dependency calls, and explicit timeout behavior. Managed services reduce infrastructure work but cannot infer these application semantics.

Cost and recovery also shape code. Chatty service boundaries multiply request and transfer charges. Unbounded telemetry or retention grows with traffic. A recovery design may require replayable events, compatible schemas, and writes that can be retried safely. [[Cloud Cost Management]] develops the cost side; [[Disaster Recovery]] connects RPO and RTO targets to application design.

# References

- [NIST SP 800-145: The NIST Definition of Cloud Computing](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-145.pdf)
