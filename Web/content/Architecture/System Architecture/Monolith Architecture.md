---
publish: true
created: 2026-07-08T16:14:17.460+03:00
modified: 2026-07-08T16:14:17.461+03:00
published: 2026-07-08T16:14:17.461+03:00
topic:
  - Architecture
subtopic:
  - System Architecture
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

A monolith is an application deployed as a single unit — one process, one codebase, one deployment artifact. All components (UI, business logic, data access) run in the same process and share the same database. This is not inherently bad: fewer moving parts, simpler operations, easy local development, and no distributed systems complexity. Shopify, for example, runs one of the world's largest e-commerce platforms on a modular Rails monolith handling over 80,000 requests/second — proving that monoliths scale further than most teams assume before microservices become necessary. The problems emerge when the monolith grows large and teams start coupling components in ways that make independent change difficult.

## What a Monolith Looks Like

A typical ASP.NET Core monolith:

```text
MyApp/
├── Controllers/        # HTTP entry points
├── Services/           # Business logic
├── Repositories/       # Data access (EF Core)
├── Models/             # Domain entities
└── Program.cs          # Single startup, single deployment
```

One `dotnet publish`, one Docker image, one deployment. All requests go to the same process. The database is shared by all components.

## Benefits

**Operational simplicity:** one service to deploy, monitor, and debug. No distributed tracing, no network partitions between components, no eventual consistency to reason about.

**Easy local development:** `dotnet run` starts everything. No service mesh, no container orchestration needed for development.

**Simple transactions:** all operations share a database connection. ACID transactions across components are trivial — no distributed transaction protocols needed.

**Low latency for internal calls:** component-to-component calls are in-process function calls, not network hops.

> [!NOTE]
> **A monolith still scales horizontally** — the common myth is "monolith = can't scale." You scale it by running **N identical copies behind a [[Load Balancing|load balancer]]** (which is why keeping the process **stateless** matters). What you _can't_ do is scale components _independently_ — if only the report generator is hot, you still replicate the whole app. That inefficiency, not a hard ceiling, is the real scaling argument for microservices.

## When Monoliths Break Down

| Signal | What it means |
|--------|--------------|
| Build takes 10+ minutes | Too much code in one compilation unit |
| Deploying one feature requires testing everything | Hidden coupling between components |
| One team's change breaks another team's feature | Shared mutable state, no module boundaries |
| One component's load spikes affect all others | No independent scaling |
| Database schema changes require coordinating all teams | Shared schema ownership |

These signals indicate the monolith has become a **big ball of mud** — not because monoliths are bad, but because module boundaries were not enforced.

## Modular Monolith — The Middle Ground

A modular monolith enforces explicit module boundaries within a single deployment:

```text
MyApp/
├── Ordering/           # Module: owns its own models, services, DB tables
│   ├── OrderService.cs
│   └── IOrderRepository.cs
├── Catalog/            # Module: no direct dependency on Ordering internals
│   ├── ProductService.cs
│   └── ICatalogRepository.cs
├── Shared/             # Shared kernel: only stable abstractions
└── Program.cs
```

Modules communicate through public interfaces, not by reaching into each other's internals. This gives you most of the maintainability benefits of microservices while keeping operational simplicity.

## Monolith vs Microservices

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| Deployment | Single unit | Independent per service |
| Transactions | ACID (trivial) | Distributed (Saga, 2PC) |
| Scaling | Scale everything together | Scale individual services |
| Operational complexity | Low | High (service mesh, tracing, retries) |
| Team autonomy | Low (shared codebase) | High (independent deployments) |
| Development speed (early) | Fast | Slow (infrastructure overhead) |
| Development speed (at scale) | Slow (coupling) | Fast (independent teams) |

See [[Microservices]] for the full microservices pattern.

## Decision Rule

**Start with a monolith** (ideally modular). The operational simplicity and development speed advantages are significant in the early stages of a product. Microservices are justified when:

- Independent deployment is a hard requirement (different release cadences per team).
- A specific component needs independent scaling (e.g., a video processing service).
- Teams are large enough that shared codebase coordination becomes the bottleneck.

The cost of premature microservices is high: distributed systems complexity, eventual consistency, and operational overhead before the product has proven its architecture.

## Pitfalls

### Deployment Coupling

**What goes wrong**: a bug fix in one module requires deploying the entire application. In a 15-team organization with a single monolith deployed via a 45-minute CI/CD pipeline, a one-line CSS fix in the storefront module sat blocked for 3 days because the checkout team's unrelated database migration kept failing — both changes were in the same deployment artifact.

**Why it happens**: the monolith is a single deployment unit. Any change to any module triggers a full deployment.

**Mitigation**: enforce strict module boundaries so that changes in one module do not require touching others. Use feature flags to decouple deployment from release. A modular monolith with clear interfaces reduces the blast radius of any single change.

### Database Monolith

**What goes wrong**: all modules share the same database schema and tables. A schema change for one module requires coordinating with all teams and risks breaking other modules.

**Why it happens**: a shared database is the default in a monolith. It is convenient early on but becomes a coordination bottleneck as the team grows.

**Mitigation**: partition the database by module even within a monolith. Each module owns its tables and accesses other modules' data only through service interfaces, not direct SQL joins. This is the modular monolith approach and is a prerequisite for eventual microservice extraction.

## Questions

> [!QUESTION]- What is a modular monolith and when is it better than microservices?
> A modular monolith enforces explicit module boundaries (clear interfaces, no internal coupling) within a single deployment. It gives you maintainability and team autonomy without distributed systems complexity. It is better than microservices when independent deployment is not yet a hard requirement — which is most early-stage products.
> Cost: requires discipline to maintain module boundaries; without enforcement, it degrades into a big ball of mud.

> [!QUESTION]- When do microservices become justified over a monolith?
> When independent deployment is a hard requirement and the team can support the operational complexity (distributed tracing, network failures, eventual consistency, service mesh). The signal is usually: teams are blocked by each other's deployments, or a specific component needs independent scaling that the monolith cannot provide.

## References

- [Monolith First (Martin Fowler)](https://martinfowler.com/bliki/MonolithFirst.html) — the case for starting with a monolith and extracting services only when justified by specific needs.
- [Microservices (Martin Fowler)](https://martinfowler.com/articles/microservices.html) — the canonical microservices article; useful for understanding what you are trading away when you leave the monolith.
- [Modular Monolith: A Primer (Kamil Grzybek)](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer) — practitioner guide to enforcing module boundaries in a .NET monolith.
- [Building Microservices (Sam Newman)](https://samnewman.io/books/building_microservices/) — the definitive book on microservices; Chapter 1 covers when NOT to use them.
