# Week 07 — Product-Oriented Backend Architecture
> [!note] Back to [[Hackathon - Senior AI Engineering Training Plan]]

Previous: [[Hackathon - Senior AI Engineering Training Plan - Week 06 - AI System Design Foundations]] | Next: [[Hackathon - Senior AI Engineering Training Plan - Week 08 - Security, Guardrails, and Reliability]]

## Goal

Refactor the Support Copilot Platform into a structure that is boring in the right ways: easy to ship, easy to test, and easy to explain. This week is about choosing the cheapest architecture that preserves future options.

## Weekly Outcome

By the end of the week, the platform should have explicit product-language modules, a modular-monolith stance that is argued rather than assumed, and one ADR that explains the tradeoff against early microservices. You should also know where the first real extraction seam is, what would trigger it, and why you are not paying that complexity cost yet.

## Suggested Weekly Flow

1. Inspect the current system boundaries honestly.
2. Decide what should become an explicit module.
3. Refactor toward a modular monolith.
4. Write one ADR for the main tradeoff.
5. Keep DDD and CQRS selective, not decorative.

## Suggested Steps

### Step 1 — Name the modules in product language

- Copilot API
- Retrieval
- Knowledge Ingestion
- Support Operations

If a boundary is hard to name, it probably is not a module yet.

### Step 2 — Choose the default architectural stance

- Default to modular monolith.
- Keep one deployable service.
- Use Clean Architecture only where it protects useful boundaries.
- Use DDD or CQRS only where domain rules or read models justify the complexity.

## Task Checklist

- [ ] Map current code areas to product-language modules such as Copilot API, Retrieval, Knowledge Ingestion, Support Operations, and Platform Observability.
- [ ] Identify where boundaries are real, shared schema and policy ownership, versus fake, just folders or namespaces.
- [ ] Define each module's responsibilities, owned data, public contracts, and forbidden dependencies.
- [ ] Refactor one ambiguous area so the dependency direction becomes obvious.
- [ ] Decide which patterns are actually needed now: Clean Architecture, DDD, CQRS, or plain feature modules.
- [ ] Write one ADR that defends modular monolith over microservices for the current stage of the Support Copilot Platform.
- [ ] Name the first extraction seam, but also define the threshold that would justify extracting it later.
- [ ] Add one architecture diagram that shows modules, request flow, and persistence boundaries.
- [ ] Add one test strategy note that explains which tests live at module boundary, integration, and end-to-end layers.
- [ ] Map every module to a concrete .NET shape, endpoint project or feature slice, application service boundary, DI registration point, and persistence boundary.
- [ ] Review the final shape against team size, deployment frequency, and expected product change rate.

## Suggested Session Plan

### Session 1 — Audit the current shape

- Read the current system as it exists, not as you wish it looked.
- Group components by product capability and identify where multiple capabilities are tangled in one place.
- Mark the seams that already exist in code, data ownership, or deployment friction.

### Session 2 — Define module boundaries

- Name modules in product language, not framework language.
- For each module, write what it owns, what it exposes, and what it is not allowed to reach into directly.
- Decide whether module communication is method call, application service, event, or read model query.
- Translate each module into the current .NET solution shape so the boundary exists in code, not only on a diagram.

### Session 3 — Refactor for boring clarity

- Move one messy cross-cutting area into a cleaner boundary.
- Reduce dependency leaks, especially places where retrieval or ingestion logic is spread through API code.
- Keep the deployable unit single unless there is a strong product reason to split.

### Session 4 — Write the ADR and extraction criteria

- Compare modular monolith with microservices using concrete constraints: team size, operational burden, release cadence, and failure isolation needs.
- Record what you are deliberately not doing yet, such as event-driven decomposition everywhere or CQRS across the whole system.
- Define the first extraction seam and the signals that would justify it.

### Session 5 — Review architecture as a product decision

- Re-check whether the new structure makes common changes cheaper.
- Verify that module boundaries help testing, incident isolation, and onboarding.
- Practice explaining the architecture in five minutes without hand-waving.

## Resource Pack

### Internal notes

- [[Software Engineering/05 Architecture/System Architecture/Modular Monolith|Modular Monolith]], the default architectural stance for this week.
- [[Software Engineering/05 Architecture/System Architecture/Microservices|Microservices]], useful for tradeoff framing, not as the automatic goal.
- [[Software Engineering/05 Architecture/Application Architecture/Clean Architecture|Clean Architecture]], where layering helps and where it becomes ceremony.
- [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/Domain-Driven Design|Domain-Driven Design]], selective use for real domain complexity.
- [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/CQRS|CQRS]], when separate read models are worth the cost.

### External docs

- [Martin Fowler on Monolith First](https://martinfowler.com/bliki/MonolithFirst.html), the core argument against premature service splitting.
- [Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices), a sober list of costs and benefits.
- [CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs), decision criteria for selective CQRS.
- [Domain-driven design microservice guidance](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis), useful for bounded-context thinking even in a monolith.
- [Architectural principles for ASP.NET Core apps](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles), useful when deciding where boundaries belong in a .NET codebase.
- [Common web application architectures in ASP.NET Core](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures), concrete reference points for layering and deployable shapes.

## Implementation Tasks

Concrete Support Copilot Platform tasks for this week:

1. Create a module boundary map that includes:
   - Copilot API
   - Retrieval
   - Knowledge Ingestion
   - Support Operations
   - Shared infrastructure, only where truly necessary
   - the .NET project, namespace, or feature-slice location where each module will live
2. For each module, write a small ownership table:

| Module | Owns | Exposes | .NET shape | Must not do |
|---|---|---|---|
| Copilot API | request orchestration and auth context | ask endpoint and job submission endpoints | ASP.NET Core endpoints plus thin application orchestration layer | implement retrieval or ingestion logic inline |
| Retrieval | query preparation and candidate selection | retrieval service contract | class library or feature slice registered through DI as retrieval services | mutate ingestion state |
| Knowledge Ingestion | document normalization, chunking, indexing workflows | ingestion job contract | background service or worker-facing application layer in the same deployable | serve user-facing answer orchestration |
| Support Operations | admin actions, review tools, incident workflows | operator endpoints and dashboards | secured ASP.NET Core area or feature slice with separate policies | bypass platform auth or tenancy rules |

3. Refactor one code path so Retrieval can be tested as a module without spinning up unrelated ingestion behavior, and make the DI registration point show that boundary explicitly.
4. Write an ADR with these exact questions:
   - why modular monolith now
   - what microservices would cost this team today
   - what future trigger would justify splitting Retrieval or Ingestion
   - what evidence would tell you the current shape is failing
5. Add an extraction-trigger table:

| Candidate seam | Split only if | Evidence to watch |
|---|---|---|
| Retrieval | independent scaling or release cadence becomes necessary | sustained traffic shape differs from rest of app, retrieval incidents dominate deploy risk |
| Knowledge Ingestion | ingest workload and operational profile diverge sharply from ask path | long-running jobs, separate storage lifecycle, specialized operator workflows |
| Support Operations | admin workflows start slowing product delivery | permission model, audit needs, and change cadence diverge strongly |

6. Write validation rules for architecture changes, for example:
   - no cross-module data writes without an explicit contract
   - no feature folder may depend on infrastructure details from another module
   - no endpoint may reach directly into another module's persistence layer
   - no new service split without an ADR and measured trigger evidence
7. Add a composition-root checklist that names where module registrations happen in ASP.NET Core and how you keep module wiring visible during startup.
8. Produce one diagram or note that shows request path, module boundaries, .NET composition points, and where tests attach.

## Deep Study

- Read [[Software Engineering/05 Architecture/System Architecture/Modular Monolith|Modular Monolith]].
- Read [[Software Engineering/05 Architecture/System Architecture/Microservices|Microservices]].
- Read [[Software Engineering/05 Architecture/Application Architecture/Clean Architecture|Clean Architecture]].
- Read [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/Domain-Driven Design|Domain-Driven Design]].
- Read [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/CQRS|CQRS]].

## Build Plan

- Refactor current code into explicit modules.
- Define module boundaries and contracts.
- Write one ADR: why modular monolith wins now.
- Name the first real extraction seam without actually extracting it.

Concrete outputs for the week:

- module boundary map
- one ADR
- updated architecture diagram
- written extraction trigger conditions

## System Design Drill

Explain:

- what one deployable unit buys you now
- what would justify splitting Retrieval or Ingestion later
- which patterns you are deliberately not using yet and why

Guideline: answer like a product engineer, not an architecture maximalist. Tie every boundary to deployment cost, team cognition, reliability, or change speed. If a pattern has no clear cost-saving or risk-reducing effect, leave it out.

## DSA Plan

- Solve 1 tree or traversal problem.
- Solve 1 interval, scheduling, or partitioning problem.
- Map them back to dependency flow and separation of responsibilities.

## Best Practices

- Optimize for change cost, not aesthetic purity.
- Make module contracts explicit before discussing service splits.
- Use patterns only when they reduce coupling or clarify behavior.
- Prefer one well-defended ADR over vague architecture taste.

## Common Mistakes

- Jumping to microservices too early.
- Applying DDD or CQRS everywhere.
- Confusing layering with real module boundaries.
- Making architecture more impressive than useful.

## Review and Checkpoint

Use these prompts at the end of the week:

- Can you describe each module in product language without mentioning folders, projects, or frameworks first?
- Which dependency leaks still exist, and why are they risky?
- What did the ADR choose, and what cost was explicitly avoided by that choice?
- Which pattern did you deliberately not adopt, and what would need to change before it became worth it?
- What is the first real extraction seam, and what measurable signal would justify extracting it?
- If a new engineer joined tomorrow, would the module map make the system easier to understand in one sitting?

## Useful Links

- [[Software Engineering/05 Architecture/System Architecture/Modular Monolith|Modular Monolith]]
- [[Software Engineering/05 Architecture/System Architecture/Microservices|Microservices]]
- [[Software Engineering/05 Architecture/Application Architecture/Clean Architecture|Clean Architecture]]
- [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/Domain-Driven Design|Domain-Driven Design]]
- [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/CQRS|CQRS]]
- [Martin Fowler on Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)
- [Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)
- [CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Domain-driven design microservice guidance](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis)
- [Architectural principles for ASP.NET Core apps](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles)
- [Common web application architectures in ASP.NET Core](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)

## Definition of Done

- The Support Copilot Platform has explicit module boundaries.
- You have an ADR explaining the chosen architecture.
- You can explain why modular monolith beats early microservices here.
- The first extraction seam is named and justified, not imagined vaguely.
