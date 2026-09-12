---
publish: true
created: 2026-08-20T20:41:15.704Z
modified: 2026-08-25T13:45:27.881Z
published: 2026-08-25T13:45:27.881Z
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

A monolith has one deployment boundary. Its modules are versioned, released, and rolled back together. One process and one database are common, but neither defines the style.

That shared boundary buys simple operations and cheap in-process calls. It also couples releases and scaling: a change or load spike in one module can affect the whole application.

# What a Monolith Looks Like

A small ASP.NET Core monolith might have this shape:

```text
MyApp/
├── Controllers/        # HTTP entry points
├── Services/           # Business logic
├── Repositories/       # Data access (EF Core)
├── Models/             # Domain entities
└── Program.cs          # Single startup, single deployment
```

One `dotnet publish` creates the coordinated release unit. The application may still run several processes or use more than one datastore, as long as those parts move through production together.

# What the Shared Boundary Buys

Local development stays ordinary. One command starts the application, and an in-process call does not need retries, serialization, or network observability.

Transactions are also easier when modules share one transactional database. A single commit can preserve an invariant across those modules. Once a request crosses into another process or resource, the usual distributed failure modes return.

Horizontal scaling still works. Identical instances can run behind a [[Software Architecture/Distributed Systems/Load Balancing|load balancer]], provided process-local state is disposable. The constraint is granularity: a hot report generator forces another copy of the entire deployment unit.

# Where It Starts to Hurt

| Signal | What it exposes |
| --- | --- |
| A small change requires a full regression cycle | Module boundaries are weak or the release unit is too broad |
| Teams repeatedly block one another's deployments | The shared release cadence has become an organizational bottleneck |
| One workload dominates CPU or memory | Scaling the whole application wastes capacity |
| Schema changes need coordination across modules | Data ownership is implicit |
| Failures spread across unrelated features | Isolation exists in names or folders, not at runtime |

These are coupling signals, not proof that every monolith should be split. A poorly structured service fleet can reproduce the same problems with network calls added.

# The Modular Middle Ground

A [[Software Architecture/System Architecture/Modular Monolith]] keeps one deployment unit while giving each module an explicit API and data ownership. It is the usual repair when the codebase needs stronger change boundaries but independent deployment would add more operational cost than value.

# Monolith vs Microservices

| Concern | Monolith | Microservices |
| --- | --- | --- |
| Deployment | One coordinated unit | Independent service releases |
| Calls | Usually in-process | Networked and fallible |
| Transactions | Local ACID when modules share a resource | Local transactions plus explicit cross-service workflows |
| Scaling | Replicate the whole unit | Scale selected services |
| Operations | Fewer moving parts | More deployment, telemetry, and failure surfaces |
| Team cadence | Shared | Can be independent when ownership is real |

[[Software Architecture/System Architecture/Microservices]] earn their cost when independent deployment or asymmetric scaling is a repeated, measured constraint. They are a poor default for boundaries that are still changing.

# When One Deployment Still Fits

Start with one deployable unit and enforce module boundaries early. Split only where a boundary already behaves like a service: it has stable ownership, a clear contract, and a reason to release or scale on its own.

The hard part is not extracting code. It is separating data and operational responsibility without turning every request into a distributed transaction.

# Collocation Case Studies

![[Assets/Software Architecture/Software Architecture-Monolith Architecture-18120000-1.jpg|theme-aware]]

Prime Video's monitoring pipeline and Stack Overflow's 2016 application tier are useful cases, not universal architecture targets. [[Software Architecture/System Architecture/Modular Monolith]] develops the broader lesson: collocation can remove coordination and data-transfer costs when the boundary matches the workload.

![[Assets/Software Architecture/Software Architecture-Monolith Architecture-18120000.png|theme-aware]]

# Pitfalls

## Deployment Coupling

A low-risk change can wait behind an unrelated migration because both ship in the same artifact. Module contracts and focused tests reduce accidental coupling, while feature flags separate deployment from release. Neither removes the shared rollback boundary.

## Database Monolith

A shared database becomes dangerous when ownership is shared too. Each module should own its tables and expose behavior through its contract. Cross-module SQL joins save time at first, then make extraction and schema evolution expensive.

## Distributed Assumptions in Local Code

Moving a module out of process changes the failure model. A method call that once completed or threw now needs timeouts, idempotency, retries, telemetry, and a plan for partial completion. Ignoring that shift produces a distributed monolith: deployment is separated, but change and failure are still coupled.

# Questions

> [!QUESTION]- What evidence justifies extracting a service?
> A stable boundary should already exist, and the module should repeatedly need an independent release cadence, runtime isolation, or scaling profile. Extraction without those pressures usually trades visible code coupling for harder operational coupling.

# References

- [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)
- [Stack Overflow: The Architecture — 2016 Edition](https://nickcraver.com/blog/2016/02/17/stack-overflow-the-architecture-2016-edition/)
