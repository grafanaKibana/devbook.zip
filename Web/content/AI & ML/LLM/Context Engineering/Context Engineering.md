---
publish: true
created: 2026-08-20T20:41:15.477Z
modified: 2026-08-20T20:41:15.478Z
published: 2026-08-20T20:41:15.478Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: Deliberately deciding what fills the finite context window, and in what order, to maximize useful signal.
level:
  - "2"
priority: High
status: Done
---

Context engineering decides what the model sees and where it appears in the context window. Instructions compete with examples, retrieved evidence, conversation history, and tool traffic for the same finite budget. Once a system gains retrieval or memory, [[AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompting]] is only one part of an assembled payload.

On the [[AI & ML/LLM/LLM|engineering ladder]], context engineering sits between the instruction and the runtime around it. [[AI & ML/LLM/Harness Engineering/Harness Engineering|Harness Engineering]] controls what the model can do. [[AI & ML/LLM/Loop Engineering/Loop Engineering|Loop Engineering]] controls repeated behavior. Context engineering controls the material available for each decision.

The hard constraint is uneven attention inside a limited window. Models tend to use evidence near the beginning and end better than evidence buried in the middle. And answer quality can decline as otherwise relevant input grows, often called context rot. More context is therefore a poor default. The target is the smallest well-ordered context that still contains the evidence needed for the task.

```mermaid
flowchart TD
    subgraph CW[Context window -- finite shared budget]
      SP[System prompt]
      H[Conversation history]
      RC[Retrieved evidence]
      TS[Tool schemas and results]
      O[Reserved output space]
    end
    SP --> M[Model attention]
    H --> M
    RC --> M
    TS --> M
```

Retrieval is the main way external evidence enters the window. [[AI & ML/LLM/Context Engineering/RAG/RAG|RAG]] selects and ranks that evidence, then bounds how much of it reaches generation.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Context Engineering section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="RAG">RAG</span></span><span class="folder-map-node-count">11 notes</span></div><p class="db-card-summary">Retrieves evidence from a corpus, then generates an answer grounded in it, no retraining needed.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/RAG/RAG.md" data-tooltip-position="top" aria-label="RAG">RAG</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# The Context Budget

The system prompt, conversation history, retrieved documents, tool schemas, tool results, and reserved output space all draw from one token budget. Account for them like memory allocations. When the total approaches the limit, choose what to remove before the runtime truncates an old instruction by accident.

Three costs are easy to miss:

- Output needs headroom. Budget `max_tokens` against what remains after the input. [[Generation]] cannot produce tokens that the context limit has already consumed.
- Tool schemas are sent as input. Names, descriptions, and parameter definitions can consume thousands of tokens before the first call. [[Tool Design]] covers the accuracy cost of oversized toolsets.
- History grows every turn. Reasoning, calls, and results quietly fill the window during long [[Agent Loop|agent loops]] unless the runtime compacts them.

# Techniques

**Ordering and positioning.** Put the strongest instructions and evidence where the model is most likely to use them, usually near the start or end. Ranked retrieval should place its best chunk first. This is the context-assembly side of [[Generation]].

**Selection over stuffing.** A few complete, relevant chunks usually beat a pile of fragments. [[Retrieval]] keeps the candidate set focused, while [[Re-ranking|Reranking]] spends extra work to choose what actually enters the prompt.

**Compaction.** Replace old turns with a short record of decisions, constraints, and pending work before history crowds out the task. Tool results should return only fields used by the next decision. [[Tool Design]] shows how oversized API payloads consume context without improving the next decision. [[AI & ML/LLM/Loop Engineering/Loop Engineering|Loop Engineering]] turns token pressure into an explicit compact-or-stop condition.

**Structure.** Separate trusted instructions from untrusted data with explicit sections. That makes the payload easier to interpret and supports [[Guardrails|prompt injection]] defenses. [[AI & ML/LLM/Prompt Engineering/Prompt Engineering|prompt anatomy]] supplies the smaller building blocks.

**Offloading.** Store bulky intermediate state outside the window and pass back a lightweight reference. A scratchpad or file can hold detail that is needed later but not on every turn. [[Multi-Agentic Systems]] uses the same idea for shared artifacts.

**Isolation.** Separate work when two concerns need conflicting instructions or large, unrelated toolsets. The context-centric decomposition in [[Multi-Agentic Systems]] keeps each worker's window focused, though coordination adds cost.

**Caching stable prefixes.** A repeated system prompt or fixed tool definition can stay logically present without paying full processing cost each time. [[AI & ML/LLM/Context Engineering/RAG/Caching|Caching]] covers the key boundaries and invalidation risks.

# Pitfalls

## More Context, Worse Answers

**What goes wrong:** more retrieved documents or a longer system prompt lowers answer quality and raises latency.

**Why it happens:** useful evidence is diluted across the larger input, and some of it lands in the weakly attended middle. Irrelevant tokens still compete for attention.

**How to avoid it:** filter and rerank to a smaller set, then measure quality as context size changes. Stop adding tokens when they no longer improve the result.

## Unbounded History Growth

**What goes wrong:** a long run fills the window, after which the runtime drops old messages or rejects the request. The original instruction is often among the first things lost.

**Why it happens:** each iteration appends reasoning and raw tool output without compaction.

**How to avoid it:** cap tool-result size and track cumulative tokens per iteration. Compact or stop before the limit. [[Agent Loop]] traces how repeated oversized results become token explosion across iterations.

## Context Poisoning

**What goes wrong:** one hallucinated fact or injected instruction enters history and is replayed as trusted context on later turns.

**Why it happens:** the runtime replays history without a trust label, and natural-language errors carry no automatic warning.

**How to avoid it:** validate claims before storing them, keep untrusted content separate from instructions, and enforce controls in code. [[Guardrails]] should not depend on a poisoned prompt obeying itself.

## Tool-Schema Bloat

**What goes wrong:** attaching many tools inflates every request and makes selection less reliable.

**Why it happens:** many clients send every connected schema on every request, even when the task needs only one.

**How to avoid it:** expose only the tools needed for the current task, or use tool search to load them on demand. [[Tool Design]] covers the degradation seen with large toolsets.

# Tradeoffs

| Lever | What it buys | What it costs | Best when |
| --- | --- | --- | --- |
| Larger context window | More room before truncation | Higher cost, weaker attention, more latency | The task truly needs broad material at once |
| Retrieval + reranking | Dense and traceable evidence | Retrieval infrastructure and tuning | Knowledge-heavy tasks over a large corpus |
| History compaction | A bounded window over long sessions | Summary cost and possible detail loss | Long conversations and agent runs |
| Context offloading | Small working context with detail on demand | Extra reads and coordination | Multi-step work with bulky intermediate state |
| Context isolation (sub-agents) | A focused window for each concern | Coordination overhead and more total tokens | Conflicting instructions or oversized toolsets |

The smallest context that answers the task is the starting point. Retrieval and reranking control what enters, and compaction frees space before more capacity is added. Offloading or isolation becomes worthwhile only when one focused window cannot hold the work. Once extra context stops improving measured quality, it has become overhead.

# Questions

> [!QUESTION]- Why does adding more context often make answers worse, not better?
> Attention is uneven across a long window, so evidence buried in the middle may be underused. Added tokens also compete with the evidence already present, even when they are loosely relevant. Larger inputs cost more and take longer. The fix is signal density: keep fewer complete chunks, order them deliberately, and measure whether each increase in context improves the answer.

> [!QUESTION]- What are the main techniques for keeping a long-running agent's context under control?
> Context control starts with tracking the token budget on every iteration instead of waiting for the window to fill. Keep a small set of strong evidence and place the best material where the model is likely to use it. Older turns can be compacted into decisions, constraints, and pending work. Tool results should contain only the fields needed for the next step, while bulky state can live outside the window and be loaded through a reference when needed.

# References

- [Lost in the Middle: How Language Models Use Long Contexts (Liu et al., 2023)](https://arxiv.org/abs/2307.03172)
- [Effective context engineering for AI agents (Anthropic Engineering)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Context Rot: How Increasing Input Tokens Impacts LLM Performance (Chroma Research)](https://research.trychroma.com/context-rot)
