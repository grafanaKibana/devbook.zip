---
publish: true
created: 2026-07-18T14:02:43.910Z
modified: 2026-07-18T14:02:43.910Z
published: 2026-07-18T14:02:43.910Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: Designing how a model-driven system iterates — control flow, termination, verification, and recovery across turns.
level:
  - "3"
priority: Medium
status: Done
---

Loop engineering is the discipline of designing the runtime that wraps the model: how the system iterates (observe → decide → act), when it stops, how progress is verified between steps, how errors are caught before they compound, and when control escalates to a human. A single model call is stateless and bounded; a loop is neither — every iteration conditions on the output of the last one, so the loop's design, not the model's quality, determines whether small mistakes stay small or cascade into a derailed run.

It is the last rung of the scope ladder: [[AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]] shapes one instruction, [[Context Engineering]] shapes what the model sees, [[Harness Engineering]] shapes what it can do, and loop engineering shapes how it behaves over time. It is the rung that turns a model-with-tools into an agent — the mechanics of that cycle live in [[Agent Loop]], and what changes when several loops must coordinate lives in [[Multi-Agentic Systems]].

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Loop Engineering section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Agent Loop">Agent Loop</span></span></div><p class="db-card-summary">The execution cycle, ReAct's think-act-observe, that turns an LLM into an autonomous tool-using problem solver.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Loop Engineering/Agent Loop.md" data-tooltip-position="top" aria-label="Agent Loop">Agent Loop</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Multi-Agentic Systems">Multi-Agentic Systems</span></span></div><p class="db-card-summary">Coordinating multiple LLM agents, each with its own context and tools, on tasks one agent handles poorly.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Loop Engineering/Multi-Agentic Systems.md" data-tooltip-position="top" aria-label="Multi-Agentic Systems">Multi-Agentic Systems</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Termination and Budgets

The defining risk of a loop is that it has no natural end: a model will keep calling tools as long as the runtime keeps asking it what to do next, and each slightly-off step conditions the next one — errors compound with iteration count. Bounding the loop is therefore the first design decision, not an afterthought:

- **Iteration caps** — a hard per-request limit on loop cycles. The cap is the last line against infinite tool-call cycles; the concrete framework knobs and the failure case they prevent are in [[Agent Loop]].
- **Token and cost budgets** — track cumulative tokens per iteration and terminate or compact before the context window fills or the spend ceiling is hit, rather than letting the run fail mid-flight.
- **Stop criteria** — define what "done" looks like in a form the system can check: the model returns text with no tool calls, a test suite passes, a schema-valid artifact exists. Prompt-level stop instructions complement but never replace the hard caps.
- **Fallback on budget exhaustion** — decide upfront what happens at the cap: return the best partial result with a quality warning, or escalate to a human. Silently truncating is the worst option.

# Verification Inside the Loop

A loop that only generates drifts; a loop that checks its own progress self-corrects. Verification points are what convert the compounding-error dynamic into a feedback loop:

- **Gates between steps** — programmatic checks that validate an intermediate output before the next iteration consumes it: schema validation on tool arguments, output checks between chained calls. The gate rejects and returns a clear error so the model can self-correct on the next pass.
- **Self-checks** — a second model pass evaluates the draft against criteria and feeds revisions back (the evaluator-optimizer pattern; see [[Agents]] for the workflow-pattern taxonomy).
- **Ground-truth signals** — the strongest feedback is external and objective: tests pass or fail, code compiles, a claim traces to a source. Tasks with checkable success signals are exactly where loops work well; measuring loop quality rigorously — trajectory, tool-call correctness, reliability across stochastic runs — is [[AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]].
- **Human-in-the-loop escape hatches** — for actions the system cannot safely verify (irreversible side effects, low-confidence states), the loop pauses and asks rather than guessing. Enforce the critical controls in code and infrastructure, not the prompt (see [[Guardrails]]).

# State Across Iterations

Every iteration appends reasoning, tool calls, and results to the history, so a loop's context grows monotonically by default — the loop is what makes context management a runtime problem rather than a one-time assembly problem. The division of labor: [[Context Engineering]] decides _what_ the window should contain; loop engineering decides _when_ to act on it:

- **Compaction cadence** — schedule summarization of older turns against the token budget (e.g. compact when cumulative tokens cross a threshold), instead of reacting when the window overflows and the runtime truncates the oldest — often most important — messages.
- **Offloading between turns** — write large intermediate artifacts to external storage mid-run and carry lightweight references forward, so the working window stays compact while detail remains retrievable. [[Multi-Agentic Systems]] uses the same move as the filesystem-artifact pattern for handoffs.
- **State that outlives the window** — a plan file, scratchpad, or progress log the loop re-reads each iteration survives compaction and keeps long runs anchored to the original goal even after early turns are summarized away.

# Questions

> [!QUESTION]- What does loop engineering add on top of a model with tools, and why is it its own discipline?
>
> - A model with tools is still one call; the loop is the runtime that iterates it: observe → decide → act, repeated until a stop condition
> - Because each iteration conditions on the last, errors compound — the loop design (caps, gates, feedback) determines whether mistakes stay small or cascade
> - It owns the time dimension the other rungs lack: prompt engineering shapes one instruction, context engineering what the model sees, harness engineering what it can do; the loop shapes behavior over many turns
> - Concretely it decides: when to stop (iteration/token/cost budgets), how to verify progress (gates, self-checks, ground truth), and when to escalate to a human

> [!QUESTION]- What are the main ways to bound a loop, and why are prompt-level stop instructions not enough?
>
> - Hard iteration caps per request, cumulative token/cost budgets with early termination, and checkable stop criteria (no tool calls, tests pass, valid artifact)
> - Prompt instructions ("stop if repeating yourself") reduce waste but are advisory — the model can ignore them, so they complement rather than replace hard limits enforced by the runtime
> - Define fallback behavior at the cap upfront: return best partial result with a warning, or escalate to a human — never silently truncate
> - The motivation is compounding error and cost runaway: a documented unbounded run burned 9.7M tokens across 369 repeated tool calls without converging (see [[Agent Loop]])

> [!QUESTION]- How do loop engineering and context engineering divide the work of managing a long run's history?
>
> - Context engineering decides WHAT belongs in the window: selection, ordering, structure, what a summary must preserve
> - Loop engineering decides WHEN to act: compaction cadence tied to the token budget, when to offload artifacts to external storage, when to terminate instead of compact
> - The loop makes it a runtime problem — history grows every iteration, so thresholds and triggers must be part of the loop design, not a one-time assembly choice
> - Durable state (plan files, scratchpads re-read each turn) bridges the two: it survives compaction and keeps the loop anchored to the goal

# References

- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents) — the loop as "LLM using tools in a loop", plus the simplicity/transparency/feedback principles that motivate gates and stop criteria.
- [Multi-Agent Research System — Engineering (Anthropic)](https://www.anthropic.com/engineering/multi-agent-research-system) — production lessons on budgets, artifact offloading, and coordinating many loops.
- [Effective context engineering for AI agents (Anthropic Engineering)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — compaction, note-taking, and sub-agent isolation as long-horizon loop techniques.
- [Claude Agent SDK — overview (Anthropic)](https://platform.claude.com/docs/en/agent-sdk/overview) — a production harness whose runtime implements the loop: automatic context compaction, permission gates, and session state.
