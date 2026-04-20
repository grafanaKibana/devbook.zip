# Week 05 — Retrieval Quality, Caching, and Monitoring
> [!note] Back to [[Hackathon - Senior AI Engineering Training Plan]]

Previous: [[Hackathon - Senior AI Engineering Training Plan - Week 04 - .NET Runtime and Concurrency for AI Workloads]] | Next: [[Hackathon - Senior AI Engineering Training Plan - Week 06 - AI System Design Foundations]]

## Goal

Improve retrieval quality with measurable evidence instead of intuition. This week is about hybrid search, selective reranking, safe caching, and stage-level monitoring for the Support Copilot Platform.

## Weekly Outcome

By the end of the week, the Support Copilot Platform should have one evidence-backed default retrieval mode, one documented cache policy that is safe for multi-tenant support traffic, and stage-level monitoring that can explain where latency or quality regressed. You should leave the week with a benchmark note, a retrieval decision, and enough instrumentation to defend that decision in an interview or architecture review.

## Suggested Weekly Flow

1. Define the retrieval-tuning hypothesis before changing code.
2. Compare vector-only, hybrid, and reranked variants.
3. Add cache policy that respects tenant and auth context.
4. Capture per-stage timings.
5. Save one benchmark note and one architecture view.

## Suggested Steps

### Step 1 — Pick the evaluation lens

- Identifier-heavy support questions
- paraphrased natural-language questions
- latency impact
- cache correctness and invalidation risk

### Step 2 — Implement one measurable tuning pass

- add hybrid retrieval
- test reranking only where it might improve precision
- instrument retrieve / rerank / answer stages

## Task Checklist

- [ ] Create a golden dataset of at least 25 support questions split across identifier-heavy, paraphrased, policy, and troubleshooting queries.
- [ ] For every golden query, record expected sources, expected tenant scope, and what a bad retrieval result looks like.
- [ ] Implement and compare at least three retrieval variants: vector-only, keyword plus vector hybrid, and hybrid plus reranking.
- [ ] Measure top-3 and top-5 retrieval hit rate for each variant on the same golden dataset.
- [ ] Capture p50 and p95 timings for query rewrite, retrieval, rerank, prompt assembly, and answer generation.
- [ ] Define explicit reranking budget rules, including when reranking is skipped for latency-sensitive flows.
- [ ] Add cache keys that include tenant, authz scope, retrieval mode, normalized query fingerprint, and relevant content version marker.
- [ ] Define cache invalidation rules for reindex, document update, permission change, and model prompt-version change.
- [ ] Add dashboards or logs that can isolate retrieval misses from answer synthesis failures.
- [ ] Write a one-page default retrieval decision with evidence, tradeoffs, and rollback conditions.

## Suggested Session Plan

### Session 1 — Build the evaluation pack

- Assemble the golden support cases from real-looking product scenarios.
- Group cases by query shape so you can tell whether hybrid search helps only identifier-heavy traffic or also helps fuzzy troubleshooting.
- Write down the initial hypothesis, for example: hybrid retrieval should increase top-3 hit rate on ticket-ID and SKU queries without pushing p95 over the team budget.

### Session 2 — Compare retrieval modes

- Run vector-only on the full golden set and save the baseline table.
- Add hybrid retrieval and compare quality deltas, not just averages but also which query groups changed.
- Add reranking only on a bounded candidate set, then measure whether precision gains justify the added latency.

### Session 3 — Make caching safe

- Design retrieval-result caching separately from answer caching so you can reason about blast radius.
- Define exact cache key shape and invalidation triggers for tenant, role, knowledge-base version, and query normalization.
- Verify that cache hits never cross tenant or authorization boundaries.

### Session 4 — Instrument the pipeline

- Add stage-level timings and structured logs around retrieve, rerank, prompt build, and answer generation.
- Emit counters for cache hit rate, rerank usage rate, unsupported-answer rate, and retrieval-empty rate.
- Confirm that you can explain one failed query by reading the traces instead of guessing.

### Session 5 — Decide and document

- Produce the benchmark table and summarize which retrieval mode becomes the default.
- Record the decision, the evidence behind it, and the guardrails for when to fall back or disable reranking.
- Sketch the retrieval architecture view that shows query path, cache layers, and monitoring points.

## Resource Pack

### Internal notes

- [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]], retrieval building blocks and where recall usually fails.
- [[Software Engineering/11 AI & ML/LLM/RAG/Re-ranking|Re-ranking]], when reranking improves precision and when it just burns latency budget.
- [[Software Engineering/11 AI & ML/LLM/RAG/Caching|Caching]], cache-layer tradeoffs and invalidation discipline.
- [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring|Monitoring]], what to instrument so retrieval tuning stays product-oriented.

### External docs

- [Azure AI Search hybrid search overview](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview), practical hybrid retrieval behavior and request shape.
- [Azure AI Search relevance scoring in hybrid and vector workloads](https://learn.microsoft.com/en-us/azure/search/search-relevance-overview), useful when interpreting why one candidate list beat another.
- [ASP.NET Core distributed caching](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed), cache implementation patterns that fit .NET-first services.
- [OpenTelemetry for .NET traces and metrics](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel), stage-level monitoring guidance for request pipelines.

## Implementation Tasks

Concrete Support Copilot Platform tasks for this week:

1. Add a retrieval experiment runner that replays the golden dataset against multiple strategies and writes a markdown or CSV summary.
2. Implement a retrieval options object that can switch between vector-only, hybrid, and hybrid plus rerank without code branching all over the pipeline.
3. Add a reranking threshold rule, for example rerank only the top 20 candidates when the initial recall score falls into a middle-confidence band.
4. Create a cache policy document and matching code checklist for:
   - retrieval result cache
   - answer cache, only if citations and auth scope allow it
   - cache-bypass paths for admin or debugging scenarios
5. Add structured fields to telemetry, including tenant ID, retrieval mode, candidate count, rerank applied, cache hit or miss, and final citation count.
6. Build a failure-mode table with at least these rows:

| Failure mode | Likely cause | Detection signal | Mitigation |
|---|---|---|---|
| Wrong document retrieved for identifier query | vector similarity misses exact token match | low hit rate on identifier bucket | add keyword plus vector hybrid |
| Good retrieval but bad final answer | synthesis prompt or answer model issue | cited doc is correct but answer disagrees | separate retrieval scorecard from answer review |
| Cache leak across tenants | incomplete cache key | identical query returns foreign source set | include tenant and authz scope in key |
| Reranking causes latency spikes | reranking on every request | p95 retrieve plus rerank stage exceeds budget | restrict rerank to bounded candidate counts and query classes |

7. Write a short ADR or decision memo that answers: why this default mode, what evidence supports it, what budget it consumes, and what would make you change it.

## Deep Study

- Read [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]].
- Read [[Software Engineering/11 AI & ML/LLM/RAG/Re-ranking|Re-ranking]].
- Read [[Software Engineering/11 AI & ML/LLM/RAG/Caching|Caching]].
- Read [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring|Monitoring]].

## Build Plan

- Compare retrieval modes on the same golden cases.
- Add permission-scoped cache keys.
- Capture stage timings.
- Decide which mode becomes the default.

Concrete outputs for the week:

- benchmark table
- retrieval architecture diagram
- cache-key checklist
- written default-mode decision

## System Design Drill

Explain the retrieval path only:

- query translation
- index choice
- fusion strategy
- reranking budget
- cache layers
- stage metrics and alerts

Guideline: explain this path in product-company terms. Start with the user question, then move through query normalization, retrieval mode choice, candidate fusion, reranking budget, cache lookup, and stage telemetry. If you can't point to where a regression would surface, the design is still too vague.

## DSA Plan

- Solve 1 top-k or heap problem.
- Solve 1 cache or hash-map problem.
- Explain where those patterns show up in candidate ranking and cache eviction.

## Best Practices

- Treat hybrid retrieval as the safe default for mixed support traffic.
- Use reranking as a precision tool, not a recall bandage.
- Make cache keys security-aware.
- Instrument the pipeline by stage, not just end-to-end latency.

## Common Mistakes

- Turning on reranking everywhere without latency evidence.
- Caching without tenant or authz scoping.
- Measuring only final answer quality and not retrieval stages.
- Treating retrieval tuning like research instead of product engineering.

## Review and Checkpoint

Use these prompts at the end of the week:

- Which retrieval variant won on top-3 hit rate, and did it also stay within the latency budget?
- Which query bucket still fails, identifier lookups, paraphrased troubleshooting, policy questions, or something else?
- Can you prove that cache keys are tenant-safe and permission-aware, not just claim it?
- If a support answer was wrong, could you tell whether retrieval, reranking, or answer generation failed?
- What exact condition would make you disable reranking in production?
- What is your rollback plan if the new default retrieval mode degrades p95 or citation quality?

## Useful Links

- [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]]
- [[Software Engineering/11 AI & ML/LLM/RAG/Re-ranking|Re-ranking]]
- [[Software Engineering/11 AI & ML/LLM/RAG/Caching|Caching]]
- [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring|Monitoring]]
- [Azure AI Search hybrid search overview](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- [Azure AI Search relevance scoring in hybrid and vector workloads](https://learn.microsoft.com/en-us/azure/search/search-relevance-overview)
- [ASP.NET Core distributed caching](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed)

## Definition of Done

- You compared at least three retrieval modes.
- You have a justified default retrieval strategy.
- Cache policy is explicit and safe.
- Monitoring can show where quality or latency regresses.
