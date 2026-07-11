---
publish: true
created: 2026-07-11T21:43:14.600Z
modified: 2026-07-11T21:43:14.601Z
published: 2026-07-11T21:43:14.601Z
tags:
  - FolderNote
icon: brain
order: 70
color: "#10b981"
topic:
  - AI & ML
subtopic: []
summary: "How learning systems are built, evaluated, and operated: classic ML, LLMs, and agent tooling."
level:
  - "3"
priority: High
status: Done
---

# Intro

AI & ML covers how learning systems are built, evaluated, and operated — from classic supervised models through large language models to the agent tooling that turns models into day-to-day engineering leverage. The unifying theme across all three branches: the model is rarely the hard part. Data quality, evaluation discipline, guardrails, and monitoring decide whether a system works in production, and that engineering work looks remarkably similar whether the model is a gradient-boosted tree or a frontier LLM.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="AI &amp; ML section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="LLM">LLM</span></span><span class="folder-map-node-count">35 notes</span></div><p class="db-card-summary">A next-token-predicting transformer, treated as an engineering platform steered by prompting, grounding, and evaluation.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/LLM.md" data-tooltip-position="top" aria-label="LLM">LLM</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Machine Learning">Machine Learning</span></span><span class="folder-map-node-count">6 notes</span></div><p class="db-card-summary">Training models to learn input-output mappings from data; the real work is the pipeline.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Machine Learning.md" data-tooltip-position="top" aria-label="Machine Learning">Machine Learning</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Responsible AI">Responsible AI</span></span></div><p class="db-card-summary">Designing and operating AI so failures are bounded, decisions explainable, and impact fair.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Responsible AI.md" data-tooltip-position="top" aria-label="Responsible AI">Responsible AI</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Tooling">Tooling</span></span><span class="folder-map-node-count">5 notes</span></div><p class="db-card-summary">The layer that turns LLMs into engineering leverage: coding agents, review agents, and IDE extensions.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Tooling/Tooling.md" data-tooltip-position="top" aria-label="Tooling">Tooling</a></span></article></div><style>
.db-card {
  position: relative;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.db-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--card-accent, 125, 125, 125), 0.09) 0%,
    rgba(var(--card-accent, 125, 125, 125), 0.04) 38%,
    rgba(var(--card-accent, 125, 125, 125), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.db-card:hover,
.db-card:focus-within {
  border-color: rgba(var(--card-accent, 125, 125, 125), 0.55);
  background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.db-card:hover::before,
.db-card:focus-within::before { opacity: 1; }
.db-card-body {
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: var(--db-card-pad, 0.85rem 0.9rem);
}
.db-card-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--card-accent, 125, 125, 125));
}
.db-card-icon svg { display: block; width: 100%; height: 100%; }
.db-card-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}
/* Element-qualified (p.db-card-summary) on purpose: it ties the specificity of
   Obsidian reading view's ".markdown-rendered p" and, being injected later in
   the body, wins. A bare ".db-card-summary" loses to it, so Obsidian keeps its
   default paragraph spacing and the description gets large gaps above/below.
   Quartz doesn't add those margins, which is why the gap only showed there. */
p.db-card-summary {
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.db-card-hit { position: absolute; inset: 0; z-index: 1; }
.db-card-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.db-card-hit a:focus-visible {
  outline: 2px solid rgb(var(--card-accent, 125, 125, 125));
  outline-offset: -0.3rem;
}
@media (prefers-reduced-motion: reduce) {
  .db-card { transition: none; }
  .db-card::before { transition: none; }
  .db-card:hover,
  .db-card:focus-within { transform: none; }
}

.folder-structure-map {
\--card-accent: 16, 185, 129;
\--map-gap: 0.75rem;
width: 100%;
box-sizing: border-box;
margin: 0.5rem 0 0.75rem;
container-name: folder-map;
container-type: inline-size;
}
.folder-map-children {
/\* Flex (not grid) so each card sizes to its own title — a long title widens
its card and pushes to another row instead of being truncated, and rows
grow to fill the width with no empty tracks when there are few cards. _/
display: flex;
flex-wrap: wrap;
gap: var(--map-gap);
}
.folder-map-node {
/_ No overflow:hidden on a flex item whose min-width:auto collapses to 0: that
would let the card shrink below its title + note-count and clip them.
Without it the card's min size is its content, so long titles widen the card
(and wrap to another row) instead of being cut off. The shared ::before
accent uses border-radius:inherit to stay inside the rounded corners. _/
flex: 1 1 12rem;
min-height: 2.75rem;
\--db-card-pad: 0.5rem 0.75rem;
}
.folder-map-node .db-card-body {
min-height: 2.75rem;
justify-content: center;
}
.folder-map-node-heading {
display: flex;
align-items: center;
justify-content: space-between;
gap: 0.75rem;
}
.folder-map-node-title-group {
display: flex;
align-items: center;
gap: 0.5rem;
}
.folder-map-node .db-card-title {
white-space: nowrap;
}
.folder-map-node-count {
display: block;
flex: 0 0 auto;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
white-space: nowrap;
}
.folder-map-node .db-card-summary {
display: none;
}
/_ Empty-section placeholder: reuses the full .db-card chrome (border, accent
glow gradient, background) so it reads as a regular sub-folder card. It only
differs in being non-interactive — no pointer cursor, no hover lift — with the
text centered in the card. _/
.folder-map-node-empty {
cursor: default;
}
.folder-map-node-empty:hover,
.folder-map-node-empty:focus-within {
border-color: var(--background-modifier-border, var(--lightgray, #d8dee9));
background-color: var(--background-primary, var(--light, #ffffff));
box-shadow: 0 0 0 rgba(0, 0, 0, 0);
transform: none;
}
.folder-map-node-empty:hover::before,
.folder-map-node-empty:focus-within::before { opacity: 0.78; }
/_ Higher specificity than the @container .folder-map-node .db-card-body
rules below so the placeholder stays vertically centered at every width. \*/
.folder-structure-map .folder-map-node-empty .db-card-body {
justify-content: center;
align-items: center;
text-align: center;
}
.folder-map-empty-text {
color: var(--text-normal, var(--dark, #1f2937));
font-size: 1rem;
font-weight: 400;
font-style: normal;
line-height: 1.25;
}
@container folder-map (min-width: 40rem) {
.folder-map-node {
min-height: 6rem;
\--db-card-pad: 0.85rem 0.9rem;
}
.folder-map-node .db-card-body {
min-height: 6rem;
justify-content: flex-start;
}
.folder-map-node .db-card-summary { display: block; }
}
@container folder-map (min-width: 64rem) {
.folder-map-node,
.folder-map-node .db-card-body { min-height: 6.75rem; }
} </style></nav>

## Questions

> [!QUESTION]- When should you reach for classic ML instead of an LLM API?
>
> - Classic ML wins when the task is a well-defined prediction with labeled data: classification, regression, ranking — millisecond latency and near-zero per-request cost at scale
> - LLMs win when the task involves open-ended language understanding or generation, training data is scarce, or iteration speed matters more than unit cost
> - A common production pattern: prototype with an LLM to validate the product, then distill the stable, high-volume part into a small fine-tuned model
> - Key tradeoff: classic ML trades upfront data and training effort for cheap, fast, predictable inference; LLMs trade per-call cost and latency for flexibility and zero training

> [!QUESTION]- Why does evaluation discipline matter more than model choice?
>
> - Without held-out evaluation, every model swap, prompt change, or retraining run is a guess — improvements cannot be distinguished from noise or regressions
> - Production failures are dominated by data and distribution problems (drift, leakage, segment regressions), which only evaluation and monitoring catch — not by raw model capability
> - A weaker model with solid evaluation and a feedback loop improves over time; a stronger model without them silently degrades
> - This is why every branch of this section has its own evaluation pages: [[AI & ML/Machine Learning/Evaluation/Evaluation|ML Evaluation]] and the general [[AI & ML/LLM/Evaluation/Evaluation|LLM Evaluation]], which RAG and agents specialize in [[AI & ML/LLM/RAG/Evaluation/Evaluation|RAG Evaluation]] and [[AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]]

## References

- [Rules of Machine Learning (Google for Developers)](https://developers.google.com/machine-learning/guides/rules-of-ml) — Google's practical guide to ML engineering, including when to use ML versus simpler approaches.
- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents) — the canonical guidance on choosing the simplest agentic pattern that solves the problem.
- [Hidden Technical Debt in Machine Learning Systems (NeurIPS 2015)](https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html) — the classic paper on why the model is a small fraction of a production ML system.
- [AI Risk Management Framework (NIST)](https://www.nist.gov/itl/ai-risk-management-framework) — vendor-neutral framework for managing AI risk across the lifecycle.
