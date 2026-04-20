# Week 09 — End-to-End AI System Design Drill
> [!note] Back to [[Hackathon - Senior AI Engineering Training Plan]]

Previous: [[Hackathon - Senior AI Engineering Training Plan - Week 08 - Security, Guardrails, and Reliability]] | Next: [[Hackathon - Senior AI Engineering Training Plan - Week 10 - DSA Intensification and Interview Reasoning]]

## Goal

Turn the Support Copilot Platform into one complete senior-level system-design case. This week is about presenting one coherent story from requirements to scale path, not just listing components.

## Weekly Outcome

By the end of the week, you should have one interview-ready system-design packet for the Support Copilot Platform: a one-page answer outline, a clean architecture diagram, a critical-path walkthrough, a failure-mode table, and a short tradeoff summary you can defend without improvising.

## Suggested Weekly Flow

1. Lock the interview frame before the drill.
2. Assemble all system evidence into one packet.
3. Rehearse a full design answer.
4. Cut anything you cannot justify clearly.
5. Save one answer outline and one architecture packet.

## Task Checklist

- [ ] Write the interview frame in one page: users, workload shape, latency target, tenancy model, failure budget, and cost boundary.
- [ ] Draw one current-state architecture diagram for the Support Copilot Platform with ingress, orchestration, retrieval, LLM call, storage, and operator surfaces.
- [ ] Write one end-to-end request walkthrough from user question to grounded response.
- [ ] Write one tenant-growth scenario that explains what breaks first at 10x load and what you would change next.
- [ ] Build one failure-mode table with trigger, user impact, detection signal, fallback, and owner.
- [ ] Create one one-page system-design answer outline that fits a 35 to 45 minute interview.
- [ ] Rehearse the full answer twice, once with notes and once from memory.
- [ ] Record weak spots after each rehearsal and cut or simplify any part you still cannot justify clearly.
- [ ] Package the final artifact set into a folder or note bundle you can open before a mock interview.

## Suggested Session Plan

### Session 1, lock the interview frame

- Define the product story in plain language: who uses the Support Copilot Platform, what problem it solves, and what a successful answer looks like.
- Set operating assumptions you will reuse everywhere: request volume, latency target, tenant isolation level, and cost tolerance.
- Write the non-goals so you do not drift into fantasy scale.

### Session 2, build the architecture packet

- Produce the high-level architecture diagram.
- Capture the critical request path and background worker path.
- Mark the first likely bottleneck and the first extraction seam.

### Session 3, pressure-test the design

- Write one failure path, one degraded-mode path, and one scale-up path.
- Add tradeoffs for retrieval quality vs latency, single-tenant isolation vs shared infrastructure, and synchronous vs asynchronous work.
- Tighten any component description that sounds vague or generic.

### Session 4, rehearse the interview answer

- Deliver the answer in this order: requirements, architecture, critical paths, bottlenecks, tenancy, operations, tradeoffs.
- Time-box the answer and note where you ramble.
- Replace long component descriptions with short decision rules.

### Session 5, finalize the packet

- Produce the final one-page answer outline.
- Save the architecture packet, diagram, failure-mode table, and scale-trigger notes in one obvious place.
- Write a short post-drill memo: what felt strong, what still felt weak, and what you will reuse in Week 12.

## Suggested Steps

### Step 1 — Define the interview frame

- users
- workload shape
- latency target
- tenancy model
- failure budget
- first expected bottleneck

### Step 2 — Build the design packet

- request flow
- deployment view
- worker path
- failure-mode path
- scale triggers

## Resource Pack

### Internal notes

- [[Software Engineering/05 Architecture/System Architecture/System Architecture|System Architecture]]
- [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability Patterns]]
- [[Software Engineering/09 DevOps/Observability|Observability]]
- [[Software Engineering/07 Security/Authorization/Multitenancy|Multitenancy]]

### External docs

- [Azure Architecture Center](https://learn.microsoft.com/azure/architecture/) , reference patterns for service boundaries, data flow, and production architecture reviews.
- [C4 model](https://c4model.com/) , lightweight way to structure context, container, and component diagrams without turning the packet into diagram theater.
- [Google SRE workbook](https://sre.google/workbook/table-of-contents/) , practical framing for reliability targets, failure modes, and operational decisions.
- [Designing Data-Intensive Applications](https://dataintensive.net/) , source for scaling, consistency, and data-flow tradeoffs you may need to defend.

## Deep Study

- Read [[Software Engineering/05 Architecture/System Architecture/System Architecture|System Architecture]].
- Read [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability Patterns]].
- Read [[Software Engineering/09 DevOps/Observability|Observability]].

## Build Plan

- Capture one full request path.
- Capture one representative tenant-growth path.
- Capture one failure path the design must survive.
- Turn that into a packet you can present without improvising architecture.

Concrete outputs for the week:

- architecture packet
- one-page answer outline
- deployment view
- failure-mode table linked to design decisions

## Implementation Tasks

- Create or update a `docs/system-design/` bundle for the Support Copilot Platform with `overview.md`, `request-flow.md`, `failure-modes.md`, and `tradeoffs.md`.
- Produce one diagram that names the real boundaries you would defend in an interview: API layer, orchestration layer, retrieval pipeline, model gateway, data stores, and telemetry path.
- Write a request-contract note for one representative flow: user message in, retrieval context built, model call made, grounded answer returned, telemetry emitted.
- Define one tenancy decision explicitly: shared app tier with tenant-scoped data isolation, or a stricter split if you can justify the cost.
- Add a bottleneck table with trigger, symptom, mitigation, and next extraction seam, for example retrieval latency, model rate limits, queue backlog, or noisy-tenant pressure.
- Package the final artifacts into one interview packet with a stable reading order so you can open it in under 30 seconds before a mock design round.

## System Design Drill

Use this order:

1. requirements and constraints
2. high-level architecture
3. critical paths
4. bottlenecks and scale path
5. tenancy and isolation
6. observability and operations
7. tradeoffs and what you would not build yet

Rehearsal tasks for this week:

- Do one full whiteboard-style walkthrough in 35 to 45 minutes.
- Do one compressed 10 minute version that keeps only the essentials.
- After each run, score yourself from 1 to 5 on clarity, tradeoff quality, tenancy reasoning, and operational realism.
- If any section scores below 4 twice, simplify the design instead of adding more moving parts.

## DSA Plan

- Solve 1 graph traversal or shortest-path problem.
- Solve 1 heap / queue / top-k problem.
- Explain how those patterns show up in the system design narrative.

Keep it narrow. The goal is not extra volume. The goal is to connect algorithmic choices to the design story, for example top-k retrieval, queue prioritization, or graph-style workflow traversal.

## Best Practices

- Keep the story opinionated.
- Start from current product needs, not future fantasy scale.
- Use the artifacts as support, not as a substitute for reasoning.
- Name the first extraction seam only when you have a trigger.

## Common Mistakes

- Over-explaining components and under-explaining tradeoffs.
- Designing for internet scale without evidence.
- Talking past operations, tenancy, or cost.
- Treating the system design as separate from the real project.

## Review and Checkpoint

Use these prompts after the final rehearsal:

- Can I explain the Support Copilot Platform from user request to grounded response without opening the diagram?
- What is the first bottleneck I claim will break, and what evidence supports that claim?
- Which tradeoff would I defend most strongly in an interview: latency vs answer quality, isolation vs cost, or simplicity vs flexibility?
- If the interviewer asks, "what would you not build yet," do I have a clean, product-grounded answer?
- Which artifact still feels weak: diagram, failure-mode table, one-page outline, or scale path?
- What one thing should Week 12 reuse directly from this packet?

## Useful Links

- [[Software Engineering/05 Architecture/System Architecture/System Architecture|System Architecture]]
- [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability Patterns]]
- [[Software Engineering/09 DevOps/Observability|Observability]]
- [System design interview framework](https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery)
- [Designing Data-Intensive Applications](https://dataintensive.net/)
- [Azure Architecture Center](https://learn.microsoft.com/azure/architecture/)
- [C4 model](https://c4model.com/)

## Definition of Done

- You can walk the Support Copilot Platform end to end without notes.
- The system-design answer has a clean structure.
- The architecture packet is ready for interview use.
- You can explain the main tradeoffs without hiding behind buzzwords.
