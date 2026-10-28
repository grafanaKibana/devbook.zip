---
publish: true
created: 2026-10-28T12:27:02.651Z
modified: 2026-10-28T12:27:33.658Z
published: 2026-10-28T12:27:33.658Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: Designing control flow, stopping, verification, and recovery across repeated model calls.
level:
  - "3"
priority: Medium
status: Done
qard-deck: AI & ML
qard-topic: LLM/Loop Engineering/Loop Engineering
flashcard_uid: 3d544ed9
---

Loop engineering designs the runtime around repeated model calls. It controls the observe → decide → act cycle, defines when work is finished, checks progress between steps, and hands uncertain decisions to a person.

A single call is bounded. A loop carries each result into the next iteration, so mistakes can accumulate just as easily as useful progress. Good loop design keeps small errors small. Model quality alone cannot do that.

This is the last rung of the runtime stack. [[AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]] shapes one instruction. [[AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] shapes what the model sees, while [[AI & ML/LLM/Harness Engineering/Harness Engineering|Harness Engineering]] controls what it can do. Loop engineering adds time: how behavior develops across turns. [[Agent Loop]] covers the mechanics of that cycle, and [[Multi-Agentic Systems]] covers coordination among several loops.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Loop Engineering section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Agent Loop">Agent Loop</span></span></div><p class="db-card-summary">The execution cycle, ReAct's think-act-observe, that turns an LLM into an autonomous tool-using problem solver.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Loop Engineering/Agent Loop.md" data-tooltip-position="top" aria-label="Agent Loop">Agent Loop</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Multi-Agentic Systems">Multi-Agentic Systems</span></span></div><p class="db-card-summary">Coordinating multiple LLM agents, each with its own context and tools, on tasks one agent handles poorly.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Loop Engineering/Multi-Agentic Systems.md" data-tooltip-position="top" aria-label="Multi-Agentic Systems">Multi-Agentic Systems</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid var(--interactive-accent, var(--secondary, #437100)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Termination and Budgets

An agent loop has no natural end. It can keep calling tools for as long as the runtime asks for another step, with every weak result becoming input to the next one. Hard bounds belong in the initial design.

- **Iteration caps** set a hard per-request limit on loop cycles. The cap is the final defense against an infinite tool-call sequence. [[Agent Loop]] shows concrete framework controls and the failure they prevent.
- **Token and cost budgets** track cumulative use and stop or compact the run before it exhausts the context window or spend ceiling.
- **Checkable stop criteria** separate stopping from success. A turn with no remaining tool calls shows only that the model has stopped requesting actions; completion needs task-specific evidence the runtime can verify, such as a passing test suite or a schema-valid artifact. Instructions to stop may help, but they do not replace hard limits.
- **A budget fallback** determines what happens at the cap. The runtime can return the best partial result with a warning or escalate to a person. Silent truncation hides the failure.

# Verification Inside the Loop

A loop that only generates will drift. Verification turns each iteration into a chance to recover.

- **Gates between steps** validate an intermediate result before another iteration consumes it. A rejected schema or failed output check should return a clear error that the next pass can act on.
- **Self-checks** use a second model pass to compare a draft with explicit criteria and feed revisions back. This is the evaluator-optimizer pattern described in [[AI & ML/LLM/Agents/Agents|Agents]].
- **Ground-truth signals** give the strongest feedback: a test passes, code compiles, or a claim traces to a source. Loops work best when success is externally checkable. [[AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]] covers trajectory quality and reliability across stochastic runs.
- **Human escape hatches** pause work when an action is irreversible or its result cannot be checked safely. [[Guardrails]] explains why the boundary must live in code and infrastructure rather than the prompt.

# State Across Iterations

Each iteration adds calls and results to the history. Without intervention, context grows until the runtime truncates it or the model reaches its limit. [[AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] decides what belongs in the window. Loop engineering decides when to compact, offload, or stop.

- **Compaction cadence** schedules summaries against a token threshold before overflow removes old, potentially important messages.
- **Offloading between turns** moves large artifacts to external storage and keeps lightweight references in context. [[Multi-Agentic Systems]] uses the same filesystem-artifact pattern for handoffs.
- **State outside the window** gives the loop a durable plan or progress log to reread after compaction. Long runs remain tied to the original goal even when early turns have been summarized away.

# Questions

<!-- qard-id: 638a8ef2-9d81-4a06-a5d4-43fd0f3c5d3e -->

> [!qard]- What does a tool-using model need from a runtime to operate as a loop?
> The runtime executes requested tools, returns observations to the model, and decides whether another turn runs. It owns the completion check and operational bounds; the model’s final text alone does not prove the task succeeded. A one-call tool request becomes a loop only when the runtime sends its result back for another decision. [Claude tool-use loop](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)

<!-- qard-id: 599da810-5eee-4ed5-ae4b-95b2737c4d8f -->

> [!qard]- What should a runtime report when its loop budget expires before the task is complete?
> The runtime reports that the run stopped incomplete, not that it succeeded. The report names the limit that was reached, the completion condition that is still unmet, and the partial result or state produced so far.
>
> - **Why it matters:** budget exhaustion is not success. If partial output is presented as a final answer or silently truncated, callers treat unfinished work as done and the failure stays hidden.
> - **What follows:** where the application configures it, the partial state and the unresolved work pass to a continuation run or to a person. Otherwise the run ends with an explicit error.
>
> Platform behavior differs. The OpenAI Agents SDK treats reaching `max_turns` as an error condition and supports a handler for that case. With Anthropic task budgets, a task that exceeds its budget can end with a partial result.
>
> Sources: [OpenAI Agents SDK: Running agents](https://openai.github.io/openai-agents-python/running_agents/) · [Anthropic task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets)

<!-- qard-id: 29510b5e-892b-49d6-9b58-c95c4a2ba3d4 -->

> [!qard]- In a long-running agent, how is compaction work split between deciding what context to keep and deciding when to compact?
> Compaction needs two separate decisions. The content decision, owned by context engineering, determines what the model still needs and what a summary must preserve. The timing decision, owned by loop engineering, determines when to compact, offload an artifact or stop. Compaction typically runs at a token threshold, before the next request would overflow the window.
>
> | Decision | What it settles | Failure when it is neglected |
> |---|---|---|
> | Content (context engineering) | Which goals, decisions, open issues and references a summary keeps | The summary drops a constraint, and later turns proceed without it |
> | Timing (loop engineering) | When to summarize, when to move large artifacts to external storage behind lightweight references, and when to stop | The window overflows, and truncation removes old messages that may still matter |
>
> Durable state sits outside both decisions. A plan or progress log stored by the application can be reread after compaction, which keeps a long run tied to its original goal. OpenAI Responses API compaction, for example, carries prior state forward as smaller, opaque compaction items. Plans and artifacts that the application must rely on remain application-managed.
>
> This split is a convention for assigning responsibility, not a boundary defined by an API.
>
> Source: [OpenAI: Compaction](https://developers.openai.com/api/docs/guides/compaction)

# References

- [Claude Agent SDK — overview (Anthropic)](https://platform.claude.com/docs/en/agent-sdk/overview)
