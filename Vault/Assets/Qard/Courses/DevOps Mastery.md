---
topic: [DevOps]
subtopic: []
level: ["4"]
priority: High
status: Creation
publish: false
tags: [qard-internal, MetricsIgnore]
qard-mastery: "DevOps"
---

Follow a change from integration policy to one verified release artifact, then trace its runtime and infrastructure ownership and emitted operational evidence. Containers and delivery are foundations for the later Cloud course; no source or review status is changed.

This is course 8 of the suggested vault route. Learn courses order capabilities; the existing first-pass plans track card exposure, and Today retains the material actually studied. Course switching is manual.

All mapped topics are included in the learning flow, including source notes marked Creation or Not-Started. Previously planned objectives are new and follow the same prerequisite route as other unassessed objectives. Source-note lifecycle statuses remain unchanged; assessment evidence still comes from actual study.

Start lessons and checks from this course's objectives. The record lives outside Home, so folder-based automatic association and Update objectives do not map the source tree. Maintain its explicit objective/source links directly. Prerequisites guide the frontier; Qard still permits manually teaching another objective.

Setup assigns no due dates or evidence. Teaching and assessment write subsequent evidence; source-note lifecycle statuses remain owner-managed. Draft source status does not place an objective on hold.

# Learning Objectives

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Source revision | Source updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Choose a branching strategy from release topology and review latency and explain the integration and history costs of merge and rebase | Integration policy | integration-policy | 01 Integration and delivery | new |  |  | [[Home/DevOps/Version Control Systems/Branching Stratagies]] |  | v1:b6a21515fc0a4b6a1886215275d904f7c62bf4650cfe29ca0653f0f17a482ed3/0 | |
| Trace one immutable artifact through build, verification and promotion and distinguish continuous delivery from continuous deployment gates | Artifact promotion | artifact-promotion | 01 Integration and delivery | new |  | integration-policy | [[Home/DevOps/CI CD tools]] |  | v1:6cd77a4f413f2c4879d1901449fc6cd58e50f551fc3338f58b70f24b5edf881b/1 | |
| Distinguish an image from a container and identify host, architecture, configuration, persistence and security inputs left outside image portability | Container runtime boundary | container-boundary | 02 Runtime and orchestration | new |  | artifact-promotion | [[Home/DevOps/Docker]] |  | v1:6fcc7f00f290277ca12c04e5da30073adc19f6f312f1df964510e91923d3d983/0 | |
| Trace declared workload state through controllers, scheduling, Pods and ready Service endpoints and identify application versus platform ownership | Kubernetes reconciliation | kubernetes-reconcile | 02 Runtime and orchestration | new |  | container-boundary | [[Home/DevOps/Kubernetes]] |  | v1:d1103ac586cc1aa1249c0ccc64d4d1a1f4de130a77d84dd84174a863a6756ce0/1 | |
| Review a desired-state plan before apply and explain state, drift, destructive replacement and competing-controller risks | Infrastructure state and drift | iac-state | 03 Infrastructure and operational evidence | new |  | artifact-promotion | [[Home/DevOps/Infrastructure as Code]] |  | v1:da6599db953f0845b510cd3a4576916b01edfbb8c33b5fca879a5d92dd9f838b/0 | |
| Choose metrics, logs and traces for a failure question and preserve bounded cardinality, context propagation and useful alert evidence | Operational evidence | telemetry-causality | 03 Infrastructure and operational evidence | new |  | container-boundary | [[Home/DevOps/Observability]] |  | v1:34ca979a18a96def63d91a8e33b68078317cfd3cdf4878911a8e78cf2528b7b0/2 | |
