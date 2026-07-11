---
publish: true
created: 2026-07-11T18:30:52.363Z
modified: 2026-07-11T18:30:52.364Z
published: 2026-07-11T18:30:52.364Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: A transformer network trained on vast text to predict the next token, treated here as an engineering platform steered by prompting, grounding, and evaluation rather than a knowledge database.
level:
  - "3"
priority: High
status: Done
---

# Intro

A large language model (LLM) is a transformer neural network trained on vast text corpora to predict the next token in a sequence. That single objective — next-token prediction at scale — is what produces the capabilities the rest of this section builds on: answering questions, summarizing, translating, writing code, and calling tools. Virtually all modern generative LLMs (GPT, Claude, Llama, Gemini) are **decoder-only** transformers: self-attention lets every token attend to all earlier tokens, so the model builds contextual meaning across the whole input before predicting what comes next. (Encoder-only transformers like BERT and encoder-decoder models like T5 exist, but they serve classification, [[Embeddings|embedding]], and translation workloads rather than open-ended generation.)

The engineering consequence: an LLM is not a knowledge database with retrieval semantics. It is a probability distribution over token sequences, shaped by training data and steered at inference time by the prompt. That is why grounding, [[AI & ML/LLM/Prompting/Prompting|Prompting]], and [[AI & ML/LLM/Evaluation/Evaluation|evaluation]] are engineering disciplines rather than nice-to-haves — see [[Hallucinations]] for what happens when fluent prediction is mistaken for factual recall.

<nav style="--map-accent: 16, 185, 129;" class="folder-structure-map" aria-label="LLM section map"><div class="folder-map-children"><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Agents">Agents</span></span><span class="folder-map-node-count">7 notes</span></div><p>Systems where an LLM controls part of the workflow — calling tools, making decisions, or directing other LLMs.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Agents/Agents.md" data-tooltip-position="top" aria-label="Agents">Agents</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Context Engineering">Context Engineering</span></span></div><p>Deliberately deciding what fills the finite, attention-limited context window — and in what order — to maximize useful signal for the task.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering.md" data-tooltip-position="top" aria-label="Context Engineering">Context Engineering</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Embeddings">Embeddings</span></span></div><p>Mapping text into a dense vector space where semantic similarity becomes geometric proximity, enabling keyword-free retrieval and semantic search.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Embeddings.md" data-tooltip-position="top" aria-label="Embeddings">Embeddings</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Evaluation">Evaluation</span></span><span class="folder-map-node-count">5 notes</span></div><p>Measuring whether an LLM app does the right thing via a layered stack of deterministic checks, judges, regression sets, and production signals.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Evaluation/Evaluation.md" data-tooltip-position="top" aria-label="Evaluation">Evaluation</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Fine-tuning">Fine-tuning</span></span></div><p>Continuing training a model's weights on task-specific data to bake in behavior — format, tone, policy — rather than knowledge.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Fine-tuning.md" data-tooltip-position="top" aria-label="Fine-tuning">Fine-tuning</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Generation">Generation</span></span></div><p>Producing reliable, grounded, correctly formatted output by controlling token sampling, grounding evidence, and output structure.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Generation.md" data-tooltip-position="top" aria-label="Generation">Generation</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Guardrails">Guardrails</span></span></div><p>Layered defense-in-depth controls around an LLM that make unsafe actions, data leaks, and policy violations detectable, bounded, and recoverable.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Guardrails.md" data-tooltip-position="top" aria-label="Guardrails">Guardrails</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Hallucinations">Hallucinations</span></span></div><p>A correctness failure where an LLM produces fluent, confident output unsupported by evidence, because it optimizes next-token likelihood, not truth.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Hallucinations.md" data-tooltip-position="top" aria-label="Hallucinations">Hallucinations</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Model Selection and Routing">Model Selection and Routing</span></span></div><p>Matching each request to the cheapest model that can handle it, trading quality against cost and latency.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Model Selection and Routing.md" data-tooltip-position="top" aria-label="Model Selection and Routing">Model Selection and Routing</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="OWASP vulnerabilities on AI LLM">OWASP vulnerabilities on AI LLM</span></span></div><p>The OWASP Top 10 for LLM Applications (2025), cataloging the highest-impact security failures in systems that integrate large language models.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/OWASP vulnerabilities on AI LLM.md" data-tooltip-position="top" aria-label="OWASP vulnerabilities on AI LLM">OWASP vulnerabilities on AI LLM</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Prompting">Prompting</span></span><span class="folder-map-node-count">4 notes</span></div><p>Turning vague intentions into precise, testable model tasks: prompt anatomy, generation settings, instruction and role prompting foundations.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Prompting/Prompting.md" data-tooltip-position="top" aria-label="Prompting">Prompting</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="RAG">RAG</span></span><span class="folder-map-node-count">11 notes</span></div><p>RAG retrieves evidence from your corpus, then generates an answer grounded in it, letting you update knowledge without retraining.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/RAG/RAG.md" data-tooltip-position="top" aria-label="RAG">RAG</a></span></article></div><style>
.folder-structure-map {
  --map-accent: 16, 185, 129;
  --map-gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  margin: 0.5rem 0 0.75rem;
  container-name: folder-map;
  container-type: inline-size;
}
.folder-map-children {
  /* Flex (not grid) so each card sizes to its own title — a long title widens
     its card and pushes to another row instead of being truncated, and rows
     grow to fill the width with no empty tracks when there are few cards. */
  display: flex;
  flex-wrap: wrap;
  gap: var(--map-gap);
}
.folder-map-node {
  position: relative;
  /* No overflow:hidden here: on a flex item that collapses min-width:auto to 0,
     letting the card shrink below its title + note-count and clip them. Without
     it, the card's min size is its content, so long titles widen the card (and
     wrap to another row) instead of being cut off. The accent gradient gets its
     own border-radius below to stay inside the rounded corners. */
  flex: 1 1 12rem;
  min-height: 2.75rem;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.folder-map-node::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--map-accent), 0.09) 0%,
    rgba(var(--map-accent), 0.04) 38%,
    rgba(var(--map-accent), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.folder-map-node:hover,
.folder-map-node:focus-within {
  border-color: rgba(var(--map-accent), 0.55);
  background-color: color-mix(in srgb, rgb(var(--map-accent)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.folder-map-node:hover::before,
.folder-map-node:focus-within::before {
  opacity: 1;
}
.folder-map-node-body {
  position: relative;
  z-index: 0;
  display: flex;
  min-height: 2.75rem;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  padding: 0.5rem 0.75rem;
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
.folder-map-entry-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--map-accent));
}
.folder-map-entry-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}
.folder-map-node-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
}
.folder-map-node p {
  display: none;
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.folder-map-node-count {
  display: block;
  flex: 0 0 auto;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  white-space: nowrap;
}
.folder-map-hit {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.folder-map-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.folder-map-hit a:focus-visible {
  outline: 2px solid rgb(var(--map-accent));
  outline-offset: -0.3rem;
}
.folder-map-empty {
  margin: 1rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
}
@container folder-map (min-width: 40rem) {
  .folder-map-node {
    min-height: 6rem;
  }
  .folder-map-node-body {
    min-height: 6rem;
    justify-content: flex-start;
    padding: 0.85rem 0.9rem;
  }
  .folder-map-node p { display: block; }
}
@container folder-map (min-width: 64rem) {
  .folder-map-node,
  .folder-map-node-body { min-height: 6.75rem; }
}
@media (prefers-reduced-motion: reduce) {
  .folder-map-node { transition: none; }
  .folder-map-node::before { transition: none; }
  .folder-map-node:hover,
  .folder-map-node:focus-within { transform: none; }
}
</style></nav>

## How LLMs Are Built

![07 AI & ML-LLM-20260705173634102.png](Assets/11 AI & ML/11 AI & ML-LLM-20260705173634102.png)

Training a modern LLM is a three-stage pipeline. Each stage changes what the model is good at:

1. **Pretraining** — the model learns next-token prediction over trillions of tokens of web text, books, and code. The output is a **base model**: a powerful autocompleter that continues text plausibly but does not reliably follow instructions. Pretraining consumes the overwhelming majority of the compute budget. The result is a file of parameters (weights) that capture everything the model learned, loadable by any inference runtime.
2. **Supervised fine-tuning (SFT / instruction tuning)** — the base model is further trained on curated example conversations: instructions paired with high-quality responses. This teaches the model to behave as an assistant — to answer the question rather than continue the text. Ask a base model "What are LLMs?" and it may generate more questions in the same style; ask an instruction-tuned model and it answers.
3. **Preference alignment (RLHF / DPO)** — human raters compare candidate responses, and the model is optimized toward preferred outputs using Reinforcement Learning from Human Feedback or, increasingly, direct preference optimization methods. This stage shapes helpfulness, tone, and refusal behavior — and has a known failure mode: optimizing for human approval can reward confident, agreeable answers over accurate ones (see [[Hallucinations]] on sycophancy).

```text
Base model  =  pretraining (next-token prediction at scale)
Instruction-tuned model  =  base model + SFT + preference alignment (RLHF/DPO)
```

## Dictionary

Core terms used throughout this section, each linked to the note that covers it in depth:

- **Token** — the unit an LLM reads and produces; subword pieces, not words. Token counts determine context usage and API cost — a 1,000-word English text is typically 1,300+ tokens, and non-Latin scripts can need 2–3× more (see [[Natural Language Processing]] on tokenization).
- **Context window** — the maximum number of tokens the model can attend to in one request: system prompt, conversation history, retrieved evidence, and the response all share this budget. How models use long contexts unevenly is covered in [[Generation]].
- **Inference and sampling** — generating output token by token from the model's probability distribution; temperature, top-p, and the other knobs are covered in [[Generation]].
- **Embedding** — a dense vector representation of text where semantic similarity becomes geometric proximity; the foundation of semantic search and RAG. Covered in [[Embeddings]].
- **Base model vs instruction-tuned model** — a base model continues text; an instruction-tuned model follows instructions. Production systems almost always use instruction-tuned models.
- **Causal language model (CLM)** — a model trained to predict the _next_ token from left-to-right context only. This is the GPT/Claude/Llama family — every generative LLM in this section.
- **Masked language model (MLM)** — a model trained to predict _masked-out_ tokens using context from both directions (BERT-style encoders). MLMs power classification and embedding models, not open-ended generation — they cannot autoregressively produce text the way causal LMs do.
- **RLHF** — Reinforcement Learning from Human Feedback: optimizing a model against human preference comparisons. The standard third stage of LLM training, and the source of both improved helpfulness and the sycophancy failure mode.
- **Hallucination** — fluent, confident output unsupported by evidence or reality. Mechanisms, detection, and mitigation are covered in [[Hallucinations]].
- **NLP** — [[Natural Language Processing]], the broader field; LLMs are its current dominant tool.

## Questions

> [!QUESTION]- Why does "the model just predicts the next token" matter for system design?
>
> - Everything an LLM outputs is a high-probability continuation, not a fact lookup — fluency and truth are uncorrelated by default
> - This is why grounding (RAG, citations), output validation, and evaluation pipelines exist: they add the correctness guarantees that next-token prediction does not provide
> - It also explains prompt sensitivity: the prompt is not a query against a database, it is the conditioning context that reshapes the entire output distribution
> - Design rule: treat model output as untrusted, probabilistic input to the rest of the system — validate structure with schemas and content with checks

> [!QUESTION]- What is the practical difference between a base model and an instruction-tuned model?
>
> - A base model is an autocompleter: given "What are some famous social networks?" it may continue with more questions in the same style rather than answering
> - An instruction-tuned model has been trained on instruction-response pairs (SFT) and aligned with human preferences (RLHF/DPO), so it interprets input as a task to perform
> - Base models are used for further fine-tuning and research; instruction-tuned models are what APIs serve and products build on
> - The distinction matters when reading benchmarks and papers: results on base models do not transfer directly to chat-tuned variants

> [!QUESTION]- How do you decide between prompting, RAG, and fine-tuning to adapt an LLM?
> Climb the ladder cheapest-first. Start with prompting — zero-shot or few-shot — because it needs no training and you iterate in seconds; most tasks never need more. Reach for RAG when the model lacks the _knowledge_: facts that change faster than you can retrain, or answers that must cite sources. Reach for fine-tuning when the problem is _behavior_, not knowledge — the model has the right information but won't hold a format, tone, or policy after you've exhausted prompting. The classic trap is fine-tuning to inject facts: it bakes in a snapshot that starts aging immediately and gives no traceability. The mature setup often combines them — fine-tune for behavior, RAG for current facts.

## References

- [Attention Is All You Need (Vaswani et al., 2017)](https://arxiv.org/abs/1706.03762) — the transformer paper; the architecture every modern LLM builds on.
- [Language Models are Few-Shot Learners (Brown et al., 2020)](https://arxiv.org/abs/2005.14165) — the GPT-3 paper; established that scale produces in-context learning.
- [Training language models to follow instructions with human feedback (Ouyang et al., 2022)](https://arxiv.org/abs/2203.02155) — the InstructGPT paper; the SFT + RLHF recipe that turned base models into assistants.
- [What are Large Language Models? (AWS)](https://aws.amazon.com/what-is/large-language-model/) — accessible vendor-neutral overview of LLM concepts and use cases.
- [Intro to Large Language Models (Andrej Karpathy)](https://www.youtube.com/watch?v=zjkBMFhNj_g) — the best single-hour explanation of how LLMs are trained and why they behave the way they do.
