---
{"dg-publish":true,"permalink":"/software-engineering/09-dev-ops/kubernetes/"}
---


# Kubernetes

Kubernetes (K8s) is a container orchestration platform that automates deployment, scaling, and self-healing of containerized workloads. It is the production standard for running Docker containers at scale. The core value proposition: declare the desired state of your system, and Kubernetes continuously reconciles reality to match it.

## Core Concepts

**Pod**: The smallest deployable unit. A pod wraps one or more containers that share a network namespace and storage. In practice, most pods contain a single container.

**Deployment**: Manages a set of identical pods. Handles rolling updates, rollbacks, and scaling. You declare the desired replica count and image; Kubernetes ensures that many pods are running.

**Service**: A stable network endpoint for a set of pods. Pods are ephemeral (they get new IPs when restarted); a Service provides a consistent DNS name and IP that load-balances across healthy pods.

**Ingress**: Routes external HTTP/HTTPS traffic to Services based on host and path rules. Requires an Ingress controller (nginx, Traefik, Azure Application Gateway).

**ConfigMap / Secret**: Externalize configuration from container images. ConfigMaps for non-sensitive config; Secrets for credentials (base64-encoded, not encrypted by default — use sealed secrets or Azure Key Vault for production).

**Namespace**: Virtual cluster within a cluster. Use namespaces to isolate environments (dev, staging, prod) or teams.

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
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 15
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

## Pitfalls

**Missing resource limits**: Without `resources.limits`, a single misbehaving pod can consume all node CPU/memory and starve other pods. Always set both `requests` (scheduling hint) and `limits` (hard cap). Requests too low = pod gets scheduled on an overloaded node. Limits too low = pod gets OOMKilled under load.

**Liveness probe misconfiguration**: A liveness probe that fails during startup causes Kubernetes to restart the pod in a loop (CrashLoopBackOff). Fix: set `initialDelaySeconds` to be longer than your app's startup time, or use a `startupProbe` for slow-starting apps.

**Secrets are not encrypted at rest by default**: Kubernetes Secrets are base64-encoded, not encrypted. Anyone with etcd access can read them. Fix: enable etcd encryption at rest, or use external secret management (Azure Key Vault with the Secrets Store CSI driver, or Sealed Secrets).

**No pod disruption budget**: During node maintenance, Kubernetes may evict all pods of a Deployment simultaneously, causing downtime. Fix: define a `PodDisruptionBudget` to ensure at least N pods remain available during voluntary disruptions.

**Ignoring namespace isolation**: Running all workloads in the `default` namespace makes it impossible to apply different RBAC policies, resource quotas, or network policies per team. Fix: use namespaces from day one.

## Tradeoffs

| | Managed K8s (AKS/EKS/GKE) | Self-hosted K8s | Docker Compose |
|---|---|---|---|
| Control plane | Managed by cloud | You manage | N/A |
| Upgrade effort | Low | High | N/A |
| Cost | Higher (managed fee) | Lower (infra only) | Lowest |
| Scale | Multi-node, auto-scale | Multi-node | Single host |
| Production fit | Yes | Yes (with expertise) | No |

**Managed vs self-hosted**: Use managed K8s (AKS, EKS, GKE) unless you have a specific reason to self-host. The control plane management overhead (etcd backups, API server upgrades, certificate rotation) is significant. Managed services handle this for ~$0.10/hour.

**K8s vs Docker Compose**: Compose is for local development and simple single-host deployments. K8s is for production multi-node workloads that need rolling updates, auto-scaling, and self-healing. Do not use Compose in production for anything that needs HA.

## Questions

> [!QUESTION]- What is the difference between a Pod, Deployment, and Service?
> - Pod: the smallest unit; wraps one or more containers sharing a network namespace.
> - Deployment: manages a set of identical pods; handles rolling updates and scaling.
> - Service: stable network endpoint (DNS name + IP) that load-balances across pods.
> - Pods are ephemeral (new IP on restart); Services provide stable addressing.
> - Tradeoff: Deployments add a layer of abstraction over pods, but that abstraction enables zero-downtime updates.

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
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering\|Software Engineering]]
>
> **Topics**
> - [[Software Engineering/09 DevOps/Deployment Strategies/Deployment Strategies\|Deployment Strategies]]
> - [[Software Engineering/09 DevOps/Version Control Systems/Version Control Systems\|Version Control Systems]]
>
> **Pages**
> - [[Software Engineering/09 DevOps/CI CD tools\|CI CD tools]]
> - [[Software Engineering/09 DevOps/Docker\|Docker]]
> - [[Software Engineering/09 DevOps/Observability\|Observability]]
<!-- whats-next:end -->
