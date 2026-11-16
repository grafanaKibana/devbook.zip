---
topic: [Software Design]
subtopic: []
level: ["4"]
priority: High
status: New
publish: false
tags: [qard-internal, MetricsIgnore]
qard-mastery: "Software Design"
---

Software design connects the cost of a change to the placement of state, behavior, and dependencies.

- **Fundamentals:** coupling and cohesion, then UML class relationships and ownership.
- **Paradigms:** object-oriented, functional, and event-driven models for state and collaboration.
- **Principles:** KISS, DRY, IoC, YAGNI, and SOLID as ways to judge a design decision.
- **Testing:** unit and integration tests, test-driven development, and the testing pyramid as a feedback and cost model.

Start with **Coupling, cohesion and change**. Object-oriented programming provides the basis for the SOLID comparison; functional and event-driven programming are alternative branches. Testing can start from the design fundamentals without requiring completion of all paradigms and principles. UML provides a parallel way to describe relationships.

Rows progress from foundations to more specialized work within each group. Prerequisites name the knowledge an objective actually uses. Assessment evidence comes from study; the new design foundation starts unassessed.

# Learning Objectives

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Source revision | Source updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Assign behavior and state to modules or classes by their reasons to change, and explain how coupling and cohesion affect the cost of a change | Coupling, cohesion and change | design-foundations | Fundamentals | new |  |  | [[Home/Software Design/Software Design]] |  | v1:20e32c76f5324fe7247b839cf48c730a07ec5747fec466bfaa5bdc342e4a874c/0 |  2026-11-16 |
| Read or draw class relationships whose association, ownership, subtyping, and navigability claims match the intended code | UML class diagrams | uml-relations | Fundamentals | new |  | design-foundations | [[Home/Software Design/UML Class Diagrams]] |  | v1:a5d4f1952265279a03cfbba06893770e3391062fe5e4c5318e4e428d72534d30/0 | 2026-11-16 |
| Assign state and allowed transitions to objects that preserve invariants, and justify composition versus inheritance | Object-oriented programming | object-invariants | Paradigms | new |  | design-foundations | [[Home/Software Design/Paradigms/OOP]] |  | v1:e0d2ef0689919782f6924d97b9a422fcd64c8c93e28ef19be21e412fd14fae91/0 | 2026-11-16 |
| Separate deterministic calculations from effects and identify the allocation and deferred-execution costs of functional techniques | Functional programming | pure-core | Paradigms | new |  | object-invariants | [[Home/Software Design/Paradigms/Functional Programming]] |  | v1:a6166cc063aab5fc6483b72c89ba36fa0827dbcb99d2a88d7603083f7eb44424/3 | 2026-11-16 |
| Distinguish an immutable event from a command and trace handler failure, publication timing, and redelivery boundaries | Event-driven programming | event-contracts | Paradigms | new |  | object-invariants | [[Home/Software Design/Paradigms/Event-driven]] |  | v1:0c320f97073f5e759b0cf3b77232bb2f2184b0322b73774b10d3701962ff3bd9/0 | 2026-11-16 |
| Choose the smallest design that meets a concrete requirement, distinguishing duplicated knowledge from similar code and needed inversion from speculative flexibility | KISS, DRY, IoC and YAGNI | simple-design | Principles | new |  | design-foundations | [[Home/Software Design/Principles/KISS]], [[Home/Software Design/Principles/DRY, IoC, and YAGNI]] |  | v1:5c71e39b8ec2a0406674ad4b67291b09148152bddceaad6304516ba264c90321/0,c205e30e435bf929ca7e084cbd75c7b1157fb8753d35a67ce1cc7a88547b3e25/0 | 2026-11-16 |
| Diagnose a change that violates responsibility, substitution, interface, or dependency boundaries and justify a smaller corrective design | SOLID principles | solid-contracts | Principles | new |  | simple-design, object-invariants | [[Home/Software Design/Principles/SOLID]] |  | v1:3fbad433337b33680d5767a782f4fb943df3df715299acbec71b2969273bfc80/0 | 2026-11-16 |
| Test externally visible behavior with controlled time and I/O, choosing real collaborators or test doubles without coupling assertions to implementation | Unit testing | unit-boundaries | Testing | new |  | design-foundations | [[Home/Software Design/Testing/Unit Testing]] |  | v1:fa309a4a223963c021f37dd0f20b0f35ee162d69e8d6843e5769511e7cb3d195/3 | 2026-11-16 |
| Choose a real runtime boundary for an integration test and isolate configuration, infrastructure, and data so failures remain diagnostic | Integration testing | integration-boundaries | Testing | new |  | unit-boundaries | [[Home/Software Design/Testing/Integration Testing]] |  | v1:acb0f52db4255ff8b071c4a7f905b3f56905e7c41986088964a9ce5a2236ac70/0 | 2026-11-16 |
| Grow a behavior through red-green-refactor while choosing examples that shape the public contract instead of freezing implementation | Test-driven development | test-first-loop | Testing | new |  | unit-boundaries | [[Home/Software Design/Testing/Test-Driven Development]] |  | v1:e3ffe03211f9df4b94d9865cf9ffb223a1d7cabb875bd7210e5184b2c0f114bf/3 | 2026-11-16 |
| Choose a test mix by feedback speed, fidelity, maintenance cost, and the failure risk each layer can expose | Testing pyramid and test strategy | test-portfolio | Testing | new |  | unit-boundaries, integration-boundaries | [[Home/Software Design/Testing/Testing Pyramid]] |  | v1:1ae8a3b657a6bfba6f7e2c3c5c89b9861ceb9e8fb61f2cb071b3b159e0d9ba27/0 | 2026-11-16 |
