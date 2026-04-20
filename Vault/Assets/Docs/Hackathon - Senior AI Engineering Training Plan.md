# Senior AI Engineering — 3-6 Month Training Plan
> [!note] This working doc intentionally lives in `Vault/Assets/Docs/` as a user-requested exception to the usual vault note placement.

## Context

This roadmap is for a working Senior .NET engineer who already ships AI features and wants sharper product-company depth, not beginner coverage. The target is the kind of senior loop used by strong EU and US product companies: AI engineering judgment, backend and system design strength, clean execution in .NET, and enough DSA fluency to stay credible in interviews.

The structure is intentionally narrow. The mandatory core is the first 12 weeks, built to fit inside a real week without turning into a second job. The optional extension exists only if you want more depth, more repetition, or extra buffer after the core is done.

> [!tip] What this plan optimizes for
> Practical senior output. Each week should leave you with something you can explain, demo, or defend: a design decision, a working project increment, a short write-up, a benchmark, or a solved problem set.

## How to Use This Roadmap

Treat this as a weekly operating system, not a checklist you try to finish in one burst. Months 1-3 are sufficient on their own. If you complete only the mandatory core, you still get a coherent Senior AI Engineering preparation track with AI engineering, system design, DSA, and one cumulative flagship build.

Months 4-6 are optional depth, not hidden prerequisites. Use them only if you have extra time, want more repetition, or want to turn the flagship project into a stronger portfolio asset.

Work in this order each week: study enough to sharpen decisions, build enough to turn ideas into proof, do one system design rep, solve the planned DSA problems, then close the loop with a short checkpoint. If a week gets crowded, protect the core loop first and cut optional depth before you cut the build or review.

Read ahead only when it helps execution. This roadmap should feel like product work: scoped, output-driven, and explicit about tradeoffs.

## Quick Reference Card

> [!tip] How to use this card
> Read this before you plan the week. It is the compact contract for how to use the roadmap well.

### Roadmap Rules

- **Start with the mandatory core**: weeks 1-12 are the real plan.
- **Use months 4-6 only as extra depth**: skip them without guilt if the core already gets you where you need to go.
- **Protect the weekly build slot**: the flagship project is where the roadmap becomes interview evidence.
- **Favor output over coverage**: one finished artifact beats broad but fuzzy reading.

### When to Skip Optional Work

- Skip optional reading when the core week already fills the 9-hour budget.
- Skip stretch DSA when the flagship build or system design work ran long.
- Skip depth expansion if the weekly checkpoint says you still cannot explain the current topic clearly.

### Minimum Weekly Win

- Complete the 9-hour core model.
- Finish the planned flagship-project increment.
- Do one system design rep.
- Solve 2 DSA problems.
- Write a short checkpoint with decisions, gaps, and next actions.

### Interview-Ready Output

- A project increment you can demo in 2 to 5 minutes.
- One design artifact you can walk through without notes.
- One clear tradeoff story from the week's work.
- Proof of execution, such as a benchmark, eval result, API contract, failure-mode table, or architecture sketch.

## Weekly Operating System (8–10 Hours)

Default weekly budget: **9h**

Use this as the default cadence unless you are on a lighter week or deliberately trading time across categories without breaking the 8 to 10 hour envelope.

- **AI engineering study**: 2.5h
- **Flagship project build**: 2.5h
- **System design**: 1.5h
- **DSA**: 1.5h, default 2 problems, stretch to 3-5 only on lighter weeks
- **Review / checkpoint / note consolidation**: 1h

**Default total**: 9h

> [!note] Weekly decision rule
> If the week gets squeezed, keep the full build slot, keep the checkpoint, and keep DSA at 2 problems. The first thing to cut is optional depth, not the core operating system.

## Flagship Project

### Goal

Build one portfolio-grade system only: `Support Copilot Platform`, a .NET-first AI system for a product-company support and ops workflow. The target is not a toy chatbot. It is a support-facing platform that can answer grounded questions from internal knowledge, run one bounded support action when allowed, and produce the kind of artifacts you can defend in senior interviews. Python can exist only as an optional side experiment for model or retrieval exploration outside the core milestones, not as part of the mandatory path.

### Architecture

Keep the architecture high level and stable across the 12-week core:

- ASP.NET Core API as the main application boundary for ask, workflow, job, and status endpoints.
- Retrieval layer for ingestion, indexing, hybrid retrieval, and citation-grounded context assembly.
- Eval harness with a golden set, deterministic checks, regression runs, and score reporting.
- One bounded tool-calling flow for a real support or ops action, with explicit contracts and allowlisted behavior.
- Telemetry covering traces, stage timings, error taxonomy, quality regressions, and cost-aware operating signals.
- A short architecture and design write-up that explains module boundaries, tradeoffs, scaling seams, and production posture.

### Why this matters for interviews

This project turns the roadmap into one coherent case study instead of 12 unrelated exercises. It gives you a system you can demo, a design you can walk through, a quality story you can defend, and a set of tradeoffs that sound like real product-company engineering work: retrieval quality versus latency, workflow control versus agent freedom, modular monolith versus early service split, and quality versus cost and runtime reliability.

### Week-to-milestone map

- **Week 1**: bootstrap the Support Copilot Platform, ship the first RAG slice, and define the initial `POST /copilot/ask` contract with citations.
- **Week 2**: add the eval harness, golden cases, deterministic checks, and the first baseline score report.
- **Week 3**: add one bounded tool-calling workflow with explicit tool contracts, logged decisions, and grounded final output.
- **Week 4**: harden the .NET request path with cancellation, bounded concurrency, timeouts, and a light benchmark.
- **Week 5**: tune retrieval with hybrid search, optional reranking, scoped caching, and per-stage monitoring data.
- **Week 6**: add the async ingestion and reindexing backbone with queue boundaries, idempotent workers, and rate limits.
- **Week 7**: refactor the platform into clear module boundaries and record the modular monolith decision with an ADR.
- **Week 8**: add guardrails, deterministic validation, refusal paths, and a failure-mode table for security and reliability risks.
- **Week 9**: produce the full end-to-end architecture packet and rehearse the system design story from requirements to bottlenecks and scale path.
- **Week 10**: map core DSA patterns back to platform hotspots and capture interview reasoning notes that connect algorithms to system choices.
- **Week 11**: add production hardening, observability, eval regression comparison, cost counters, and an operations scorecard with SLO thinking.
- **Week 12**: package the final portfolio bundle, tighten the architecture narrative, and close the core with a clear gap list and demo path.

### Final artifacts

- API contracts for ask, workflow, job submission, and status lookup flows.
- Eval harness assets, including the golden set, deterministic validators, regression summaries, and scorecards.
- Workflow specification for the bounded tool-calling path, including tool contract and failure controls.
- Architecture packet, including the high-level diagram, design write-up, ADRs, failure-mode table, and operations scorecard.
- Portfolio bundle, including the polished README, benchmark and ops summary, retrospective, gap list, and demo checklist.

## Mandatory Core — Months 1–3

Use this section as the execution map. The **authoritative detailed plan** for each week now lives in its own page. Read the hub for sequencing and outcomes; do the real work from the week note.

### Week 1 — LLM and RAG Foundations

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 01 - LLM and RAG Foundations]]

- **Focus**: bootstrap the first grounded RAG slice for the Support Copilot Platform.
- **Main outputs**: first ask endpoint, citations, corpus manifest, and one request-flow sketch.

### Week 2 — Evaluation-First AI Engineering

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 02 - Evaluation-First AI Engineering]]

- **Focus**: make quality measurable with a golden set, deterministic checks, and one baseline regression loop.
- **Main outputs**: eval harness, baseline score report, and one eval-gate note.

### Week 3 — Agents, Tool Use, and MCP

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 03 - Agents, Tool Use, and MCP]]

- **Focus**: add one bounded tool workflow and keep control tighter than “agent” language implies.
- **Main outputs**: tool contract, workflow diagram, and one workflow-versus-agent decision memo.

### Week 4 — .NET Runtime and Concurrency for AI Workloads

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 04 - .NET Runtime and Concurrency for AI Workloads]]

- **Focus**: harden the .NET service path with cancellation, bounded concurrency, and runtime-aware decisions.
- **Main outputs**: benchmark summary, service-hardening checklist, and one runtime tradeoff note.

### Week 5 — Retrieval Quality, Caching, and Monitoring

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 05 - Retrieval Quality, Caching, and Monitoring]]

- **Focus**: improve retrieval quality with evidence instead of intuition.
- **Main outputs**: retrieval benchmark, cache-key checklist, and one retrieval architecture view.

### Week 6 — AI System Design Foundations

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 06 - AI System Design Foundations]]

- **Focus**: introduce async boundaries, idempotent workers, and rate limits as reliability and cost controls.
- **Main outputs**: job contract, worker runbook, and one request-lifecycle diagram.

### Week 7 — Product-Oriented Backend Architecture

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 07 - Product-Oriented Backend Architecture]]

- **Focus**: choose the cheapest architecture that keeps the product shippable and understandable.
- **Main outputs**: module boundary map, ADR, and one extraction-trigger sketch.

### Week 8 — Security, Guardrails, and Reliability

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 08 - Security, Guardrails, and Reliability]]

- **Focus**: reduce blast radius with deterministic guardrails and concrete failure-mode thinking.
- **Main outputs**: failure-mode table, validation checklist, and one guardrail architecture diagram.

### Week 9 — End-to-End AI System Design Drill

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 09 - End-to-End AI System Design Drill]]

- **Focus**: turn the whole project into one coherent system-design case.
- **Main outputs**: architecture packet, deployment view, and one-page answer outline.

### Week 10 — DSA Intensification and Interview Reasoning

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 10 - DSA Intensification and Interview Reasoning]]

- **Focus**: improve coding-interview credibility through 3 well-explained problems, not shallow volume.
- **Main outputs**: 3 reasoning write-ups and one algorithm-to-architecture mapping note.

### Week 11 — Production Hardening and Observability

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 11 - Production Hardening and Observability]]

- **Focus**: connect reliability, latency, quality, and cost into one operating view.
- **Main outputs**: operations scorecard, SLO/error-budget note, and production-readiness summary.

### Week 12 — Synthesis, Portfolio Packaging, and Gap Review

> [!note] Detailed page: [[Hackathon - Senior AI Engineering Training Plan - Week 12 - Synthesis, Portfolio Packaging, and Gap Review]]

- **Focus**: package the 12-week effort into interview-ready evidence and a clear stop/continue decision.
- **Main outputs**: final portfolio bundle, architecture review memo, retrospective, and named gap list.

## Optional Extension — Months 4–6

### Month 4 — Optional Depth Expansion

**Goal**

- Optional, non-required depth month. Pick one track only, then use it to deepen the Support Copilot Platform instead of expanding sideways.
- Choose one of these depth tracks: advanced RAG and evals, agent platform design, or .NET performance depth.

**Choose If**

- Pick **advanced RAG and evals** if the main gap is retrieval quality, eval coverage, or confidence in regression gates.
- Pick **agent platform design** if the main gap is tool orchestration, workflow boundaries, approvals, or MCP-shaped integration contracts.
- Pick **.NET performance depth** if the main gap is latency, allocation pressure, GC behavior, concurrency control, or tail-risk under load.

**Suggested Weekly Shape**

- Week 1: audit the current Support Copilot Platform and name one depth hypothesis plus one measurement plan.
- Week 2: implement one deeper improvement in the chosen track.
- Week 3: run a focused benchmark, eval pass, or failure drill against that improvement.
- Week 4: write one short design memo on what improved, what regressed, and what should stay optional rather than become default complexity.

**Outputs**

- One track-specific artifact set, for example an eval expansion pack, a workflow-boundary design memo, or a .NET performance tuning note with benchmark evidence.
- One updated Support Copilot Platform artifact that proves the depth work changed a real decision, not just the reading list.

**What to skip if time is tight**

- Skip cross-track curiosity. Do not sample all three tracks.
- Keep one measurable improvement plus one written decision memo. Skip extra polish, optional Python experiments, or broader rebuilds.

### Month 5 — Optional Platform and Scale Expansion

**Goal**

- Optional, non-required platform month. Pick one scale track only so the roadmap stays focused and the mandatory core remains enough on its own.
- Choose one of these platform-and-scale tracks: cloud and deployment, distributed systems depth, or cost and reliability depth.

**Choose If**

- Pick **cloud and deployment** if the weak point is shipping posture, environment strategy, CI and CD, secrets, rollout safety, or Azure-hosted operations around the Support Copilot Platform.
- Pick **distributed systems depth** if the weak point is queues, idempotency, async boundaries, backpressure, cross-service contracts, or failure handling across components.
- Pick **cost and reliability depth** if the weak point is spend control, SLOs, fallback policy, rate limiting, caching policy, or model and retrieval cost tradeoffs.

**Suggested Weekly Shape**

- Week 1: choose the one scale problem worth solving now and define success signals before changing architecture.
- Week 2: implement the smallest platform change that makes the chosen problem visible or controllable.
- Week 3: run one scale or reliability exercise, for example deployment rehearsal, retry and queue drill, or cost-budget review.
- Week 4: document the operating model, especially what you would keep simple until real traffic justifies more moving parts.

**Outputs**

- One platform artifact set, for example a deployment runbook, a distributed-boundary ADR, or a cost and reliability scorecard.
- One Support Copilot Platform update that shows senior judgment under scale constraints rather than feature expansion.

**What to skip if time is tight**

- Skip multi-track expansion and skip premature microservice work.
- Keep the single chosen operating improvement and the written decision trail. Cut dashboard polish and optional tooling experiments first.

### Month 6 — Optional Interview Hardening and Buffer

**Goal**

- Optional, non-required finish month. Use it only if you want a stronger close, more repetition, or a deliberate buffer after the mandatory core.
- Choose one finish track: interview hardening, project v2 expansion, or a deliberate buffer and review month.

**Choose If**

- Pick **interview hardening** if the gap is explanation quality, system-design reps, DSA recall, or concise senior tradeoff stories.
- Pick **project v2 expansion** if the Support Copilot Platform is already coherent and one more scoped version would materially improve portfolio quality.
- Pick **buffer and review month** if the mandatory core surfaced uneven areas and the best move is consolidation, cleanup, and repetition instead of more scope.

**Suggested Weekly Shape**

- Week 1: choose the finish track and define the narrowest possible success condition.
- Week 2: do one main rep or build pass tied to that finish track.
- Week 3: run a second rep under pressure, for example timed design walkthrough, focused DSA set, or a tighter project demo pass.
- Week 4: close with a final artifact bundle and a stop rule so the optional extension does not turn into an endless backlog.

**Outputs**

- One finish artifact set, for example a mock interview packet, a scoped v2 project memo, or a review-month gap closure checklist.
- One final decision note that says whether to stop, keep interviewing, or continue only on a named weakness.

**What to skip if time is tight**

- Skip any track that creates new mandatory-feeling work.
- Keep the reps, the final artifact bundle, and the explicit stop decision. Skip extra feature ideas, extra reading, and any optional Python lane unless it serves a very narrow experiment outside the core path.

## Topic Index and Cross-Links

Use this as the narrow reading map for the 12-week core. Stay inside these four tracks so the roadmap keeps one coherent interview story.

### AI engineering

- [[Software Engineering/11 AI & ML/LLM/RAG/RAG|RAG]]
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Evaluation|Evaluation]]
- [[Software Engineering/11 AI & ML/LLM/Agents/Agents|Agents]]
- [[Software Engineering/11 AI & ML/LLM/Guardrails|Guardrails]]

### .NET/runtime/backend depth

- [[Software Engineering/01 Programming/NET/NET|.NET]]
- [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await|Async Await]]
- [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken|CancellationToken]]
- [[Software Engineering/01 Programming/NET/Runtime/Garbage Collector|Garbage Collector]]

### system design/distributed systems

- [[Software Engineering/05 Architecture/System Architecture/System Architecture|System Architecture]]
- [[Software Engineering/05 Architecture/System Architecture/Modular Monolith|Modular Monolith]]
- [[Software Engineering/05 Architecture/Distributed Systems/Distributed Systems|Distributed Systems]]
- [[Software Engineering/05 Architecture/Distributed Systems/Idempotency|Idempotency]]

### DSA/interview reasoning

- [[Software Engineering/02 Computer Science/Algorithms/Algorithms|Algorithms]]
- [[Software Engineering/02 Computer Science/Data Structures/Data Structures|Data Structures]]
- [[Software Engineering/02 Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]]
- [[Software Engineering/Questions|Questions]]

## Success Signals

The mandatory core is complete only if these outputs exist and are defensible:

- One working `Support Copilot Platform` demo that can ingest a small support corpus, answer a grounded question, and show citations on demand.
- One architecture packet with a high-level diagram, a written system-design walkthrough, and at least one ADR that explains a real tradeoff.
- One eval harness with a versioned golden set, deterministic checks, and a baseline-versus-latest regression summary.
- One bounded tool workflow with an explicit tool contract, logged decision path, and a refusal or fallback path for unsafe or unsupported requests.
- One telemetry and hardening pass with traces, stage-level latency metrics, error taxonomy, and a short operations scorecard or SLO note.
- One final portfolio bundle with a polished README, demo checklist, benchmark or ops summary, and a gap list for what stays out of scope.
- One written retrospective that states what improved, what still feels weak, and whether the next step is to stop at week 12 or continue into an optional month.
- One completed 12-week cadence with all core checkpoints written down, not skipped or merged into a vague end-of-quarter recap.

## References

- [.NET documentation](https://learn.microsoft.com/en-us/dotnet/) - Official runtime, C#, and ASP.NET Core entry point for the .NET-first backbone used throughout the plan.
- [ASP.NET Core performance best practices](https://learn.microsoft.com/en-us/aspnet/core/performance/performance-best-practices) - Concrete guidance for request-path hardening, latency control, and backend tradeoffs that show up in Weeks 4 and 11.
- [OpenTelemetry for .NET](https://opentelemetry.io/docs/languages/dotnet/) - Canonical tracing and metrics setup reference for the telemetry, observability, and regression-signaling parts of the flagship project.
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2025-03-26) - Primary source for MCP contracts, tool boundaries, and integration shape behind the bounded workflow section.
- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) - Focused risk anchor for prompt injection, data leakage, insecure tool use, and other concrete guardrail concerns in Week 8.
- [Designing Data-Intensive Applications](https://dataintensive.net/) - High-signal distributed-systems reference for queues, idempotency, scaling seams, and production tradeoffs that matter once the project leaves toy scope.
