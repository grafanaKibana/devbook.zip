---
publish: true
created: 2026-08-20T20:41:15.496Z
modified: 2026-08-20T20:41:15.496Z
published: 2026-08-20T20:41:15.496Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: A routing hub for model foundations, generation, adaptation, prompting, context, evaluation, and agent runtimes.
level:
  - "3"
priority: High
status: Creation
---

A large language model (LLM) is a neural language model trained at enough scale to handle a broad range of language tasks. The name says little about the exact architecture. Decoder-only models continue text causally, encoder-decoder models generate from an encoded source, and encoder-only models produce contextual representations instead of open-ended text.

Model output is probabilistic and untrusted from a system-design perspective. A prompt conditions behavior, context supplies current evidence, and the harness exposes actions. The loop controls iteration and stopping. Evaluation then measures whether those pieces work together. Fluent output remains a candidate result until grounding and validation support it.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="LLM section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Agents">Agents</span></span><span class="folder-map-node-count">4 notes</span></div><p class="db-card-summary">Systems where an LLM controls part of the workflow, calling tools, making decisions, or directing other LLMs.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Agents/Agents.md" data-tooltip-position="top" aria-label="Agents">Agents</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Context Engineering">Context Engineering</span></span><span class="folder-map-node-count">11 notes</span></div><p class="db-card-summary">Deliberately deciding what fills the finite context window, and in what order, to maximize useful signal.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/Context Engineering.md" data-tooltip-position="top" aria-label="Context Engineering">Context Engineering</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Evaluation">Evaluation</span></span><span class="folder-map-node-count">5 notes</span></div><p class="db-card-summary">Measuring LLM behavior with versioned cases, exact checks, semantic scoring, and production outcomes.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Evaluation/Evaluation.md" data-tooltip-position="top" aria-label="Evaluation">Evaluation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Harness Engineering">Harness Engineering</span></span><span class="folder-map-node-count">7 notes</span></div><p class="db-card-summary">Designing the tools, protocol wiring, and execution boundary that a model acts through.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Harness Engineering/Harness Engineering.md" data-tooltip-position="top" aria-label="Harness Engineering">Harness Engineering</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Loop Engineering">Loop Engineering</span></span><span class="folder-map-node-count">2 notes</span></div><p class="db-card-summary">Designing control flow, stopping, verification, and recovery across repeated model calls.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Loop Engineering/Loop Engineering.md" data-tooltip-position="top" aria-label="Loop Engineering">Loop Engineering</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Prompt Engineering">Prompt Engineering</span></span><span class="folder-map-node-count">4 notes</span></div><p class="db-card-summary">Turning vague intentions into precise, testable model tasks: anatomy, settings, and role prompting.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Prompt Engineering/Prompt Engineering.md" data-tooltip-position="top" aria-label="Prompt Engineering">Prompt Engineering</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Safety">Safety</span></span><span class="folder-map-node-count">4 notes</span></div><p class="db-card-summary">Applying guardrails across an LLM system to limit security threats and unsupported output.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Safety/Safety.md" data-tooltip-position="top" aria-label="Safety">Safety</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Embeddings">Embeddings</span></span></div><p class="db-card-summary">Mapping text into a dense vector space where semantic similarity becomes geometric proximity.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Embeddings.md" data-tooltip-position="top" aria-label="Embeddings">Embeddings</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Fine-tuning">Fine-tuning</span></span></div><p class="db-card-summary">Adapting model behavior with supervised training, parameter-efficient updates, and held-out evaluation.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Fine-tuning.md" data-tooltip-position="top" aria-label="Fine-tuning">Fine-tuning</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Generation">Generation</span></span></div><p class="db-card-summary">Producing reliable, grounded, correctly formatted output by controlling sampling, evidence, and structure.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Generation.md" data-tooltip-position="top" aria-label="Generation">Generation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Model Selection and Routing">Model Selection and Routing</span></span></div><p class="db-card-summary">Selecting and routing models from measured task quality, latency, reliability, and cost.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Model Selection and Routing.md" data-tooltip-position="top" aria-label="Model Selection and Routing">Model Selection and Routing</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Engineering Routes

Four inference-time disciplines form the runtime around a model call:

```mermaid
flowchart LR
    P[Prompt Engineering<br>instruction] --> C[Context Engineering<br>evidence and budget]
    C --> H[Harness Engineering<br>tools and environment]
    H --> L[Loop Engineering<br>iteration and stopping]
```

| Route | Unit of design | Question |
| --- | --- | --- |
| [[AI & ML/LLM/Prompt Engineering/Prompt Engineering\|Prompt Engineering]] | One instruction | How should this task be specified and demonstrated? |
| [[AI & ML/LLM/Context Engineering/Context Engineering\|Context Engineering]] | The whole context window | Which evidence enters the window, in what order, and at what cost? |
| [[AI & ML/LLM/Harness Engineering/Harness Engineering\|Harness Engineering]] | Tools and execution boundary | What can the model do, and through which constrained interface? |
| [[AI & ML/LLM/Loop Engineering/Loop Engineering\|Loop Engineering]] | Runtime across turns | How does work iterate, verify, recover, and stop? |

[[AI & ML/LLM/Evaluation/Evaluation|Evaluation]] and [[AI & ML/LLM/Safety/Safety|Safety]] span every route. Model-level choices sit underneath them: [[AI & ML/LLM/Generation|generation]] controls decoding, [[AI & ML/LLM/Embeddings|embeddings]] represent inputs for retrieval, [[AI & ML/LLM/Fine-tuning|fine-tuning]] adapts behavior, and [[AI & ML/LLM/Model Selection and Routing|model selection and routing]] chooses which model serves a request.

# Transformer Foundations and Training

An LLM checkpoint comes from one architecture, tokenizer, objective, and training pipeline. Its weights are not a self-describing program. A compatible runtime must rebuild the expected computation graph, interpret the stored tensors correctly, apply the matching tokenization rules, and provide every operator required by the architecture and quantization scheme.

## Transformer Families

| Family | Training and attention boundary | Output path | Typical use |
| --- | --- | --- | --- |
| Encoder-only | Bidirectional contextual encoding. BERT pretrains with masked-token prediction and sentence-level objectives | One contextual vector per input token or a pooled representation | Classification, extraction, reranking, embeddings |
| Encoder-decoder | Encoder reads the source bidirectionally. Decoder generates target tokens autoregressively while attending to encoder output | Generated target sequence | Translation, summarization, text-to-text tasks |
| Decoder-only | Causal attention exposes only earlier tokens during next-token prediction | Generated continuation | Chat, code, completion, tool-call generation |

**BERT** is encoder-only. It predicts masked tokens during pretraining and exposes contextual representations to a task head. It has no autoregressive decoder for open-ended generation.

**T5** is a generative encoder-decoder. It pretrains with a span-corruption text-to-text objective: the encoder consumes corrupted input, and the decoder autoregressively generates missing target spans.

**GPT-style models** are decoder-only. A causal mask makes each position predict from earlier positions, so the same stack can continue a prompt one token at a time.

## Checkpoint is More than Weights

Loading is trustworthy only when several contracts agree:

- **Architecture and configuration** define the layer count, hidden size, attention layout, positional encoding, normalization, activation, vocabulary size, and expert topology.
- **Tensor contract** covers parameter names, shapes, axis layout, serialization, numerical type, sharding, and any fused or transposed representation.
- **Tokenizer contract** includes the vocabulary, normalization, splitting and merge rules, byte fallback, and special-token identifiers.
- **Adaptation and quantization metadata** record adapter targets and scaling alongside quantization groups, scales, zero points, and calibration assumptions.
- **Runtime operators** must implement compatible attention, position logic, expert routing, normalization, quantized matrix work, and cache layout on the target hardware.

A `.safetensors` file provides a safe tensor container, not a model class or tokenizer. Llama-shaped tensors do not fit a GPT-2 graph. A wrong tokenizer is harder to spot: tensor dimensions still match while the same text maps to different IDs, silently changing behavior.

Portable graph formats such as ONNX make operators and tensor interfaces explicit. The target runtime still needs the graph's operator versions, data types, custom operators, and hardware kernels. Parsing the file proves less than a known-answer inference test against the source runtime.

## Training Pipeline

```text
base checkpoint = architecture + tokenizer + pretrained tensors + configuration
instruction model = compatible base checkpoint + SFT + optional preference/reward stage
deployable artifact = model bundle + runtime + release evaluation
```

![[Assets/AI & ML/AI & ML-LLM-18120000.png]]

1. **Pretraining** fits the architecture’s language objective over a large corpus. The output is a base checkpoint, not automatically a conversational assistant.
2. **Supervised fine-tuning (SFT)** trains on instruction-response or task examples. [[AI & ML/LLM/Fine-tuning|Fine-tuning]] covers full and parameter-efficient updates, data contracts, preference alignment, GRPO, and evaluation.
3. **Preference or reward optimization** uses comparisons or verifiable rewards to favor some outputs over others. It remains a separate training stage even when documented in the same canonical note as fine-tuning.

Deployment depends on training provenance. The release record needs the base revision, data version, tokenizer files, configuration, adapters, quantization recipe, runtime version, and evaluation result. A model name alone cannot reproduce an output or explain a regression.

## Failure Modes

- **Architecture mismatch** — tensor names or shapes fail during load, or a permissive loader leaves expected parameters uninitialized.
- **Tokenizer mismatch** — loading appears successful, but prompts use different token IDs, special markers, or normalization and quality collapses.
- **Runtime mismatch** — unsupported operators, cache layout, precision, or quantization kernels cause load failure, numerical drift, or a slow fallback path.
- **Training-stage ambiguity** — benchmark results for a base checkpoint are compared with an instruction or preference-aligned variant as though they were the same model.

# Mixture-of-experts

A sparse mixture-of-experts (MoE) model replaces some dense feed-forward layers with expert networks and a learned router. The router activates only a small subset for each token, then combines their outputs. This adds total parameter capacity without evaluating every expert on every token. It is an internal architecture choice, separate from application-level [[AI & ML/LLM/Model Selection and Routing|model selection and routing]].

## Token Routing

```text
token hidden state
    → router scores experts
    → select top-k experts
    → dispatch token
    → combine weighted expert outputs
```

When too many tokens choose one expert, its device becomes a bottleneck while others sit idle. Implementations counter this with capacity limits, balancing objectives or biases, token rerouting, and deliberate expert placement.

## What Sparse Activation Saves

Sparse activation saves feed-forward arithmetic compared with evaluating every expert. The rest of the transformer still runs, and the full parameter set still affects deployment.

Distinguish three measurements:

- **Total parameters** affect checkpoint storage and expert placement across device memory.
- **Active parameters per token** approximate part of the arithmetic executed for a token.
- **Measured throughput and latency** include router work, token dispatch, all-to-all communication, batching, precision, kernels, and load imbalance.

A dense model can beat a sparse model with a similar advertised active count when expert traffic is communication-bound. Careful expert placement can give an MoE more learned capacity at manageable per-token compute. Parameter counts alone cannot predict either result.

## Capacity and Communication

An expert capacity factor reserves headroom above the average token share. Too little capacity drops or reroutes tokens. Too much wastes memory and compute. In distributed training or serving, tokens cross device boundaries to reach experts, so interconnect topology and placement become part of model latency.

Batch shape changes that tradeoff. Large batches can spread tokens across experts efficiently, while small low-latency batches expose imbalance and communication overhead. Training throughput is not a substitute for measurement on the intended serving workload.

## Routed and Shared Experts in DeepSeek-V3

The DeepSeek-V3 report describes routed experts, shared experts, and an auxiliary-loss-free load-balancing strategy. DeepSeek-R1 uses that base architecture, while [[AI & ML/LLM/Fine-tuning#GRPO|GRPO]] belongs to post-training. Token routing and policy optimization solve different problems. Price, hardware, and benchmark comparisons are meaningful only when hardware, precision, prompts, and model versions match.

# Minimal Vocabulary

- **Token** — the integer-id unit produced by a specific tokenizer. Tokenizer choice affects sequence length and must match the checkpoint.
- **Context window** — the token budget visible to one model invocation, including instructions, history, evidence, tool results, and output allowance.
- **Inference** — executing a trained model to produce representations or generated tokens. [[AI & ML/LLM/Generation|generation]] covers sampling controls for generative models.
- **Embedding** — a vector representation used for similarity or downstream prediction. Covered in [[AI & ML/LLM/Embeddings|embeddings]].

# Questions

> [!QUESTION]- How should prompting, RAG, and fine-tuning be chosen for an LLM system?
> The choice starts with the type of gap shown by evaluation. Prompting is the simplest option when clearer instructions or examples can stabilize the task. RAG fits gaps in current or private knowledge and cases where answers need source evidence. Fine-tuning fits a stable behavior gap, such as format, policy, style, or a narrow task, after prompting has been tested and is still inconsistent. The techniques can be combined: fine-tuning can shape behavior while RAG supplies facts that change.

# References

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [BERT](https://arxiv.org/abs/1810.04805)
- [Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer](https://arxiv.org/abs/1910.10683)
- [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)
- [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155)
- [Switch Transformers](https://jmlr.org/papers/v23/21-0998.html)
- [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437)
