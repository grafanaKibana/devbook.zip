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
| Assign behavior and state to modules or classes by their reasons to change, and explain how coupling and cohesion affect the cost of a change | Coupling, cohesion and change | design-foundations | Fundamentals | new |  |  | [[Home/Software Design/Software Design]] |  | v1:03cc7758dc409fed6a38557ab1cf9c38ee57982ef78a2eab02bc33e3c552292f/0 |  |
| Read or draw class relationships whose association, ownership, subtyping, and navigability claims match the intended code | UML class diagrams | uml-relations | Fundamentals | new |  | design-foundations | [[Home/Software Design/UML Class Diagrams]] |  | v1:5448d4f57597c624b13deaf239427b5afe9e09d9117b13d9bd1e22669aefd4e8/0 | |
| Assign state and allowed transitions to objects that preserve invariants, and justify composition versus inheritance | Object-oriented programming | object-invariants | Paradigms | new |  | design-foundations | [[Home/Software Design/Paradigms/OOP]] |  | v1:53c2055388dcc61d91866ba70a6b210d361bd8be213fb1584341d4de115e3de7/0 | |
| Separate deterministic calculations from effects and identify the allocation and deferred-execution costs of functional techniques | Functional programming | pure-core | Paradigms | new |  | object-invariants | [[Home/Software Design/Paradigms/Functional Programming]] |  | v1:18292b234cbe0c5c1a61625b0c163f36dcd9e824ba696ce925bfaeb0498b04c9/3 | 2026-11-02 |
| Distinguish an immutable event from a command and trace handler failure, publication timing, and redelivery boundaries | Event-driven programming | event-contracts | Paradigms | new |  | object-invariants | [[Home/Software Design/Paradigms/Event-driven]] |  | v1:025a900922dde6b61eb163526f062806ba14418214821759c2ee4a40198fa008/0 | |
| Choose the smallest design that meets a concrete requirement, distinguishing duplicated knowledge from similar code and needed inversion from speculative flexibility | KISS, DRY, IoC and YAGNI | simple-design | Principles | new |  | design-foundations | [[Home/Software Design/Principles/KISS]], [[Home/Software Design/Principles/DRY, IoC, and YAGNI]] |  | v1:5717101ffbbb3302421d51feb29b383151037ace975b1989d766ea1cfd5cbae7/0,d3972c2232583478e70cbaac94819ab29ae73c6da4a1b85334a24ce8a58076d8/0 | |
| Diagnose a change that violates responsibility, substitution, interface, or dependency boundaries and justify a smaller corrective design | SOLID principles | solid-contracts | Principles | new |  | simple-design, object-invariants | [[Home/Software Design/Principles/SOLID]] |  | v1:0b59cda78cb58a9ef7d77297bfc9640d361ea6a334d12840ccd688417aa743d5/0 | |
| Test externally visible behavior with controlled time and I/O, choosing real collaborators or test doubles without coupling assertions to implementation | Unit testing | unit-boundaries | Testing | new |  | design-foundations | [[Home/Software Design/Testing/Unit Testing]] |  | v1:4f5255c55d43879d0cb4b4d314fbe9e096aa33c743f04678be80b962797e35e5/3 | |
| Choose a real runtime boundary for an integration test and isolate configuration, infrastructure, and data so failures remain diagnostic | Integration testing | integration-boundaries | Testing | new |  | unit-boundaries | [[Home/Software Design/Testing/Integration Testing]] |  | v1:5d50313797fc04c9088c86fb757218738d3bcd75be6551864a324de70f61d0fe/0 | |
| Grow a behavior through red-green-refactor while choosing examples that shape the public contract instead of freezing implementation | Test-driven development | test-first-loop | Testing | new |  | unit-boundaries | [[Home/Software Design/Testing/Test-Driven Development]] |  | v1:a188854d20c4d2fadee7cf4820a3b581021eb73483ed342b97c62240edad852c/3 | |
| Choose a test mix by feedback speed, fidelity, maintenance cost, and the failure risk each layer can expose | Testing pyramid and test strategy | test-portfolio | Testing | new |  | unit-boundaries, integration-boundaries | [[Home/Software Design/Testing/Testing Pyramid]] |  | v1:3d7c51f8f2960a5d00c415bde70b28224a8f44be90d65a750ad514cf4dfa9368/0 | |
