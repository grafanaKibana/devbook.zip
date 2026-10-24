---
publish: true
created: 2026-10-17T18:11:50.065Z
modified: 2026-10-17T18:11:50.066Z
published: 2026-10-17T18:11:50.066Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: Designing the tools, protocol wiring, and execution boundary that a model acts through.
level:
  - "3"
priority: Medium
status: Done
qard-deck: AI & ML
qard-topic: LLM/Harness Engineering/Harness Engineering
flashcard_uid: c0ec4e2e
---

Harness engineering designs the boundary between a model's structured output and the systems that act on it. The boundary includes the callable operations in [[Tool Design]], the developer-facing extension surfaces in [[AI & ML/LLM/Harness Engineering/Tooling/Tooling|Tooling]], the client wiring defined by [[Model Context Protocol]], and the execution environment that controls permissions and filesystem access. The model proposes a call. The harness decides what that call can reach and what happens when it runs.

This puts harness engineering in the middle of the runtime stack. [[AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]] shapes one instruction, while [[AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] decides what the model sees. Harness engineering sets what it can do. [[AI & ML/LLM/Loop Engineering/Loop Engineering|Loop Engineering]] controls how the work continues over time.

The boundaries overlap. Tool schemas consume context, and tool results feed later iterations. Still, the harness owns a different decision: whether an agent should have a `delete_branch` tool at all, and which policy approves its use.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Harness Engineering section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Tooling">Tooling</span></span><span class="folder-map-node-count">6 notes</span></div><p class="db-card-summary">The developer-facing tools and extension points that make an agent useful inside a repository.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Harness Engineering/Tooling/Tooling.md" data-tooltip-position="top" aria-label="Tooling">Tooling</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Model Context Protocol">Model Context Protocol</span></span></div><p class="db-card-summary">An open protocol standardizing how LLM apps connect to external tools and data.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Harness Engineering/Model Context Protocol.md" data-tooltip-position="top" aria-label="Model Context Protocol">Model Context Protocol</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid var(--interactive-accent, var(--secondary, #437100)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# The Tool Surface Is an API for a Model

The tool surface is an API for a consumer that cannot inspect its implementation. A model chooses among tools from their names, descriptions, and schemas, then interprets whatever each call returns. That makes a few surface-wide decisions especially important:

- **Small surface.** Only the tools the current task needs are exposed. Every connected schema competes for attention on every request. Large toolsets cost tokens because their schemas enter the model's context, and overlapping tools leave more options to choose between. The MCPGauge results in [[Tool Design]] come from whole MCP-assisted runs, including retrieved content, so they show run-level token and accuracy effects rather than isolating the number of schemas. [[AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] manages that token cost. The harness decides which tools exist.
- **Consistent contracts.** Shared naming, return shapes, and error conventions let the model reuse what it learned from one tool when it calls another. [[Tool Design]] covers the lower-level naming and consolidation patterns.

Individual descriptions, parameters, compact results, and failure behavior belong in [[Tool Design]]. Skills, plugins, hooks, coding agents, and repository instructions live together under [[AI & ML/LLM/Harness Engineering/Tooling/Tooling|Tooling]].

# The Execution Environment

The execution environment takes over after the model emits a call. Since the model does not execute the operation itself, the runtime can enforce rules that no prompt or injected instruction can bypass.

- **Sandboxed execution.** A scoped filesystem, network allowlist, or container limits the damage from a mistaken or hostile call.
- **Risk-based gating.** Read-only operations may run automatically. State-changing or irreversible work such as deploying, deleting, sending, or paying passes through explicit policy and runs with least-privilege credentials.
- **Human approval.** The highest-risk actions need a person at the boundary. Too many pauses turn the agent into a form filler. Too few leave room for a poisoned tool description to exfiltrate secrets, as the attacks in [[Model Context Protocol]] demonstrate.

These are the deterministic controls described by [[Guardrails]]. A prompt can request safe behavior. The harness can make an unsafe operation impossible or force it through review.

# Harness Quality and Agent Reliability

A weak harness can waste a strong model. Agents reuse the same surface across many [[Agent Loop]] iterations, so one ambiguous name or vague error can send a run down the wrong path and keep it there. Those failures often look like model failures even though the interface caused them.

The "tool quality" principle in the [[AI & ML/LLM/Agents/Agents|Agents]] hub gives harness work the same weight as prompt work. One repaired tool contract improves every run that shares it. [[Tool Design]] covers that amortization argument and the SWE-bench case study behind it.

# Questions

<!-- qard-id: d15112b8-f911-4f82-baa3-da3d67bbbf35 -->

> [!qard]- How do context, harness, and loop engineering differ in what they control?
> The three disciplines own different decisions about the same agent run. Context engineering decides what the model sees. Harness engineering decides what the model's proposed actions can reach and do. Loop engineering decides whether and how the work continues across turns.
>
> | Discipline | Decision it owns | Typical controls |
> |---|---|---|
> | Context engineering | Which information the model receives on each call | Selecting and compacting instructions, retrieved evidence, history and tool results |
> | Harness engineering | What the runtime allows a proposed action to do once the model emits it | Which tools exist, their permissions and credentials, call validation, sandboxing and approval gates |
> | Loop engineering | Whether another turn happens and when the run stops | Progress and verification checks, iteration and cost budgets, and termination |
>
> The boundaries touch. Tool schemas take up context and tool results feed later turns, so context engineering decides how much of them the model sees. Whether a tool such as `delete_branch` exists at all, and which policy approves its use, remains a harness decision.
>
> Sources: [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

# References

- [Writing effective tools for agents (Anthropic Engineering)](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Model Context Protocol (Official docs)](https://modelcontextprotocol.io/)
