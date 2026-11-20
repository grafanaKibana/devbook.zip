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

The course has one starting point: the **Intro** of Fundamentals. Each group starts with an **Intro** objective for its hub note, and every other objective in the group opens only after it. The groups chain Intro to Intro — Fundamentals, Paradigms, Principles, Testing — so a later group does not wait for every objective of the earlier one.

Inside a group the route is a tree: each objective has one prerequisite in the group, the topic it builds on most directly.

- **Fundamentals:** the Intro, then UML class diagrams.
- **Paradigms:** object-oriented programming, which opens functional and event-driven programming.
- **Principles:** KISS, then DRY, IoC and YAGNI, then SOLID, which is also built on object-oriented programming.
- **Testing:** unit testing, which opens integration testing (then the testing pyramid) and test-driven development.

Assessment evidence comes from study.

# Learning Objectives

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Source revision | Source updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Explain how the placement of state, behavior and dependencies decides how far a change travels, and name what principles, paradigms, testing and UML class diagrams each contribute to judging a design | Intro | design-foundations | Fundamentals | new |  |  | [[Home/Software Design/Software Design]] |  | v1:20e32c76f5324fe7247b839cf48c730a07ec5747fec466bfaa5bdc342e4a874c/0 |  2026-11-19 |
| Read or draw class relationships whose association, ownership, subtyping, and navigability claims match the intended code | UML Class Diagrams | uml-relations | Fundamentals | new |  | design-foundations | [[Home/Software Design/UML Class Diagrams]] |  | v1:a5d4f1952265279a03cfbba06893770e3391062fe5e4c5318e4e428d72534d30/0 | 2026-11-16 |
| Compare imperative, object-oriented, functional, event-driven, reactive and concurrent styles by where state lives, what composes and where effects appear, and pick the style that keeps a state transition easiest to inspect | Intro | paradigm-fit | Paradigms | new |  | design-foundations | [[Home/Software Design/Paradigms/Paradigms]] |  |  v1:2a91380adbd4e06e9fd730ffaf400fa70bf85759f2d241f5bbdad2b3c75b3a04/0 |  |
| Assign state and allowed transitions to objects that preserve invariants, justify composition versus inheritance, and check that a subtype stays substitutable for its base contract | OOP | object-invariants | Paradigms | new |  | paradigm-fit | [[Home/Software Design/Paradigms/OOP]] |  | v1:e0d2ef0689919782f6924d97b9a422fcd64c8c93e28ef19be21e412fd14fae91/0 | 2026-11-16 |
| Separate pure calculations from effects, distinguish purity from totality, and identify the allocation and deferred-execution costs of functional techniques in C# | Functional Programming | pure-core | Paradigms | new |  | object-invariants | [[Home/Software Design/Paradigms/Functional Programming]] |  | v1:a6166cc063aab5fc6483b72c89ba36fa0827dbcb99d2a88d7603083f7eb44424/3 | 2026-11-16 |
| Distinguish an immutable event from a command and trace handler failure, publication timing, and redelivery boundaries | Event-driven | event-contracts | Paradigms | new |  | object-invariants, pure-core | [[Home/Software Design/Paradigms/Event-driven]] |  | v1:0c320f97073f5e759b0cf3b77232bb2f2184b0322b73774b10d3701962ff3bd9/0 | 2026-11-16 |
| Use design principles as checks that each name a concrete change or failure risk, and recognise an interface per class and pattern collection as overcorrections | Intro | principle-checks | Principles | new |  | paradigm-fit | [[Home/Software Design/Principles/Principles]] |  |  v1:dc007233640387e2abdf17bcb9bf2996bffad312627ef4b845bb65b9cc3fe5de/0 |  |
| Choose the least complicated design that meets the actual requirements, and name the security, correctness, compliance or measured constraint that justifies each added component, network hop or abstraction | KISS | simple-design | Principles | new |  | principle-checks | [[Home/Software Design/Principles/KISS]] |  | v1:5c71e39b8ec2a0406674ad4b67291b09148152bddceaad6304516ba264c90321/0 | 2026-11-20 |
| Distinguish duplicated knowledge from similar code, explicit constructor injection from hidden resolution, and a present requirement from speculative flexibility, and resolve the tensions between the three | DRY, IoC, and YAGNI | single-authority | Principles | new |  | simple-design | [[Home/Software Design/Principles/DRY, IoC, and YAGNI]] |  |  v1:c205e30e435bf929ca7e084cbd75c7b1157fb8753d35a67ce1cc7a88547b3e25/0 |  |
| Diagnose from its evidence which SOLID principle a design violates — responsibility, extension, substitution, interface or dependency direction — and tell an observed change seam from over-application | SOLID | solid-contracts | Principles | new |  | single-authority, object-invariants | [[Home/Software Design/Principles/SOLID]] |  | v1:3fbad433337b33680d5767a782f4fb943df3df715299acbec71b2969273bfc80/0 | 2026-11-16 |
| Pick the narrowest test that can faithfully expose a named API failure risk — contract drift, broken integration, a known regression, capacity, security or parser edge cases | Intro | risk-matched-tests | Testing | new |  | principle-checks | [[Home/Software Design/Testing/Testing]] |  |  v1:af20e64b08b977a642903390dfc257a7be3bc0026c8aacf69b82420ee02e641d/0 |  |
| Test externally visible behavior with controlled time and I/O, choosing real collaborators or test doubles without coupling assertions to implementation | Unit Testing | unit-boundaries | Testing | new |  | risk-matched-tests | [[Home/Software Design/Testing/Unit Testing]] |  | v1:fa309a4a223963c021f37dd0f20b0f35ee162d69e8d6843e5769511e7cb3d195/3 | 2026-11-16 |
| Choose a real runtime boundary for an integration test and isolate configuration, infrastructure, and data so failures remain diagnostic | Integration Testing | integration-boundaries | Testing | new |  | unit-boundaries | [[Home/Software Design/Testing/Integration Testing]] |  | v1:acb0f52db4255ff8b071c4a7f905b3f56905e7c41986088964a9ce5a2236ac70/0 | 2026-11-16 |
| Choose a test mix by feedback speed, fidelity, maintenance cost, and the failure risk each layer can expose | Testing Pyramid | test-portfolio | Testing | new |  | integration-boundaries | [[Home/Software Design/Testing/Testing Pyramid]] |  | v1:1ae8a3b657a6bfba6f7e2c3c5c89b9861ceb9e8fb61f2cb071b3b159e0d9ba27/0 | 2026-11-16 |
| Grow a behavior through red-green-refactor with examples that shape the public contract instead of freezing implementation, and recognise when a test-first loop is not worth its overhead | Test-Driven Development | test-first-loop | Testing | new |  | unit-boundaries | [[Home/Software Design/Testing/Test-Driven Development]] |  | v1:e3ffe03211f9df4b94d9865cf9ffb223a1d7cabb875bd7210e5184b2c0f114bf/3 | 2026-11-16 |
