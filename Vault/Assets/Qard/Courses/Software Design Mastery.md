---
topic: [Software Design]
subtopic: []
level: ["4"]
priority: High
status: Creation
publish: false
tags: [qard-internal, MetricsIgnore]
qard-mastery: "Software Design"
---

The route starts with ownership of state and effects, then makes design principles concrete through contracts and behavioral tests. C# types, methods, and exceptions from Programming are useful preparation.

This is course 3 of the suggested vault route. Learn courses order capabilities; the existing first-pass plans track card exposure, and Today retains the material actually studied. Course switching is manual.

All mapped topics are included in the learning flow, including source notes marked Creation or Not-Started. Previously planned objectives are new and follow the same prerequisite route as other unassessed objectives. Source-note lifecycle statuses remain unchanged; assessment evidence still comes from actual study.

Start lessons and checks from this course's objectives. The record lives outside Home, so folder-based automatic association and Update objectives do not map the source tree. Maintain its explicit objective/source links directly. Prerequisites guide the frontier; Qard still permits manually teaching another objective.

Setup assigns no due dates or evidence. Teaching and assessment write subsequent evidence; source-note lifecycle statuses remain owner-managed. Draft source status does not place an objective on hold.

# Learning Objectives

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Source revision | Source updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Assign state and allowed transitions to objects that preserve invariants, and justify composition versus inheritance | Objects and invariants | object-invariants | 01 State and effects | new |  |  | [[Home/Software Design/Paradigms/OOP]] |  | v1:53c2055388dcc61d91866ba70a6b210d361bd8be213fb1584341d4de115e3de7/0 | |
| Separate deterministic calculations from effects and identify the allocation and deferred-execution costs of functional techniques | Pure calculations | pure-core | 01 State and effects | new |  | object-invariants | [[Home/Software Design/Paradigms/Functional Programming]] |  | v1:573eb52f89ce620066a447f876893b0ebff58338e1930ffb152298a552b823cc/1 | |
| Distinguish an immutable event from a command and trace handler failure, publication timing, and redelivery boundaries | Events and handlers | event-contracts | 01 State and effects | new |  | object-invariants | [[Home/Software Design/Paradigms/Event-driven]] |  | v1:025a900922dde6b61eb163526f062806ba14418214821759c2ee4a40198fa008/0 | |
| Choose the smallest design that meets a concrete requirement, distinguishing duplicated knowledge from similar code and needed inversion from speculative flexibility | Simplicity and shared knowledge | simple-design | 02 Change and dependency rules | new |  | object-invariants, pure-core | [[Home/Software Design/Principles/KISS]], [[Home/Software Design/Principles/DRY, IoC, and YAGNI]] |  | v1:5717101ffbbb3302421d51feb29b383151037ace975b1989d766ea1cfd5cbae7/0,d3972c2232583478e70cbaac94819ab29ae73c6da4a1b85334a24ce8a58076d8/0 | |
| Diagnose a change that violates responsibility, substitution, interface, or dependency boundaries and justify a smaller corrective design | SOLID contracts | solid-contracts | 02 Change and dependency rules | new |  | simple-design | [[Home/Software Design/Principles/SOLID]] |  | v1:0b59cda78cb58a9ef7d77297bfc9640d361ea6a334d12840ccd688417aa743d5/0 | |
| Read or draw class relationships whose association, ownership, subtyping, and navigability claims match the intended code | Class relationships | uml-relations | 02 Change and dependency rules | new |  | object-invariants | [[Home/Software Design/UML Class Diagrams]] |  | v1:5448d4f57597c624b13deaf239427b5afe9e09d9117b13d9bd1e22669aefd4e8/0 | |
| Test externally visible behavior with controlled time and I/O, choosing real collaborators or test doubles without coupling assertions to implementation | Unit-test boundaries | unit-boundaries | 03 Evidence and feedback | new |  | solid-contracts | [[Home/Software Design/Testing/Unit Testing]] |  | v1:4f5255c55d43879d0cb4b4d314fbe9e096aa33c743f04678be80b962797e35e5/3 | |
| Choose a real runtime boundary for an integration test and isolate configuration, infrastructure, and data so failures remain diagnostic | Integration contracts | integration-boundaries | 03 Evidence and feedback | new |  | unit-boundaries | [[Home/Software Design/Testing/Integration Testing]] |  | v1:5d50313797fc04c9088c86fb757218738d3bcd75be6551864a324de70f61d0fe/0 | |
| Grow a behavior through red-green-refactor while choosing examples that shape the public contract instead of freezing implementation | Test-first development | test-first-loop | 03 Evidence and feedback | new |  | unit-boundaries | [[Home/Software Design/Testing/Test-Driven Development]] |  | v1:a188854d20c4d2fadee7cf4820a3b581021eb73483ed342b97c62240edad852c/3 | |
| Choose a test mix by feedback speed, fidelity, maintenance cost, and the failure risk each layer can expose | Test portfolio | test-portfolio | 03 Evidence and feedback | new |  | unit-boundaries, integration-boundaries | [[Home/Software Design/Testing/Testing Pyramid]] |  | v1:3d7c51f8f2960a5d00c415bde70b28224a8f44be90d65a750ad514cf4dfa9368/0 | |
