# Week 11 — Production Hardening and Observability
> [!note] Back to [[Hackathon - Senior AI Engineering Training Plan]]

Previous: [[Hackathon - Senior AI Engineering Training Plan - Week 10 - DSA Intensification and Interview Reasoning]] | Next: [[Hackathon - Senior AI Engineering Training Plan - Week 12 - Synthesis, Portfolio Packaging, and Gap Review]]

## Hours

- Study: 2.5h
- Build: 2.5h
- System Design: 1.5h
- DSA: 1.5h
- Checkpoint: 1h
- Total: 9h

## Goal

Give the Support Copilot Platform a production posture: traces, stage-level metrics, cost awareness, evaluation regression awareness, and one explicit SLO/error-budget story.

## Weekly Outcome

By the end of the week, the Support Copilot Platform should have a clear production-readiness baseline: one traceable hot path, one scorecard that puts quality, latency, reliability, and spend side by side, and one written SLO plus error-budget policy with explicit rollback and fallback rules.

## Suggested Weekly Flow

1. Decide what healthy operation means.
2. Instrument the hot path.
3. Connect quality, latency, reliability, and cost in one operating view.
4. Define SLO and rollback logic.
5. Save one operations scorecard and one production-readiness note.

## Task Checklist

- [ ] Define one primary user-facing SLO for the Support Copilot Platform, with a target, measurement window, and excluded cases.
- [ ] Define one error budget policy that states what change velocity slows down when the budget is burned.
- [ ] Instrument the hot path with request tracing and stage-level timing for ingestion, retrieval, orchestration, model call, and response assembly.
- [ ] Capture a small error taxonomy with categories such as timeout, retrieval miss, grounding failure, provider failure, and internal exception.
- [ ] Add cost counters for model usage, retrieval calls, and any high-cost optional stage such as reranking.
- [ ] Compare the latest quality or eval result to an earlier baseline so you can explain whether latency or cost gains came with quality loss.
- [ ] Build one scorecard that shows latency, error rate, eval quality, and spend in the same view.
- [ ] Define one degraded-mode lever and one rollback trigger.
- [ ] Write one production-readiness note that states what is safe to ship now and what still blocks confidence.

## Suggested Session Plan

### Session 1, define healthy operation

- Choose the primary user-facing flow you care about.
- Write the SLO, the measurement window, and the allowed failure budget.
- Decide which signals matter most: latency, quality regression, error rate, and spend.

### Session 2, instrument the hot path

- Add tracing across the request path.
- Capture stage timings so you can tell whether retrieval, orchestration, or model latency dominates.
- Normalize error names so dashboards and logs tell a coherent story.

### Session 3, connect reliability and quality

- Compare the latest eval run with an earlier baseline.
- Add quality regression signals next to latency and errors.
- Decide which quality drop is acceptable during degraded mode and which one is not.

### Session 4, build the operating scorecard

- Put latency, error rate, quality, and spend into one view.
- Add alert thresholds and owners.
- Define one rollback trigger and one fallback lever.

### Session 5, write the readiness summary

- Produce the production-readiness note.
- State what you would ship now, what you would guard behind a flag, and what you would leave out.
- Rehearse the operating story as if an interviewer asked how you would run this system in production.

## Suggested Steps

### Step 1 — Define operating signals

- request latency
- stage timings
- error taxonomy
- eval regressions
- model and retrieval cost counters

### Step 2 — Build one coherent operating view

- traces
- latency metrics
- quality regression signal
- spend signal
- fallback or rollback triggers

## Resource Pack

### Internal notes

- [[Software Engineering/09 DevOps/Observability|Observability]]
- [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability Patterns]]
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs|Golden Test Set and Regression Runs]]
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Evaluation|Evaluation]]

### External docs

- [OpenTelemetry for .NET](https://opentelemetry.io/docs/languages/dotnet/) , setup guidance for traces, metrics, and exporters in a .NET-first service stack.
- [Azure Well-Architected Framework, operational excellence](https://learn.microsoft.com/azure/well-architected/operational-excellence/) , useful framing for runbooks, alerts, and production ownership.
- [SRE workbook](https://sre.google/workbook/table-of-contents/) , practical reference for SLOs, error budgets, and incident response tradeoffs.
- [Azure Monitor OpenTelemetry overview](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-overview) , useful if you want a concrete managed target for telemetry ingestion and visualization.

## Deep Study

- Read [[Software Engineering/09 DevOps/Observability|Observability]].
- Read [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability Patterns]].
- Read [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs|Golden Test Set and Regression Runs]].
- Read [[Software Engineering/11 AI & ML/LLM/Evaluation/Evaluation|Evaluation]].

## Build Plan

- Add request tracing.
- Add stage-level metrics.
- Add simple cost counters.
- Add a scorecard that puts reliability, latency, quality, and spend side by side.
- Compare the latest eval run to the week-2 baseline so you can say whether a performance or cost change improved the system or only moved pain around.
- Define one concrete fallback lever up front, for example cheaper-model route, reranker disable switch, or degraded-but-grounded response path.

Concrete outputs for the week:

- operations scorecard
- SLO/error-budget note
- production-readiness summary

## Implementation Tasks

- Instrument the main Support Copilot request path with distributed tracing in the .NET application and propagate correlation identifiers across async boundaries.
- Capture stage-level timing for retrieval, prompt assembly, model call, grounding checks, and response formatting.
- Define a small metric set you can actually act on: p50 and p95 latency, request failure rate, retrieval miss rate, grounded-answer pass rate, and cost per request band.
- Create one scorecard artifact that shows reliability, latency, quality, and spend together so tradeoffs are visible in one place.
- Write an `slo-error-budget.md` note with the target, budget window, alert thresholds, and the action you take when the budget burns too fast.
- Define one fallback lever up front, for example cheaper-model routing, reranker disable switch, or a degraded but grounded response path.
- Add one release guardrail: if quality drops below the chosen threshold or cost spikes above the bound for a defined window, pause rollout and revert the change.

## System Design Drill

Explain:

- SLO and error-budget target
- alert thresholds
- rollback triggers
- feature flags or targeted routes for expensive improvements

Do one rehearsal where you answer this exact question: "How would you know the Support Copilot Platform is healthy, and what would you do first when it stops being healthy?"

## DSA Plan

- Solve 1 interval or scheduling problem.
- Solve 1 queue, heap, or rate-limiting style problem.
- Map them back to alert windows, retry scheduling, or budget-aware prioritization.

Keep the DSA work subordinate to the operating story. The point is to sharpen reasoning about windows, prioritization, and queue pressure, not to start a second major track.

## Best Practices

- Put quality and spend next to latency, not in separate worlds.
- Keep operator signals small but meaningful.
- Prefer simple fallback levers over clever recovery flows.
- Make rollback triggers explicit before incidents happen.

## Common Mistakes

- Building dashboards without decisions attached.
- Tracking latency but not quality regressions.
- Improving quality in ways that silently explode cost.
- Using observability as decoration rather than control.

## Review and Checkpoint

Use these prompts when the scorecard and SLO note are done:

- What is the one SLO I would show first to prove the system is healthy?
- Which signal catches user pain earliest: latency, failure rate, quality regression, or spend anomaly?
- If the error budget burns fast for two days, what exact product or release behavior changes?
- Which fallback lever preserves trust best when the primary path gets expensive or unstable?
- Does the scorecard tell me what to do next, or does it only show data?
- What still blocks me from calling this system production-ready with a straight face?

## Useful Links

- [[Software Engineering/09 DevOps/Observability|Observability]]
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Evaluation|Evaluation]]
- [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs|Golden Test Set and Regression Runs]]
- [OpenTelemetry for .NET](https://opentelemetry.io/docs/languages/dotnet/)
- [SRE workbook](https://sre.google/workbook/table-of-contents/)
- [Azure Well-Architected Framework, operational excellence](https://learn.microsoft.com/azure/well-architected/operational-excellence/)
- [Azure Monitor OpenTelemetry overview](https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-overview)

## Definition of Done

- The Support Copilot Platform has a coherent ops view.
- You can explain the SLO and error-budget policy.
- Quality, latency, and cost are connected in one scorecard.
- You know what you would ship now versus what still needs hardening.

## Checkpoint Prompts

- What breaks first when load rises: latency, quality, reliability, or spend?
- Which metric would catch that failure earliest?
- What rollback or fallback would you trigger first?
- What would still block you from calling this production-ready?
