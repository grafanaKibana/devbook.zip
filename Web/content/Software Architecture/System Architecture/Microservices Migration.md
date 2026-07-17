---
publish: true
created: 2026-07-16T17:40:51.867Z
modified: 2026-07-16T17:40:51.867Z
published: 2026-07-16T17:40:51.867Z
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: An incremental path from a monolith to independently deployable services driven by measured delivery and scaling pressure.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

A microservices migration should remove a measured constraint, not merely distribute the same coupling. The safe path keeps the existing application serving traffic, establishes one internal boundary, then extracts that boundary behind a stable contract. A successful extraction lets one team deploy, roll back, scale, and operate the service without a lockstep release of the monolith.

Start with the capability whose ownership is clear, data can be isolated, and release or scaling pressure already costs the organization. Avoid the most central workflow as the first extraction: it maximizes unknown dependencies and makes rollback hardest.

## Staged extraction

1. **Measure the pressure.** Record deployment wait time, change collisions, asymmetric load, and incidents caused by the candidate boundary.
2. **Create an in-process seam.** Put the capability behind a contract inside the monolith and block direct table or internal-code access.
3. **Assign data ownership.** Move writes behind that contract. Replace cross-boundary joins with explicit queries, replicated read models, or events.
4. **Introduce the remote implementation.** Route a controlled cohort through HTTP, gRPC, or messaging while the old path remains available.
5. **Prove independent operation.** Deploy and roll back the service alone, exercise dependency failure, and verify traces and alerts.
6. **Retire the old path.** Remove duplicate code and tables only after traffic, reconciliation, and rollback windows show the new owner is stable.

This is a strangler migration: replacement grows around a working system instead of requiring a big-bang rewrite.

## Extraction gate

Extract `Billing` from `Orders` only when each statement is true:

- Billing owns payment-intent state and a versioned external contract.
- Orders does not read or write Billing tables.
- Billing can release while Orders stays on its previous version.
- A Billing outage has a declared Orders behavior: reject, queue, or degrade.
- Trace and causation identifiers connect the initiating request to asynchronous outcomes.
- Reconciliation can find orders whose payment state did not converge.

If the teams still coordinate every release or share writable tables, the system is a distributed monolith. Move the boundary back in-process or finish the isolation before extracting another service.

## Data migration

Prefer one writer during transition. A typical order is:

1. Backfill the new store from a consistent snapshot.
2. Capture changes after the snapshot through an outbox or change-data-capture stream.
3. Compare counts and business invariants between stores.
4. Route reads to the new owner for a small cohort.
5. Switch writes once lag is zero and rollback can replay the retained change stream.
6. Stop the old writer, then remove its tables after the recovery window.

Uncontrolled dual writes create two sources of truth. If temporary dual writing is unavoidable, name the authoritative store and build reconciliation before the first production write.

## Migration evidence

| Claim | Evidence before extraction | Evidence after extraction |
|---|---|---|
| Faster delivery | Candidate changes wait on shared pipeline | Service releases without monolith release |
| Independent scaling | Candidate saturates while rest is idle | Service scales without multiplying whole app |
| Better isolation | Candidate incidents affect whole deploy | Failure drill contains impact at contract boundary |
| Clear ownership | Multiple teams modify same internals | One team owns contract, data, SLO, and pager |

Stop extracting when the next candidate lacks a measurable constraint. A mixed architecture with one monolith and a few services is often the stable destination.

## Case-study boundary

Airbnb's migration is useful because it was staged over years rather than executed as one rewrite. The durable lesson is the sequence: preserve the working monolith, extract where organizational or scaling pressure is visible, and build shared service infrastructure only after repeated needs appear. Later use of both microservices and larger macroservices reinforces that service size follows ownership and change coupling, not a line-count target.

Company-specific traffic and service counts are historical context, not acceptance criteria for another system. [[Microservices]] retains the source visuals and provenance; this note owns the reusable migration method.

## References

- [Strangler Fig pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig) - Microsoft guidance for incrementally replacing a system while it remains available.
- [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) - Martin Fowler's argument for learning domain boundaries before distributing them.
- [How to break a monolith into microservices](https://martinfowler.com/articles/break-monolith-into-microservices.html) - Dependency-driven extraction strategies and sequencing.
- [Airbnb's Great Migration](https://www.infoq.com/presentations/airbnb-services/) - Jessica Tai's account of the organizational and technical migration path.
- [Decompose by business capability](https://microservices.io/patterns/decomposition/decompose-by-business-capability.html) - Capability ownership as the basis for service boundaries.
