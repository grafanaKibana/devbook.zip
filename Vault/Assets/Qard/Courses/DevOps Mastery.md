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

The course has one starting point: the **Intro** of Fundamentals. Each group starts with an **Intro** objective for its hub note, and every other objective in the group opens only after it.

- **Fundamentals:** the Intro opens Docker (then Kubernetes), CI/CD tools (then deployment strategies), observability, and infrastructure as code. Each objective has one prerequisite, the topic it builds on most directly.
- **Version Control Systems** opens from the Fundamentals Intro: its Intro covers Git, then branching strategies.

Assessment states, due dates and evidence come from study.

# Learning Objectives

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Source revision | Source updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Distinguish DevOps, SRE and platform engineering by what each supplies while the application team stays accountable, separate build, release and run in the deployment contract, and place security checks where their evidence can still block or contain a release | Intro | delivery-contract | Fundamentals | new |  |  | [[Home/DevOps/DevOps]] |  |  v1:3b76fd691a95dc1a751c840b3686bbf0ca99b9b7c853f55c158bf495f4552c42/0 |  |
| Distinguish an image from a container and identify host, architecture, configuration, persistence and security inputs left outside image portability | Docker | container-boundary | Fundamentals | new |  | delivery-contract | [[Home/DevOps/Docker]] |  | v1:fb6530e295122d8c59a58574328a902beeefb2927b43a0fcc7331d746fa47ae1/0 | 2026-11-16 |
| Trace declared workload state through controllers, scheduling, Pods and ready Service endpoints and identify application versus platform ownership | Kubernetes | kubernetes-reconcile | Fundamentals | new |  | container-boundary | [[Home/DevOps/Kubernetes]] |  | v1:9c06cdbcb098ef9de5690cf9ba0ec1eb033464c97ddc0b5834c8965167014262/1 | 2026-11-16 |
| Choose metrics, logs and traces for a failure question and preserve bounded cardinality, context propagation and useful alert evidence | Observability | telemetry-causality | Fundamentals | new |  | delivery-contract | [[Home/DevOps/Observability]] |  | v1:3c2904d95105cd0a03347cce4473c721f9669b06f14fccb56b022b94bc806a6c/2 | 2026-11-16 |
| Trace one immutable artifact through build, verification and promotion and distinguish continuous delivery from continuous deployment gates | CI CD tools | artifact-promotion | Fundamentals | new |  | delivery-contract | [[Home/DevOps/CI CD tools]] |  | v1:7de0f4c3a8ea64025f3ae4535d41b77bf077ee6c92d8606b4726cfc4ec0b0bc2/1 | 2026-11-16 |
| Choose recreate, rolling, blue-green or canary from how the new artifact replaces the old one, how much traffic a failure can reach, the capacity and telemetry each needs, and whether version and data compatibility keeps rollback real | Deployment Strategies | deployment-strategy | Fundamentals | new |  | artifact-promotion, telemetry-causality | [[Home/DevOps/Deployment Strategies/Deployment Strategies]] |  |  v1:68b54ee23e0be9335af6facce68c5955153c6c21f23fb4b7503b81f6d24d88ad/3 |  2026-11-16 |
| Review a desired-state plan before apply and explain state, drift, destructive replacement and competing-controller risks | Infrastructure as Code | iac-state | Fundamentals | new |  | delivery-contract | [[Home/DevOps/Infrastructure as Code]] |  | v1:0a4b07d0a2ebae6eb43288bec5d10c55988c32e281b86aba4b3cfe51645264a4/0 | 2026-11-16 |
| Trace working-tree edits through the index, commits and remote refs, choose restore, reset or revert from the captured-history recovery boundary, and separate Git semantics from hosting policy, repository strategy and the SemVer release contract | Intro | git-fundamentals | Version Control Systems | new |  | delivery-contract | [[Home/DevOps/Version Control Systems/Version Control Systems]] |  | v1:03e7da1104b28ac58057757363fbaeffc7bea7e96acd335bbf08e2e299c140dd/0 |  2026-11-16 |
| Choose a branching strategy from release topology and review latency and explain the integration and history costs of merge and rebase | Branching Strategies | integration-policy | Version Control Systems | new |  | git-fundamentals | [[Home/DevOps/Version Control Systems/Branching Stratagies]] |  | v1:e3b9654ebcb232d185d61e5437ccaff8c75d8676406e6d2841eeed0b8b43fa32/0 | 2026-11-16 |
