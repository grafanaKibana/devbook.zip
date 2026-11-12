---
topic: [Cloud]
subtopic: []
level: ["4"]
priority: High
status: New
publish: false
tags: [qard-internal, MetricsIgnore]
qard-mastery: "Cloud"
---

**Fundamentals** covers cloud service models, provider selection, cost management, and disaster recovery.

Start with **Cloud service models and shared responsibility** to establish what the provider operates and what remains with the application team. Continue with provider fit, cost per useful result, and recovery planning. Cost and recovery each build directly on the service-responsibility model; neither requires completion of the other branch.

The rows provide a suggested reading order. Prerequisites govern the learning map, and assessment states, due dates, and evidence come from actual study.

# Learning Objectives

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Source revision | Source updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Choose IaaS, CaaS, PaaS, FaaS or SaaS from required control and identify the application responsibilities a managed service still leaves | Cloud service models and shared responsibility | service-responsibility | Fundamentals | new |  |  | [[Home/Cloud/IaaS, PaaS, SaaS, CaaS]] |  | v1:e7b7fdede7c6bff548fd4fa93f637a8f9d38ee23fb58a2e6b32e299e4efd2df9/0 | |
| Compare provider capabilities by workload, identity, regions, quotas and failure contracts rather than treating similarly named services as interchangeable | Cloud providers and workload fit | provider-fit | Fundamentals | new |  | service-responsibility | [[Home/Cloud/Providers]] |  | v1:372216bbdd957118de2905c811c7c998b6bdce6d1721f1283bdf0efa46625286/0 | |
| Attribute cloud consumption to successful workload output and choose caching, batching, retention or capacity changes within quality and reliability guardrails | Cloud cost management | unit-economics | Fundamentals | new |  | service-responsibility | [[Home/Cloud/Cloud Cost Management]] |  | v1:624d5aeeab0faf4a2e16a029b8b64414bd46324c78f90d647f9fa03ee93a686f/0 | |
| Set RPO and RTO for a user flow and trace restore, replay, dependency and traffic-switch work in a tested recovery strategy | Disaster recovery: RPO and RTO | recovery-proof | Fundamentals | new |  | service-responsibility | [[Home/Cloud/Disaster Recovery]] |  | v1:dc5912852628c273c9d8d87a4dd4423bf50e6e082868f26700f2ec98a8130a82/0 | |
