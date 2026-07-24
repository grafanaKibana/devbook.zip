---
publish: true
created: 2026-07-19T15:05:28.183Z
modified: 2026-07-19T15:05:28.183Z
published: 2026-07-19T15:05:28.183Z
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: An application whose modules are released and deployed together as one unit.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A monolith is defined by one deployment unit: its modules are versioned, released, and rolled back together. It commonly uses one process and database, but those implementation choices are not the definition. The style keeps operations and in-process transactions simple; its main cost is deployment and scaling coupling as modules and teams grow.

# What a Monolith Looks Like

A typical ASP.NET Core monolith can use this layout:

```text
MyApp/
├── Controllers/        # HTTP entry points
├── Services/           # Business logic
├── Repositories/       # Data access (EF Core)
├── Models/             # Domain entities
└── Program.cs          # Single startup, single deployment
```

One `dotnet publish` produces one coordinated deployment unit. That unit may run as one process or several collocated processes, and it may use one database or several stores; those parts are still versioned, released, and rolled back together.

# Benefits

**Operational simplicity:** one coordinated release unit reduces deployment and rollback surfaces. It does not eliminate distributed failure: a monolithic deployment that calls external services or spans processes and datastores still needs network-failure handling, tracing, and explicit eventual workflows.

**Easy local development:** `dotnet run` starts everything. No service mesh, no container orchestration needed for development.

**Simple local transactions:** components that share one transactional database can commit together without a distributed protocol. This advantage is common, not inherent: modules using separate resources still need explicit coordination.

**Low latency for collocated components:** modules in the same process use local calls instead of network hops. Components in another process, datastore, or external service keep their ordinary network latency and failure modes.

> [!NOTE]
> **A monolith still scales horizontally** — the common myth is "monolith = can't scale." You scale it by running **N identical copies behind a [[Software Architecture/Distributed Systems/Load Balancing|load balancer]]** (which is why keeping the process **stateless** matters). What you _can't_ do is scale components _independently_ — if only the report generator is hot, you still replicate the whole app. That inefficiency, not a hard ceiling, is the real scaling argument for microservices.

# When Monoliths Break Down

| Signal | What it means |
|--------|--------------|
| Build takes 10+ minutes | Too much code in one compilation unit |
| Deploying one feature requires testing everything | Hidden coupling between components |
| One team's change breaks another team's feature | Shared mutable state, no module boundaries |
| One component's load spikes affect all others | No independent scaling |
| Database schema changes require coordinating all teams | Shared schema ownership |

These signals indicate the monolith has become a **big ball of mud** — not because monoliths are bad, but because module boundaries were not enforced.

# Modular Monolith — The Middle Ground

A [[Software Architecture/System Architecture/Modular Monolith]] keeps one deployment unit while enforcing explicit module contracts and data ownership. It is the normal upgrade path when an unstructured monolith needs stronger change boundaries but independent service deployment is not yet worth the operating cost.

# Monolith vs Microservices

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| Deployment | Single unit | Independent per service |
| Transactions | Local ACID when components share one resource | Local transactions plus saga, outbox, or supported distributed coordination across resources |
| Scaling | Scale everything together | Scale individual services |
| Operational complexity | Low | High (service mesh, tracing, retries) |
| Team autonomy | Low (shared codebase) | High (independent deployments) |
| Development speed (early) | Fast | Slow (infrastructure overhead) |
| Development speed (at scale) | Slow (coupling) | Fast (independent teams) |

See [[Software Architecture/System Architecture/Microservices]] for the full microservices pattern.

# Decision Rule

**Start with a monolith** (ideally modular). The operational simplicity and development speed advantages are significant in the early stages of a product. Microservices are justified when:

- Independent deployment is a hard requirement (different release cadences per team).
- A specific component needs independent scaling (e.g., a video processing service).
- Teams are large enough that shared codebase coordination becomes the bottleneck.

The cost of premature microservices is high: distributed systems complexity, eventual consistency, and operational overhead before the product has proven its architecture.

# Collocation provenance visuals

![[Assets/Software Architecture/Software Architecture-Monolith Architecture-18120000-1.jpg]]

Prime Video's monitoring pipeline and Stack Overflow's historical application tier are provenance cases, not architecture targets. [[Software Architecture/System Architecture/Modular Monolith]] owns the reusable comparison of collocation, scaling, and boundary decisions.

![[Assets/Software Architecture/Software Architecture-Monolith Architecture-18120000.png]]

# Pitfalls

## Deployment Coupling

**What goes wrong**: a bug fix in one module requires deploying the entire application. In a 15-team organization with a single monolith deployed via a 45-minute CI/CD pipeline, a one-line CSS fix in the storefront module sat blocked for 3 days because the checkout team's unrelated database migration kept failing — both changes were in the same deployment artifact.

**Why it happens**: the monolith is a single deployment unit. Any change to any module triggers a full deployment.

**Mitigation**: enforce strict module boundaries so that changes in one module do not require touching others. Use feature flags to decouple deployment from release. A modular monolith with clear interfaces reduces the blast radius of any single change.

## Database Monolith

**What goes wrong**: modules share tables or schema ownership without boundaries. A schema change for one module requires coordinating with all teams and risks breaking other modules.

**Why it happens**: a shared database is a common convenience in a monolith, so table ownership stays implicit as the team grows.

**Mitigation**: partition the database by module even within a monolith. Each module owns its tables and accesses other modules' data only through service interfaces, not direct SQL joins. This is the modular monolith approach and is a prerequisite for eventual microservice extraction.

# Questions

> [!QUESTION]- What is a modular monolith and when is it better than microservices?
> A modular monolith enforces explicit module boundaries (clear interfaces, no internal coupling) within a single deployment. It gives you maintainability and team autonomy without distributed systems complexity. It is better than microservices when independent deployment is not yet a hard requirement — which is most early-stage products.
> Cost: requires discipline to maintain module boundaries; without enforcement, it degrades into a big ball of mud.

> [!QUESTION]- When do microservices become justified over a monolith?
> When independent deployment is a hard requirement and the team can support the operational complexity (distributed tracing, network failures, eventual consistency, service mesh). The signal is usually: teams are blocked by each other's deployments, or a specific component needs independent scaling that the monolith cannot provide.

# References

- [Monolith First (Martin Fowler)](https://martinfowler.com/bliki/MonolithFirst.html) — the case for starting with a monolith and extracting services only when justified by specific needs.
- [Microservices (Martin Fowler)](https://martinfowler.com/articles/microservices.html) — the canonical microservices article; useful for understanding what you are trading away when you leave the monolith.
- [Modular Monolith: A Primer (Kamil Grzybek)](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer) — practitioner guide to enforcing module boundaries in a .NET monolith.
- [Building Microservices (Sam Newman)](https://samnewman.io/books/building_microservices/) — the definitive book on microservices; Chapter 1 covers when NOT to use them.
- [Scaling up the Prime Video audio/video monitoring service and reducing costs by 90%](https://www.primevideotech.com/video-streaming/scaling-up-the-prime-video-audio-video-monitoring-service-and-reducing-costs-by-90) — the original 2023 engineering case; explains the high-volume data-transfer and orchestration bottlenecks behind the team-specific result.
- [Stack Overflow: The Architecture — 2016 Edition](https://nickcraver.com/blog/2016/02/17/stack-overflow-the-architecture-2016-edition/) — primary historical account of the web tier, data systems, traffic, redundancy, and nine-primary-server figure.

## ByteByteGo provenance

- [Prime Video monitoring service](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/amazon-prime-video-monitoring-service.md) — editorial lead for the collocation case; the 90% result is kept explicitly scoped to that service.
- [Designing Stack Overflow](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-will-you-design-the-stack-overflow-website.md) — provenance for the 2016 case visual; server counts are labeled historical rather than current.
