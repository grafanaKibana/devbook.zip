---
publish: true
created: 2026-08-20T20:41:15.624Z
modified: 2026-08-20T20:41:15.625Z
published: 2026-08-20T20:41:15.625Z
topic:
  - DevOps
subtopic: []
summary: Orchestrates containers by reconciling reality to a declared desired state.
level:
  - "2"
priority: High
status: Ready to Repeat
---

Kubernetes orchestrates containerized workloads by reconciling declared API objects with observed cluster state. Controllers create or replace workload objects, the scheduler assigns Pods to nodes, and node agents start containers through a Container Runtime Interface (CRI)-compatible runtime. A stopped process is therefore replaced because the declared state still requires it, not because an operator reruns a command.

# Core Objects

- **Pod** — the scheduling and lifecycle unit for one or more containers that share networking and can share volumes. Pods are replaceable; their IPs and writable filesystems should not be treated as durable identity.
- **Deployment** — reconciles replaceable Pod replicas and rollout policy through ReplicaSets. Its replica count is a target, not a guarantee that every replica can serve traffic.
- **Service** — provides stable discovery and traffic distribution over selected ready Pods even as Pod addresses change.
- **ConfigMap** — carries non-sensitive configuration outside the image.
- **Secret** — carries sensitive values, but base64 encoding is not encryption. API access, encryption at rest, and the delivery path remain platform security decisions.

Ingress or Gateway resources can describe shared HTTP routing to Services, but a compatible controller must implement them. Declaring an API object does not create behavior unless a controller owns it.

# Reading a Manifest

This manifest shows the relationships developers commonly encounter; it omits production policy and platform-specific exposure:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapi
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
        - name: api
          image: registry.example/myapi:1.2.3
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
          envFrom:
            - configMapRef:
                name: myapi-config
            - secretRef:
                name: myapi-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: myapi
spec:
  selector:
    app: myapi
  ports:
    - port: 80
      targetPort: 8080
```

`apiVersion` and `kind` select the API contract. The Deployment's selector must match the Pod-template labels; otherwise it cannot own those Pods. `replicas` is the desired count. The image field selects the runtime artifact; a production release commonly records an immutable digest rather than trusting a movable tag.

Resource requests tell the scheduler what capacity a Pod requires. The readiness probe controls whether the Pod becomes a Service endpoint. It should represent the ability to accept traffic, not every optional dependency. `envFrom` injects values from separately managed configuration objects. The Service selector finds the same labels and maps stable port `80` to container port `8080`.

# Application and Platform Ownership

Kubernetes owns scheduling and reconciliation of declared objects. The application still owns graceful shutdown, readiness semantics, backward compatibility, idempotency, resource behavior, and data correctness. A retrying Job can execute work twice; Kubernetes cannot make a non-idempotent payment handler safe.

The platform owns cluster upgrades, capacity, identity, network and admission policy, secret protection, and controller availability. Application repositories should expose the assumptions they make about those services rather than duplicate their implementation.

# When Kubernetes Is the Wrong Boundary

Kubernetes earns its complexity when several workloads need multi-node scheduling, replacement, service discovery, controlled rollout, and a shared platform contract. A managed application service or single-host Compose deployment is often simpler when those requirements do not exist. Kubernetes provides mechanisms for availability; it does not create good probes, spare capacity, compatible releases, or reliable data systems automatically.

# Questions

> [!QUESTION]- What is the difference between a Pod, Deployment, and Service?
> A Pod is the scheduled execution unit. A Deployment keeps the desired number and revision of replaceable Pods present. A Service supplies stable discovery and routes to selected ready Pods. They solve execution, reconciliation, and discovery separately.

# References

- [Kubernetes documentation](https://kubernetes.io/docs/home/)
- [Gateway API documentation](https://gateway-api.sigs.k8s.io/)
