---
publish: true
created: 2026-07-16T16:58:44.791Z
modified: 2026-07-16T16:58:44.791Z
published: 2026-07-16T16:58:44.791Z
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: The conditional platform capabilities required to operate independently deployable services.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

[[Microservices]] create operational boundaries as well as code boundaries. Each independently deployable service needs ownership, delivery, observability, configuration, and failure controls. Docker and Kubernetes are common implementation choices, not requirements: virtual machines, managed application platforms, and serverless containers can preserve the same deployment independence.

## Minimum operating contract

For each service record:

- owner, escalation path, and supported API/event versions;
- build artifact, deployment and rollback procedure;
- service-level indicators and alert thresholds;
- logs, metrics, traces, and correlation across synchronous and asynchronous calls;
- request deadlines, bounded retries, circuit breaking, and load shedding;
- configuration and secret delivery with audit history;
- datastore ownership, migration order, backup, and restore evidence.

A platform should make this the default path, but one topology does not fit every service. A low-volume internal API can run on App Service; a partitioned consumer fleet may benefit from Kubernetes; a scheduled job can run as a managed container task.

## Kubernetes example

Kubernetes gives declarative rollout, service discovery, probes, and resource controls. It does not automatically provide correct service boundaries, retry budgets, or database migrations. For an Orders deployment, set resource requests from measured use, a disruption budget from required availability, readiness from instance-specific serving ability, and a rollout that stops when error rate or latency breaches the service objective.

Avoid making every shared dependency a readiness check. A common database outage can remove all pods and leave the load balancer with no endpoint. Keep dependency health observable and use a routing probe only when sending traffic elsewhere can improve the outcome.

## References

- [.NET microservices architecture](https://learn.microsoft.com/dotnet/architecture/microservices/) — Microsoft guidance for service boundaries, containers, resilience, and operations.
- [Kubernetes deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) — primary rollout, scaling, and revision behavior.
- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/) — official cross-service trace-context model.
- [Google SRE service-level objectives](https://sre.google/sre-book/service-level-objectives/) — primary SLI/SLO and error-budget operating model.
