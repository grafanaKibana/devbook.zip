---
publish: true
created: 2026-07-13T18:50:17.427Z
modified: 2026-07-18T11:30:02.627Z
published: 2026-07-18T11:30:02.627Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: Designing the capability surface and scaffold the model acts through — tools, protocols, execution environment.
level:
  - "3"
priority: Low
status: Done
---

Harness engineering is the discipline of deliberately designing everything the model acts _through_: the scaffold between the model's text output and the real world. It has three layers — the **tool surface** (which tools exist, how they are named, documented, and scoped — see [[Tools]]), the **wiring protocol** that connects tools to clients (see [[Model Context Protocol]]), and the **execution environment** (sandboxes, permissions, filesystem access — what the model is allowed to touch). The model only ever emits structured calls; the harness decides what those calls can reach and what happens when they run.

The scope ladder places it among its neighbors: [[AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]] shapes the single instruction, [[Context Engineering]] decides what the model _sees_, harness engineering decides what the model _can do_, and [[Loop Engineering]] decides how it iterates over time. The layers interact constantly — every tool schema the harness exposes is context the model must read, and every tool result feeds the next loop iteration — but the design questions are distinct: a harness question is "should this agent have a `delete_branch` tool, and who approves it?", not "which evidence goes first in the window?".

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Harness Engineering section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Model Context Protocol">Model Context Protocol</span></span></div><p class="db-card-summary">An open protocol standardizing how LLM apps connect to external tools and data.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Harness Engineering/Model Context Protocol.md" data-tooltip-position="top" aria-label="Model Context Protocol">Model Context Protocol</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Tools">Tools</span></span></div><p class="db-card-summary">The interface between an LLM's reasoning and the external world via function calling.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Harness Engineering/Tools.md" data-tooltip-position="top" aria-label="Tools">Tools</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# The Tool Surface Is an API for a Model

Designing the tool surface is API design where the consumer cannot read source code, ask clarifying questions, or debug — it selects tools by matching names and descriptions against its current subgoal. The harness-level decisions sit above any single tool's design:

- **Minimal, high-signal toolsets.** Expose only what the current task needs. Every connected schema is sent with every request and competes for attention — large toolsets measurably lower accuracy, not just raise cost (the MCPGauge numbers in [[Tools]]). The token side of this is a [[Context Engineering]] concern; deciding _which_ tools exist at all is a harness one.
- **Surface-wide consistency.** A surface where every tool follows the same naming scheme, return shape, and error contract lets the model transfer what it learned from one tool to the rest — consolidation patterns and naming specifics are covered in [[Tools]].

Depth on individual tool design — descriptions, parameters, return minimalism, fault tolerance — lives in [[Tools]].

# The Execution Environment

The third layer of the harness is what happens _after_ the model emits a call. Because the model never executes anything directly, the runtime is a natural enforcement point — controls placed here hold regardless of what the prompt says or what an injected instruction asks for:

- **Sandboxing.** Run tool execution in a constrained environment: a scoped filesystem root, a network allowlist, a container. The blast radius of a wrong or hostile call is bounded by the sandbox, not by the model's judgment.
- **Permission gating.** Classify operations by risk. Read-only calls can auto-approve; state-mutating or irreversible ones (deploy, delete, send, pay) route through explicit policy — allowlists, per-tool scopes, least-privilege credentials for whatever the tool touches downstream.
- **Human approval boundaries.** For the highest-risk actions, the harness pauses and asks. Where that boundary sits is a per-deployment design decision: too tight and the agent is a form-filler, too loose and one poisoned tool description can exfiltrate secrets (the tool-poisoning attacks in [[Model Context Protocol]]).

These are the deterministic, code-level controls that [[Guardrails]] recommends over prompt-level pleading: the prompt asks the model to behave; the harness makes misbehavior impossible or reviewable.

# Harness Quality and Agent Reliability

Harness effort deserves parity with prompt effort — the "tool quality" principle from the [[Agents]] hub. The reason is compounding: agents interact with the harness across many [[Agent Loop]] iterations, so a surface flaw doesn't cause one bad answer — it causes a wrong turn that every subsequent step builds on, and the resulting failures masquerade as model failures. The SWE-bench case study and the amortization argument (a fixed tool contract helps every run that shares the surface) are covered in [[Tools]].

# Questions

> [!QUESTION]- What is harness engineering, and how does it differ from context engineering?
>
> - Harness engineering designs everything the model acts _through_: the tool surface (which tools exist, how they're named and scoped), the wiring protocol (MCP), and the execution environment (sandboxes, permissions, approval boundaries)
> - Context engineering decides what the model _sees_ in its window; harness engineering decides what it _can do_; loop engineering decides how it iterates over time
> - They intersect — tool schemas consume context budget, tool results feed the loop — but the design questions differ: capability and safety boundaries versus signal selection and ordering

> [!QUESTION]- Why is the runtime, not the prompt, the right place to enforce what an agent may do?
>
> - The model never executes tools directly — it only emits structured calls; the runtime executes, so controls placed there cannot be talked around
> - Prompt-level rules fail under prompt injection or poisoned tool descriptions; code-level sandboxes, permission gates, and human-approval boundaries hold regardless of what enters the context
> - Practical layering: sandbox execution to bound blast radius, auto-approve read-only calls, gate state-mutating ones by policy, require a human for irreversible actions

> [!QUESTION]- Why does harness quality deserve as much investment as prompt quality for agent reliability?
>
> - Agents hit the harness on every loop iteration, so tool-surface flaws compound: one ambiguous name or vague error causes a wrong turn that later steps build on
> - Precise contracts and structured errors let the model self-correct; sloppy ones produce failures that masquerade as model failures
> - Harness fixes amortize across every run and every agent sharing the surface; prompt tweaks are flow-specific and fragile

# References

- [Writing effective tools for agents (Anthropic Engineering)](https://www.anthropic.com/engineering/writing-tools-for-agents) — practitioner guidance on designing, consolidating, and evaluating agent tool surfaces.
- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents) — source of the tool-quality principle and the treat-tools-as-API-design framing.
- [Model Context Protocol (Official docs)](https://modelcontextprotocol.io/) — the open standard for wiring tools and data sources to LLM clients.
- [Effective context engineering for AI agents (Anthropic Engineering)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — the neighboring discipline; covers why tool schemas count against the context budget.
