---
publish: true
title: Agent Evaluation
created: 2026-08-20T20:41:15.469Z
modified: 2026-08-25T10:26:26.191Z
published: 2026-08-25T10:26:26.191Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: Measures outcome and process separately over a trajectory, since a task can fail by many paths.
level:
  - "3"
priority: High
status: Done
---

Evaluating an [[AI & ML/LLM/Agents/Agents|agent]] means evaluating a _trajectory_, not a single answer. The agent chooses a tool, reads the result, and decides what to do next. Two runs can reach the same result by very different routes. A third can look reasonable for several steps and then fail. A final-answer score hides that difference. Agent evaluation separates the **outcome** (was the task completed?) from the **process** (was the route sound and efficient?).

Agent evaluation reuses the machinery in [[AI & ML/LLM/Evaluation/Evaluation|LLM Evaluation]]: [[Building an Evaluation Set|building the task set]], applying [[Deterministic Checks]] to tool schemas and arguments, using [[LLM-as-a-Judge]] for semantic grading, and closing the [[Online Evaluation and AB Tests|online/A-B loop]]. The difference is the unit being scored. These checks operate over a sequence of actions rather than one model response.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Evaluation section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Agent Benchmarks">Agent Benchmarks</span></span></div><p class="db-card-summary">Public task suites scoring multi-step tool use. Useful to shortlist models, not to decide.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Agents/Evaluation/Agent Benchmarks.md" data-tooltip-position="top" aria-label="Agent Benchmarks">Agent Benchmarks</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Tool-Call Evaluation">Tool-Call Evaluation</span></span></div><p class="db-card-summary">Scoring each agent tool call on four axes: right tool, correct arguments, valid call, and necessity.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Agents/Evaluation/Tool-Call Evaluation.md" data-tooltip-position="top" aria-label="Tool-Call Evaluation">Tool-Call Evaluation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Trajectory Evaluation">Trajectory Evaluation</span></span></div><p class="db-card-summary">Scoring the whole path an agent took via reference-trajectory match or an LLM judge over the trace.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Agents/Evaluation/Trajectory Evaluation.md" data-tooltip-position="top" aria-label="Trajectory Evaluation">Trajectory Evaluation</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# What to Measure

```mermaid
flowchart TD
    T[Task] --> A[Agent trajectory: tool calls + observations + steps]
    A --> O[Outcome eval]
    A --> P[Process eval]
    O --> O1[Task success: final state correct]
    P --> P1[Tool-call correctness]
    P --> P2[Trajectory quality: reasonable path]
    P --> P3[Efficiency: steps, cost, latency]
    P --> P4[Robustness: error recovery, termination]
```

- **Task success (outcome).** Check the resulting state, not the agent's claim about it. Assert the refund row, run the generated code against tests, or diff the written file. This is the closest thing to ground truth, but it says nothing about how the agent arrived there.
- **Tool-call correctness (process).** Check whether each tool was appropriate, its arguments were valid, and the call was needed. Schema and allowlist checks belong in [[Deterministic Checks]]. Judging necessity or tool choice often needs a reference trace or a rubric. [[Tool-Call Evaluation]] breaks this down into selection, arguments, validity, and necessity.
- **Trajectory quality (process).** Inspect whether the trace follows a reasonable route. Wandering, repeated work, and lucky recovery from a bad branch matter even when the final state is correct. [[Trajectory Evaluation]] covers reference matching and rubric-based judgment for the whole trace.
- **Efficiency.** Record steps, token cost, and wall-clock latency per task. Fourteen calls for work that normally takes four is a regression even if both runs succeed. More steps also create more places for the run to go wrong.
- **Robustness and termination.** Inject tool failures and watch what happens. The agent must recover when recovery is possible and stop when the task is complete. Track loops, oscillation, and step-cap hits directly. A one-shot evaluation cannot expose them.

Average success hides shaky behavior. A task that passes 6 runs out of 10 is materially different from one that passes every time, although either can look perfect in a single demo. Run each task `k` times and report the share solved on _all_ attempts, using a pass^k-style reliability metric alongside the mean pass rate.

[[Agent Benchmarks]] explains what public suites such as SWE-bench, tau-bench, GAIA, and WebArena actually measure. Those scores are useful orientation, though they rarely predict performance on a private toolset and task distribution.

# Example

A per-task scorecard for a customer-support agent (one task, run k=5 times):

```text
Task: "Refund the damaged item on order #4815 and email the customer"

Outcome (verifiable end state):
- refund_issued(order=4815, amount=full)   -> assert DB row
- email_sent(to=customer, topic=refund)    -> assert outbox

Process (per trajectory):
- Tool-call validity: all calls schema-valid, no disallowed actions  (deterministic)
- Tool selection: used lookup_order before issue_refund               (judge / reference)
- Efficiency: 4 steps, $0.011, 3.2s   (budget: <=6 steps, <$0.02, <5s)
- Termination: stopped after success, no loop

Reliability: solved on 5/5 runs  (pass^5 = 1.0)
```

# Tradeoffs

| Approach | What it catches | Cost | When to rely on it |
| --- | --- | --- | --- |
| Outcome-only (verifiable end state) | Whether the task was completed | Low: one state assertion, no judge | Every task. It is strong evidence but blind to path quality |
| Reference-trajectory match | Deviation from a known route | High: reference traces require manual upkeep | Narrow tasks where one route genuinely dominates |
| LLM-as-judge over the trace | Whether the path and tool choices make sense | Medium: one judge call per trajectory | Open-ended tasks with several valid routes, calibrated against human labels |
| Efficiency / cost counters | Waste and looping | Very low: instrumentation only | Every task, paired with outcome checks |

Gate releases on **verifiable task success plus efficiency limits**. Both are cheap and objective. Add trajectory judgment when many routes are valid and the outcome cannot separate a clean solve from a lucky one. Hand-built reference traces belong only on narrow, high-stakes tasks. Maintaining them across a broad suite becomes its own project.

# References

- [Trajectory evaluations -- reference-match and LLM-judge scoring of agent trajectories (LangSmith docs)](https://docs.langchain.com/langsmith/trajectory-evals)
