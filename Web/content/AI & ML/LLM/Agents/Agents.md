---
publish: true
created: 2026-02-10T16:03:55.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-31T08:53:28.445Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: Systems where an LLM controls part of the workflow, calling tools, making decisions, or directing other LLMs.
level:
  - "3"
status: Creation
priority: High
qard-deck: AI & ML
qard-topic: LLM/Agents/Agents
flashcard_uid: ef9c99bb
---

An agentic system gives an LLM control over part of a workflow: calling tools, making decisions, or directing other LLMs. The term "agent" is used loosely, so system design starts with one practical boundary:

- **Workflows** are systems where LLMs and tools are orchestrated through predefined code paths. The developer controls the sequence. The LLM handles individual steps.
- **Agents** are systems where the LLM dynamically directs its own process and tool usage, deciding what to do next based on results so far.

The simplest design that meets the need is usually the better choice. A single LLM call with good prompting and retrieval is the simplest starting point. Workflow orchestration belongs next, once a single call falls short. Autonomous agents earn their extra complexity only when the task is genuinely open-ended and unpredictable.

An agent joins the four steering disciplines of the [[AI & ML/LLM/LLM|engineering ladder]]: precise instructions ([[AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]]), a curated window ([[AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]]), a capability surface ([[AI & ML/LLM/Harness Engineering/Harness Engineering|Harness Engineering]] — [[Tool Design]] and [[Model Context Protocol|MCP]]), and a controlled runtime ([[AI & ML/LLM/Loop Engineering/Loop Engineering|Loop Engineering]] — the [[Agent Loop]] and [[Multi-Agentic Systems|multi-agent topologies]]). The design question is how much control to place in code and how much to give the model. Measuring the result is [[AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]].

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Agents section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Evaluation">Evaluation</span></span><span class="folder-map-node-count">3 notes</span></div><p class="db-card-summary">Measures outcome and process separately over a trajectory, since a task can fail by many paths.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Agents/Evaluation/Evaluation.md" data-tooltip-position="top" aria-label="Evaluation">Evaluation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Workflow Patterns">Workflow Patterns</span></span></div><p class="db-card-summary">Five orchestration patterns — chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer — from fixed pipelines to dynamic delegation.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Agents/Workflow Patterns.md" data-tooltip-position="top" aria-label="Workflow Patterns">Workflow Patterns</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid var(--interactive-accent, var(--secondary, #437100)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# The Augmented LLM

An augmented LLM can use retrieval, [[Tool Design|tools]], and memory. The model decides what to say or which tool to request. The surrounding harness builds the context, validates and runs tool calls, enforces operational limits, and carries selected state into later calls. [[Agent Loop]] follows that boundary across repeated decisions. This single-agent unit should work well before orchestration is added. Model choice, prompts, and clear tool contracts usually matter more than another control layer.

[[Model Context Protocol|Model Context Protocol (MCP)]] standardizes how an augmented LLM connects to external tools and data sources.

# Workflow Patterns

When one augmented LLM is not enough and full autonomy is excessive, five workflow patterns cover the middle ground: **prompt chaining**, **routing**, **parallelization**, **orchestrator-workers**, and **evaluator-optimizer**. The first pattern that fits is usually enough. Orchestrator-workers decides subtasks at runtime, making it a useful bridge into [[Multi-Agentic Systems]] for complex coding or research.

[[AI & ML/LLM/Agents/Workflow Patterns|Workflow Patterns]] describes each pattern, its control flow, and the conditions that make it fit.

# Autonomous Agents

Autonomy fits tasks whose steps cannot be predicted and whose control flow cannot be expressed as a fixed workflow. The model uses tools in a loop: observe the latest result, choose an action, execute it, and repeat.

```mermaid
flowchart TD
    H[Human task] --> A[Agent plans next step]
    A --> T[Execute tool or action]
    T --> E[Observe result]
    E --> C{Task complete?}
    C -->|No| A
    C -->|Yes| R[Return result to human]
    E -->|Blocked| HI[Ask human for input]
    HI --> A
```

That flexibility costs more model calls and introduces compounding error. A small mistake can become the premise for every later step. Three design principles contain the risk:

1. **Simplicity** — the control loop stays small. Extra branches make failures harder to isolate.
2. **Transparency** — the runtime records decisions, tool calls, results, and validation outcomes. A useful trace shows where the run diverged without depending on hidden model reasoning.
3. **Tool quality** — tool descriptions, parameters, errors, and outputs form an API contract. Ambiguous tools produce ambiguous actions.

Agents work best when progress is observable. Tests constrain coding tasks, resolution criteria constrain support work, and cited evidence constrains research. Without a checkable success signal, the loop has no reliable way to distinguish progress from drift. Measuring task success, trajectory quality, tool-call correctness, and reliability across stochastic runs is [[AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]].

For patterns on coordinating multiple agents, see [[Multi-Agentic Systems]].

# Memory Systems

Agent memory is durable state with explicit rules for storage and reuse. It is more than a transcript replayed on every turn or a vector index. Raw messages, tool calls, and results remain trace evidence. A promotion step chooses which observations become durable records, adds scope and provenance, and rejects unverified or duplicate entries. Later calls rebuild a bounded context from applicable rules, stable preferences, relevant memories, and recent state.

A useful design separates five kinds of record. This is an architectural choice, not a universal standard. The separation makes one problem visible: each kind of memory needs a different read path.

| Memory | Represents | Read path |
| --- | --- | --- |
| Policy | Authoritative constraints and procedures | Exact, exhaustive lookup |
| Preference | Stable user or tenant parameters | Exact, exhaustive lookup |
| Fact | Durable assertions with provenance | Scoped lexical, semantic, or hybrid retrieval |
| Episode | A completed task or reusable experience | Scoped retrieval over a compact summary |
| Trace | Raw execution and conversation events | Replay, audit, and extraction source |

Durable records need rules for status, supersession, retention, and deletion. When a record changes, derived indexes and caches must be invalidated. Embeddings are a rebuildable search projection over canonical content, not the only copy of a fact. Authorization scope must be checked before ranking. Relevance metadata cannot enforce access.

Memory systems usually repeat three operations: `record → recall → consolidate`. Consolidation turns raw observations into smaller durable records. Scheduled summaries are another form of derived state. Neither changes model weights or makes answers more accurate by itself. Promoted facts still need provenance, privacy controls, and evaluation.

# Questions

<!-- qard-id: ea50cefb-21a2-42d5-8eed-b2ddc02f1151 -->

> [!qard]- When does a workflow fit better than an autonomous agent?
> A workflow fits better when the steps and branches can be defined in advance. Code then controls the path, and the model handles individual steps inside it. An autonomous agent is justified only when the next action must depend on intermediate results that cannot be anticipated, and that flexibility is worth its extra cost and risk.
>
> | Aspect | Workflow | Autonomous agent |
> |---|---|---|
> | Who chooses the next step | Application code follows predefined paths. The model works inside individual steps or picks one of several predefined branches. | The model decides its next action and tool use from the results so far. |
> | Predictability | The possible paths are known before the run, so each one can be tested and reproduced. | The path emerges at runtime, so two runs of the same task can take different routes. |
> | Cost and latency | Easier to predict, because the possible calls follow from the defined paths. | Depend on how many model and tool calls the agent decides to make. |
> | Failure exposure | Failures occur at known steps, where code can add checks before the next step runs. | An early mistake can become the premise for later steps and compound. |
>
> The usual default is the simplest design that meets the need: a single well-prompted call first, a workflow when one call is not enough, and an agent only when no fixed path can express the task.
>
> [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents)

<!-- qard-id: 33550e71-28d8-4ee2-b8c5-28bc5fc1d793 -->

> [!qard]- How can errors compound during an autonomous agent run, and what controls contain them?
> Errors compound because each step builds on what earlier steps produced. An agent reasons over earlier observations, acts, and feeds the new result into its next decision. A wrong assumption or misread tool result therefore does not stay one bad output: it becomes the premise for later actions. For example, an agent that looks up the wrong order can then refund, email and log against that order, with every step consistent with the original mistake.
>
> Several design controls contain this risk:
>
> - **Step, cost or time limits** set for the task end a run that keeps acting without converging, so drift has a bounded cost.
> - **Checks against expected outcomes**, such as tests or validation of tool results, can catch bad progress before more steps depend on it.
> - **Recovery or escalation paths** define what happens when the run cannot proceed safely, such as stopping with a report or asking a human for input.
> - **Traces** of decisions, tool calls and results show where the run diverged, which makes the failure diagnosable.
>
> These controls reduce risk; they do not guarantee that the agent recovers or reaches a correct result.
>
> [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) · [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents)

<!-- qard-id: c989c5db-9cf9-4d2e-ae61-774921321d33 -->

> [!qard]- What makes a task a good fit for an autonomous agent?
> An agent is useful when the path cannot be fully specified in advance and intermediate results must influence the next action. The outcome still needs criteria that can eventually determine success or failure; delayed feedback can work when execution has a timeout, checkpoints, and a recovery plan. If success stays vague, the system cannot tell whether another action helped. [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents)

# References

- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents)
- [Microsoft Agent Framework — Overview (Microsoft Learn)](https://learn.microsoft.com/en-us/agent-framework/overview/)
