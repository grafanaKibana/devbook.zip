---
topic: [DevOps]
subtopic: []
level: ["4"]
priority: High
status: New
publish: false
tags: [qard-internal, MetricsIgnore]
qard-mastery: "DevOps"
---

**Fundamentals** follows CI/CD from an immutable build artifact into Docker, Kubernetes, infrastructure as code, and observability. Docker, infrastructure plans, and telemetry also have independent starting objectives. **Deployment Strategies** then uses artifact identity and observability to choose rollout and rollback behavior.

**Version Control Systems** is a separate preparation route: Git fundamentals → branching strategies. Git fundamentals explains the working tree, index, commits, remote refs, and recovery boundary before the branching objective compares integration models. The recommended delivery route can use this preparation without requiring a particular branching strategy for every runtime topic.

Learning objectives follow the linked source material. Their prerequisite links identify the knowledge needed for each target; the suggested route is guidance rather than a requirement to finish every earlier group. Teach, checks, and reviews retain their existing assessment history. Source-note lifecycle status does not establish course mastery. Maintain the explicit source links in this internal course record.

# Learning Objectives

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Source revision | Source updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Trace one immutable artifact through build, verification and promotion and distinguish continuous delivery from continuous deployment gates | CI/CD and artifact promotion | artifact-promotion | Fundamentals | new |  |  | [[Home/DevOps/CI CD tools]] |  | v1:7de0f4c3a8ea64025f3ae4535d41b77bf077ee6c92d8606b4726cfc4ec0b0bc2/1 | 2026-11-16 |
| Distinguish an image from a container and identify host, architecture, configuration, persistence and security inputs left outside image portability | Docker images and containers | container-boundary | Fundamentals | new |  |  | [[Home/DevOps/Docker]] |  | v1:fb6530e295122d8c59a58574328a902beeefb2927b43a0fcc7331d746fa47ae1/0 | 2026-11-16 |
| Trace declared workload state through controllers, scheduling, Pods and ready Service endpoints and identify application versus platform ownership | Kubernetes | kubernetes-reconcile | Fundamentals | new |  | container-boundary | [[Home/DevOps/Kubernetes]] |  | v1:9c06cdbcb098ef9de5690cf9ba0ec1eb033464c97ddc0b5834c8965167014262/1 | 2026-11-16 |
| Review a desired-state plan before apply and explain state, drift, destructive replacement and competing-controller risks | Infrastructure as code | iac-state | Fundamentals | new |  |  | [[Home/DevOps/Infrastructure as Code]] |  | v1:0a4b07d0a2ebae6eb43288bec5d10c55988c32e281b86aba4b3cfe51645264a4/0 | 2026-11-16 |
| Choose metrics, logs and traces for a failure question and preserve bounded cardinality, context propagation and useful alert evidence | Observability | telemetry-causality | Fundamentals | new |  |  | [[Home/DevOps/Observability]] |  | v1:3c2904d95105cd0a03347cce4473c721f9669b06f14fccb56b022b94bc806a6c/2 | 2026-11-16 |
| Choose rollout traffic switching and rollback from failure blast radius, observability, compatibility and infrastructure cost | Deployment strategies and rollback | deployment-strategy | Deployment Strategies | new |  | artifact-promotion, telemetry-causality | [[Home/DevOps/Deployment Strategies/Deployment Strategies]] |  |  v1:68b54ee23e0be9335af6facce68c5955153c6c21f23fb4b7503b81f6d24d88ad/3 |  2026-11-16 |
| Trace working-tree edits through the index, commits and remote refs and choose restore, reset or revert using the captured-history recovery boundary | Git fundamentals | git-fundamentals | Version Control Systems | new |  |  | [[Home/DevOps/Version Control Systems/Version Control Systems]] |  | v1:03e7da1104b28ac58057757363fbaeffc7bea7e96acd335bbf08e2e299c140dd/0 |  2026-11-16 |
| Choose a branching strategy from release topology and review latency and explain the integration and history costs of merge and rebase | Branching strategies, merge and rebase | integration-policy | Version Control Systems | new |  | git-fundamentals | [[Home/DevOps/Version Control Systems/Branching Stratagies]] |  | v1:e3b9654ebcb232d185d61e5437ccaff8c75d8676406e6d2841eeed0b8b43fa32/0 | 2026-11-16 |
