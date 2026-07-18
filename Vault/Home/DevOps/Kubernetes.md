---
topic:
  - DevOps
subtopic: []
summary: "Orchestrates containers by reconciling reality to a declared desired state."
level:
  - "2"
priority: High
status: Ready to Repeat

publish: true
---

# Intro

Kubernetes (K8s) is a container orchestration platform that automates deployment, scaling, and self-healing of containerized workloads built from OCI-compatible images. Kubelets ask a Container Runtime Interface (CRI)-compatible runtime, such as containerd or CRI-O, to create containers; Kubernetes does not require Docker Engine. The core value proposition: declare the desired state of your system, and Kubernetes continuously reconciles reality to match it.

## Core Concepts

**Pod**: The smallest deployable unit. A pod wraps one or more containers that share a network namespace and storage. In practice, most pods contain a single container.

**Deployment**: Manages a set of identical pods. Handles rolling updates, rollbacks, and scaling. You declare the desired replica count and image; Kubernetes ensures that many pods are running.

**Service**: A stable network endpoint for a set of pods. Pods are ephemeral (they get new IPs when restarted); a Service provides a consistent DNS name and IP that load-balances across healthy pods.

**Ingress**: Routes external HTTP/HTTPS traffic to Services based on host and path rules. Requires an Ingress controller (nginx, Traefik, Azure Application Gateway).

**ConfigMap / Secret**: Externalize configuration from container images. ConfigMaps for non-sensitive config; Secrets for credentials (base64-encoded, not encrypted by default — use sealed secrets or Azure Key Vault for production).

**Namespace**: A scope for names and policy attachment, not a hard isolation boundary. Use namespaces to separate environments or teams, then enforce the boundary with RBAC, NetworkPolicy, ResourceQuota or LimitRange, admission policy, and service-account and secret controls. Use separate clusters when workloads cross a stronger trust boundary.

## Deploying a .NET App

A minimal Kubernetes deployment for a .NET 8 API:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapi
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapi
  template:
    metadata:
      labels:
        app: myapi
    spec:
      containers:
      - name: myapi
        image: myregistry.azurecr.io/myapi:1.2.3
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          periodSeconds: 5
        startupProbe:
          httpGet:
            path: /health/startup
            port: 8080
          periodSeconds: 5
          failureThreshold: 30
        env:
        - name: ConnectionStrings__Default
          valueFrom:
            secretKeyRef:
              name: myapi-secrets
              key: connection-string
---
apiVersion: v1
kind: Service
metadata:
  name: myapi-svc
  namespace: production
spec:
  selector:
    app: myapi
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

## Application and Controller Patterns

| Pattern | Kubernetes mechanism | Ownership and cost |
| --- | --- | --- |
| Init container | Runs to completion before app containers | Good for bounded setup; a failing init blocks every restart |
| Sidecar | Shares a Pod lifecycle and network with the app | Use only when co-location is required; it consumes resources per replica |
| Adapter or ambassador | Translates telemetry or network protocol beside the app | Simplifies the app but adds another failure path |
| Deployment controller | Reconciles stateless replica count and rollout | Default for replaceable processes |
| StatefulSet | Stable identity and ordered lifecycle | Does not make the database itself correct or highly available |
| Job or CronJob | Run-to-completion work | Requires idempotency because retries can repeat work |
| Operator | Custom controller reconciles domain state | Worth it only when recurring operational knowledge justifies API and controller maintenance |

The application still owns graceful shutdown, readiness, idempotency, resource behavior, and data correctness. Kubernetes owns declared scheduling and reconciliation. For example, a retrying Job can execute a payment twice unless the handler supplies an idempotency key; no controller pattern repairs that application contract.

![[System Design 101/ff0fd16f200a584a387f01419836e0a53423563e36655d15a092756d679a1a64.png]]

## Service Exposure

`ClusterIP` is the default: a stable virtual IP and DNS name reachable inside the cluster, with EndpointSlices selecting ready Pods. `NodePort` exposes a port on every node and is usually an implementation detail beneath another load balancer. `LoadBalancer` asks an integration to provision an external balancer. `ExternalName` returns a DNS CNAME and creates no proxy or endpoints.

Use ClusterIP for service-to-service traffic. Use LoadBalancer for a small number of direct L4 entry points. Use Ingress or Gateway API when many HTTP services need shared TLS, host/path routing, and policy. Check health-check behavior, source-IP preservation, network boundaries, and provider cost; a Service type alone does not define those semantics. ExternalName can surprise clients that validate the original hostname or do not handle CNAMEs as expected.

![[System Design 101/fe9b9f07a89e5640074e47e05dc2d3600a5ab8406b147a7934590a0f326d7af7.png]]

> [!WARNING] Non-normative source visual
> The `ExternalName` panel is incorrect: an `ExternalName` Service returns a DNS CNAME and has no selector, EndpointSlices, or data-plane proxy to Pods. The other panels are conceptual summaries; provider integrations still determine the external load-balancer path.

## Pitfalls

**Unmeasured resource policy**: Requests are scheduler reservations used for placement and capacity planning, not hints. Set CPU and memory requests from observed demand plus headroom. A CPU limit enforces a quota by throttling; a memory limit bounds usage by making the container eligible for an OOM kill. Use limits deliberately for fairness and containment—blanket CPU limits can create latency through throttling—and enforce team defaults with `LimitRange` or policy where needed.

**Probe misconfiguration**: A liveness probe that fails during startup restarts the container, while a readiness probe that reports healthy too early sends traffic before dependencies are ready. Use a `startupProbe` to gate liveness and readiness during slow initialization, a readiness probe to control Service endpoints, and a liveness probe only for states that require a restart. Keep readiness independent of optional downstreams that would otherwise remove every replica during their outage.

**Secrets are not encrypted at rest by default**: Kubernetes Secrets are base64-encoded, not encrypted. Anyone with etcd access can read them. Fix: enable etcd encryption at rest, or use external secret management (Azure Key Vault with the Secrets Store CSI driver, or Sealed Secrets).

**No pod disruption budget**: During node maintenance, Kubernetes may evict all pods of a Deployment simultaneously, causing downtime. Fix: define a `PodDisruptionBudget` to ensure at least N pods remain available during voluntary disruptions.

**Treating namespaces as isolation**: Namespaces let you attach different RBAC rules, resource quotas, and network policies, but they enforce none of those controls by themselves. Create namespaces deliberately, then apply and test the policies that establish the intended boundary.

## Tradeoffs

| | Managed K8s (AKS/EKS/GKE) | Self-hosted K8s | Docker Compose |
|---|---|---|---|
| Control plane | Managed by cloud | You manage | N/A |
| Upgrade effort | Low | High | N/A |
| Control-plane cost | Provider fee or plan varies; workers, networking, storage, and operations remain | Control-plane infrastructure plus engineering and on-call work | VM and runtime costs plus application operations |
| Scale | Multi-node, auto-scale | Multi-node | Single host |
| Production fit | Multi-node workloads with platform operations | Multi-node workloads with platform expertise | Bounded single-host workloads without HA requirements |

**Managed vs self-hosted**: Use managed K8s unless regulatory, edge, platform-control, or provider constraints justify self-hosting. Compare current provider pricing with worker, network, storage, upgrade, support, and on-call costs. A self-hosted control plane may avoid a provider fee while costing more in infrastructure and operator time; there is no universal hourly price.

**K8s vs Docker Compose**: Compose is a good fit for local development and can run bounded single-host production workloads when host failure and manual rollout are acceptable. Kubernetes fits multi-node workloads that need scheduling, controlled rollout, autoscaling, and reconciliation. Compose does not supply high availability; Kubernetes adds mechanisms for it but still requires sound application probes, capacity, disruption policy, and failure-domain design.

## Questions

> [!QUESTION]- What is the difference between a Pod, Deployment, and Service?
> - Pod: the smallest unit; wraps one or more containers sharing a network namespace.
> - Deployment: manages a set of identical pods; handles rolling updates and scaling.
> - Service: stable network endpoint (DNS name + IP) that load-balances across pods.
> - Pods are ephemeral (new IP on restart); Services provide stable addressing.
> - A Deployment supports controlled rolling replacement, but does not guarantee zero downtime. Readiness, graceful shutdown, compatible versions, disruption budgets, and enough spare capacity must all hold.

> [!QUESTION]- Why do Kubernetes Secrets need additional protection beyond base64 encoding?
> - Base64 is encoding, not encryption — anyone with etcd access can decode secrets trivially.
> - By default, etcd stores secrets in plaintext (base64 is just a transport format).
> - Mitigations: enable etcd encryption at rest, use Sealed Secrets (encrypted in git), or use Azure Key Vault with the Secrets Store CSI driver.
> - Tradeoff: external secret management adds operational complexity but is required for regulated workloads.

> [!QUESTION]- What causes CrashLoopBackOff and how do you debug it?
> - CrashLoopBackOff means the container starts, crashes, and Kubernetes keeps restarting it with exponential backoff.
> - Common causes: app crashes on startup (missing config, DB connection failure), liveness probe failing before app is ready, OOMKilled (memory limit too low).
> - Debug: `kubectl logs <pod> --previous` (logs from the crashed instance), `kubectl describe pod <pod>` (events and exit codes), `kubectl exec -it <pod> -- /bin/sh` (if the container starts briefly).
> - Tradeoff: liveness probes are essential for self-healing but misconfigured probes cause the problem they are meant to solve.

## References

- [Kubernetes documentation](https://kubernetes.io/docs/home/) — official K8s docs; covers all concepts, API reference, and tutorials
- [AKS documentation](https://learn.microsoft.com/en-us/azure/aks/) — Azure Kubernetes Service guide; covers cluster creation, scaling, monitoring, and .NET deployment
- [Kubernetes Patterns](https://k8spatterns.io/) — practitioner patterns for K8s workloads; covers sidecar, ambassador, adapter, and lifecycle patterns
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/security-checklist/) — official security checklist covering RBAC, network policies, and secret management
- [Kubernetes workload management](https://kubernetes.io/docs/concepts/workloads/controllers/) — official controller lifecycle and reconciliation behavior.
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/) — official ClusterIP, NodePort, LoadBalancer, ExternalName, endpoint, and source-IP semantics.
- [Kubernetes probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/) — primary liveness, readiness, and startup gating semantics.
- [Gateway API](https://gateway-api.sigs.k8s.io/) — Kubernetes SIG project for role-oriented traffic configuration.
- [ByteByteGo: Kubernetes patterns](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-10-k8s-design-patterns.md) — source contribution for the application/controller pattern map.
- [ByteByteGo: Kubernetes Service types](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-4-kubernetes-service-types-in-one-diagram.md) — source contribution for the service-exposure selector.
