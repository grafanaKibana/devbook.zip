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
| Choose IaaS, CaaS, PaaS, FaaS or SaaS from required control and identify the application responsibilities a managed service still leaves | Cloud service models and shared responsibility | service-responsibility | Fundamentals | new |  |  | [[Home/Cloud/IaaS, PaaS, SaaS, CaaS]] |  | v1:0838f6006b0dcc18bc2d86df7d7c823540a0ab3bb0a49b601af4111d944a5a74/0 | 2026-11-16 |
| Compare provider capabilities by workload, identity, regions, quotas and failure contracts rather than treating similarly named services as interchangeable | Cloud providers and workload fit | provider-fit | Fundamentals | new |  | service-responsibility | [[Home/Cloud/Providers]] |  | v1:9142de49e050a760e3e37b9e24746f4a001a0eb63b6af75ccaf98202dfef330c/0 | 2026-11-16 |
| Attribute cloud consumption to successful workload output and choose caching, batching, retention or capacity changes within quality and reliability guardrails | Cloud cost management | unit-economics | Fundamentals | new |  | service-responsibility | [[Home/Cloud/Cloud Cost Management]] |  | v1:3a5cd9be11aa0979539427d31d74d22ce33c15d9e46f6c6c364d7158bf2cd020/0 | 2026-11-16 |
| Set RPO and RTO for a user flow and trace restore, replay, dependency and traffic-switch work in a tested recovery strategy | Disaster recovery: RPO and RTO | recovery-proof | Fundamentals | new |  | service-responsibility | [[Home/Cloud/Disaster Recovery]] |  | v1:10c59d6a5d1df456bb9c377e15766df3903592c43704d0b1b4e5426889591cc7/0 | 2026-11-16 |
