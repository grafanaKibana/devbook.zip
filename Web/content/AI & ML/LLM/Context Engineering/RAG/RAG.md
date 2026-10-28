---
publish: true
created: 2026-10-28T12:27:02.637Z
modified: 2026-10-28T12:33:02.623Z
published: 2026-10-28T12:33:02.623Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: Retrieves evidence from a corpus, then generates an answer grounded in it, no retraining needed.
priority: High
level:
  - "2"
status: Done
qard-deck: AI & ML
qard-topic: LLM/Context Engineering/RAG/RAG
flashcard_uid: 33e0a516
---

Retrieval-Augmented Generation (RAG) retrieves evidence from a corpus and gives it to the model for generation. Knowledge can then change without retraining the model, and the answer can point back to the source that supported it.

A useful RAG system is a pipeline. Query processing determines what search sees. Retrieval decides which evidence survives. Context assembly decides what the model receives. Evaluation and production controls keep those stages honest.

For a support question such as “What changed in API v2 rate limits?”, the system retrieves release notes and policy documents first. The model answers from those sections and cites them instead of relying on an old fact stored in its weights.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="RAG section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Evaluation">Evaluation</span></span><span class="folder-map-node-count">3 notes</span></div><p class="db-card-summary">Decomposes into retrieval, generation, and end-to-end layers so regressions isolate to one layer.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/RAG/Evaluation/Evaluation.md" data-tooltip-position="top" aria-label="Evaluation">Evaluation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Chunking">Chunking</span></span></div><p class="db-card-summary">Sets the unit of retrieval: too wide adds noise, too narrow splits meaning.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/RAG/Chunking.md" data-tooltip-position="top" aria-label="Chunking">Chunking</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Monitoring">Monitoring</span></span></div><p class="db-card-summary">Continuously observing a deployed RAG pipeline per stage to catch regressions before users do.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/RAG/Monitoring.md" data-tooltip-position="top" aria-label="Monitoring">Monitoring</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Query Translation">Query Translation</span></span></div><p class="db-card-summary">Rewrites a user question into retrieval-optimized variants so phrasing mismatches don't sink retrieval.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/RAG/Query Translation.md" data-tooltip-position="top" aria-label="Query Translation">Query Translation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="RAG Caching">RAG Caching</span></span></div><p class="db-card-summary">Stores results at each RAG stage to cut latency and cost, scoped by authorization.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/RAG/RAG Caching.md" data-tooltip-position="top" aria-label="RAG Caching">RAG Caching</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="RAG Patterns">RAG Patterns</span></span></div><p class="db-card-summary">A catalog of production RAG patterns, each naming the failure it fixes and the risk it adds.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/RAG/RAG Patterns.md" data-tooltip-position="top" aria-label="RAG Patterns">RAG Patterns</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Re-ranking">Re-ranking</span></span></div><p class="db-card-summary">A second-stage pass that rescores, fuses, or diversifies retrieval candidates before context assembly.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/RAG/Re-ranking.md" data-tooltip-position="top" aria-label="Re-ranking">Re-ranking</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Retrieval">Retrieval</span></span></div><p class="db-card-summary">Decides what evidence enters the prompt, balancing recall, precision, and latency across search methods.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/RAG/Retrieval.md" data-tooltip-position="top" aria-label="Retrieval">Retrieval</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Vector Databases">Vector Databases</span></span></div><p class="db-card-summary">Stores embeddings and serves fast approximate nearest-neighbor search, trading recall for speed.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/RAG/Vector Databases.md" data-tooltip-position="top" aria-label="Vector Databases">Vector Databases</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid var(--interactive-accent, var(--secondary, #437100)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Core Flow

```mermaid
flowchart LR
    Q[User Query] --> D{Translate query?}
    D -->|No| R[Retrieval and Fusion]
    D -->|Yes| T[Query Translation]
    T --> R
    R --> RR[Optional Reranking]
    RR --> C[Context Assembly]
    C --> G[LLM Generation]
    G --> V[Groundedness and Citation Checks]
```

Each stage limits the next. When translation is used, retrieval cannot repair a rewrite that changed the intent, and reranking cannot promote evidence that search never returned. A baseline can send the original query directly to retrieval. Treating RAG as one large prompt hides these boundaries.

# Operational Baselines

- Each added pattern sits behind a feature flag, so its [[Monitoring#Retrieval Quality Metrics|retrieval precision]] and [[Monitoring#LLM-as-Judge Metrics|generation faithfulness]] can be compared with latency p95 and cost per query.
- Iterative and agentic retrieval run under a cap. A retry budget bounds latency. Unsupported output should fail closed instead of looping until it sounds plausible.
- Query drift can accumulate between retrieval rounds. Semantic similarity to the original query makes gradual topic changes visible.
- Expensive stable work is worth caching: query rewrites, multi-query results, contextual chunk enrichment, and read-only tool results scoped to the caller's authorization. Mutating tool calls need [[Software Architecture/Distributed Systems/Idempotency|idempotency]], not response caching. [[AI & ML/LLM/Context Engineering/RAG/RAG Caching|Caching]] covers keys and invalidation.
- Simple questions go through the cheapest path. Multi-hop retrieval is wasted work on a single-hop lookup.

# RAG Vs Fine-Tuning

RAG and [[Fine-tuning]] change different parts of the system. RAG supplies knowledge at request time. Fine-tuning changes behavior in the model weights. Retrieval is the safer place for facts that change.

A weekly policy change can enter RAG through reindexing. Fine-tuning would bake in another snapshot and still give weak source traceability.

| Axis | RAG | Fine-tuning |
|---|---|---|
| Knowledge freshness | Changes when the corpus is reindexed | Changes when the model is trained again |
| Source traceability | Direct when citations are retained | Weak unless supplied separately |
| Behavioral consistency | Depends on prompt and model behavior | Can improve through training examples |
| Time to first value | Usually faster | Usually slower |
| Operational complexity | Retrieval and index operations | Training, evaluation, and model release operations |

1. RAG is the first choice when facts change often or answers need citations.
2. Fine-tuning is added when format or policy behavior stays unstable after prompt work.
3. Mutable facts stay in the corpus, and learned behavior stays in the weights.

The two techniques can work together. Fine-tuning can stabilize format or refusal behavior, while RAG supplies current facts. The boundary still holds: knowledge changes through reindexing, and behavior changes through retraining.

# Questions

> [!qard]- What is retrieval-augmented generation (RAG)?
> Retrieval-augmented generation (RAG) answers a request in two steps. It first retrieves relevant evidence from an external corpus, then gives that evidence to a language model, which generates an answer grounded in it. Knowledge therefore comes from the corpus at request time, not only from what the model learned in its weights.
>
> A typical request passes through these stages:
>
> 1. **Query processing:** the question is used as is or rewritten into a better search query.
> 2. **Retrieval:** a search over an index of document chunks returns candidate passages. The search can use vector similarity, keywords or both.
> 3. **Reranking (optional):** a second stage reorders the candidates so the most relevant come first.
> 4. **Context assembly:** the best passages are placed into the prompt within a token budget.
> 5. **Generation:** the model answers from that context, ideally citing the passages it used.
>
> Compared with relying on the model's weights alone, RAG changes two things. Knowledge can be updated by changing the corpus and its index instead of retraining, and an answer can point back to its sources. Each stage also limits the next: generation cannot use evidence that retrieval never returned.
>
> [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al.)](https://arxiv.org/abs/2005.11401)

<!-- qard-id: 19ad841c-2c3b-4042-aa7b-e7324d145b10 -->

> [!qard]- How should an advanced RAG stage, such as reranking or query rewriting, be introduced and evaluated?
> An advanced stage is introduced as a controlled experiment. It targets a specific failure measured on the current pipeline, and it stays only if it beats that baseline by enough to justify its added latency, cost and maintenance.
>
> 1. **Baseline:** the current pipeline is measured on representative cases, and the failure the new stage should fix is identified. An example is relevant evidence ranked too low to reach the prompt.
> 2. **Isolated change:** where practical, only that stage changes. A broad change to several stages can hide which component helped and which one regressed.
> 3. **Same comparison:** baseline and candidate run on the same cases. They are measured on the targeted metric, on end-to-end answer quality and on operational measures such as p95 latency and cost per query.
> 4. **Decision:** the stage is kept only when its quality gain outweighs its latency, cost and maintenance burden. Otherwise the simpler pipeline remains.
>
> Changing exactly one thing is not always feasible. A feature flag, a controlled rollout or an ablation that removes one component at a time can still attribute an effect to a specific stage.
>
> [Rules of Machine Learning (Google)](https://developers.google.com/machine-learning/guides/rules-of-ml)

<!-- qard-id: 62a9172b-1f78-4656-8b17-50f8365f997d -->

> [!qard]- When a RAG answer is wrong, how can the failing pipeline stage be located?
> The diagnosis starts from the exact context and request the model received for that answer. Whether the needed evidence was there decides which part of the pipeline to examine, and tracing backward from there finds the stage that failed.
>
> 1. **Actual model input:** the logged prompt and assembled context for the failing request are inspected, rather than assumptions about what retrieval probably returned.
> 2. **Evidence missing or unsuitable:** the fault is upstream of generation. Tracing back through context assembly, ranking, filtering, retrieval and query transformation shows where the evidence was lost. It may have been retrieved but cut by the final top-k, removed by a filter, or never retrieved because a rewritten query changed the intent.
> 3. **Evidence present but misused:** the relevant evidence reached the model, but the answer ignored, contradicted or went beyond it. That points to generation: the prompt, the model or its settings.
> 4. **Measurement itself:** citation handling and the reference answer or evaluator are checked too, because a broken citation mapping or a wrong label can make an answer look wrong.
>
> Component metrics, such as retrieval relevance and groundedness, narrow the hypotheses. End-to-end evaluation then confirms whether a fix improves the task outcome.
>
> [RAG evaluators (Microsoft Foundry)](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators?view=foundry)

# References

- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)
- [Retrieval-Augmented Generation for Large Language Models: A Survey (Gao et al., 2024)](https://arxiv.org/abs/2312.10997)
