---
publish: true
created: 2026-10-21T13:29:32.437Z
modified: 2026-10-21T13:29:32.437Z
published: 2026-10-21T13:29:32.437Z
topic:
  - DevOps
subtopic: []
summary: Orchestrates containers by reconciling reality to a declared desired state.
level:
  - "2"
priority: High
status: Ready to Repeat
qard-deck: DevOps
qard-topic: Kubernetes
flashcard_uid: 41eecc4b
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

<!-- qard-id: bc9a5b5d-d49f-480f-a7de-7fe709538cac -->

> [!qard]- What is the difference between a Pod, Deployment, and Service?
> They separate three concerns. A Pod runs containers. A Deployment declares the desired set of Pods, drives the cluster toward it and rolls out changes to it. A Service gives clients a stable way to reach the Pods behind it while those Pods change.
>
> | Object | Responsibility | Identity and lifetime |
> |---|---|---|
> | Pod | The smallest unit Kubernetes schedules onto a node: one or more containers that share networking and can share storage. | Replaceable. A replacement is a new Pod, usually with a different IP, so Pod addresses are not durable identity. |
> | Deployment | Declares how many Pods should run from a Pod template and reconciles actual state toward that count through a ReplicaSet. A template change rolls out through a new ReplicaSet. | A long-lived declaration; the individual Pods it manages come and go. |
> | Service (typical selector-based ClusterIP) | Selects Pods by label, puts a stable name and virtual IP in front of them and distributes traffic among them. | Stays the same while its set of backend Pods changes. |
>
> **How they work together:** a Deployment with `replicas: 3` and the Pod label `app: myapi` declares three desired replicas. If one Pod is deleted or its node fails, the ReplicaSet creates a replacement Pod, usually with a new IP, to converge back toward three. The count is a target, not a guarantee: unschedulable Pods, insufficient quota, image pull errors or failing readiness checks can leave fewer Pods ready to serve. A Service that selects `app: myapi` keeps its name and address throughout. Normally only Pods that pass their readiness check receive Service traffic, so the replacement starts receiving requests once it becomes ready. Clients never have to track Pod IPs.
>
> A Deployment never routes traffic, and a Service never creates Pods. In this selector-based setup, they are connected only through the labels on the Pods. A Service without a selector relies on separately managed endpoints, and a headless Service has no virtual IP.
>
> [Kubernetes: Pods](https://kubernetes.io/docs/concepts/workloads/pods/) · [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) · [Kubernetes: Service API](https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/)

# References

- [Kubernetes documentation](https://kubernetes.io/docs/home/)
- [Gateway API documentation](https://gateway-api.sigs.k8s.io/)
