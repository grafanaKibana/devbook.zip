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
| Trace one immutable artifact through build, verification and promotion and distinguish continuous delivery from continuous deployment gates | CI/CD and artifact promotion | artifact-promotion | Fundamentals | new |  |  | [[Home/DevOps/CI CD tools]] |  | v1:6cd77a4f413f2c4879d1901449fc6cd58e50f551fc3338f58b70f24b5edf881b/1 | |
| Distinguish an image from a container and identify host, architecture, configuration, persistence and security inputs left outside image portability | Docker images and containers | container-boundary | Fundamentals | new |  |  | [[Home/DevOps/Docker]] |  | v1:6fcc7f00f290277ca12c04e5da30073adc19f6f312f1df964510e91923d3d983/0 | |
| Trace declared workload state through controllers, scheduling, Pods and ready Service endpoints and identify application versus platform ownership | Kubernetes | kubernetes-reconcile | Fundamentals | new |  | container-boundary | [[Home/DevOps/Kubernetes]] |  | v1:d1103ac586cc1aa1249c0ccc64d4d1a1f4de130a77d84dd84174a863a6756ce0/1 | |
| Review a desired-state plan before apply and explain state, drift, destructive replacement and competing-controller risks | Infrastructure as code | iac-state | Fundamentals | new |  |  | [[Home/DevOps/Infrastructure as Code]] |  | v1:da6599db953f0845b510cd3a4576916b01edfbb8c33b5fca879a5d92dd9f838b/0 | |
| Choose metrics, logs and traces for a failure question and preserve bounded cardinality, context propagation and useful alert evidence | Observability | telemetry-causality | Fundamentals | new |  |  | [[Home/DevOps/Observability]] |  | v1:34ca979a18a96def63d91a8e33b68078317cfd3cdf4878911a8e78cf2528b7b0/2 | |
| Choose rollout traffic switching and rollback from failure blast radius, observability, compatibility and infrastructure cost | Deployment strategies and rollback | deployment-strategy | Deployment Strategies | new |  | artifact-promotion, telemetry-causality | [[Home/DevOps/Deployment Strategies/Deployment Strategies]] |  |  v1:3c43c4a712bdda211d1efd11c0e0389cecac33f9205d599bd426e8399334b354/3 |  |
| Trace working-tree edits through the index, commits and remote refs and choose restore, reset or revert using the captured-history recovery boundary | Git fundamentals | git-fundamentals | Version Control Systems | new |  |  | [[Home/DevOps/Version Control Systems/Version Control Systems]] |  | v1:fe03ba0cf0adf13cfbaffda734bc1206e9d8de5a594f68e97a513de6af7140c3/0 |  |
| Choose a branching strategy from release topology and review latency and explain the integration and history costs of merge and rebase | Branching strategies, merge and rebase | integration-policy | Version Control Systems | new |  | git-fundamentals | [[Home/DevOps/Version Control Systems/Branching Stratagies]] |  | v1:b6a21515fc0a4b6a1886215275d904f7c62bf4650cfe29ca0653f0f17a482ed3/0 | |
