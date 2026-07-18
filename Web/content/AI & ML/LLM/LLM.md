---
publish: true
created: 2026-07-16T18:48:41.276Z
modified: 2026-07-18T11:59:15.652Z
published: 2026-07-18T11:59:15.652Z
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

A large language model (LLM) is a neural language model with enough capacity and training data to support broad language tasks. Modern LLM systems are usually built on transformers, but “LLM” does not identify one architecture or objective: decoder-only models generate causally, encoder-decoder models generate from an encoded input, and encoder-only models produce contextual representations rather than autoregressive text.

For system design, model output is probabilistic and untrusted. Prompts condition behavior; context supplies current evidence; the harness exposes tools; the loop decides how to iterate and stop; evaluation measures whether the assembled system works. Treat fluent output as a candidate result that still needs grounding, validation, and release evidence.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="LLM section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Agents">Agents</span></span><span class="folder-map-node-count">4 notes</span></div><p class="db-card-summary">Systems where an LLM controls part of the workflow, calling tools, making decisions, or directing other LLMs.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Agents/Agents.md" data-tooltip-position="top" aria-label="Agents">Agents</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Context Engineering">Context Engineering</span></span><span class="folder-map-node-count">11 notes</span></div><p class="db-card-summary">Deliberately deciding what fills the finite context window, and in what order, to maximize useful signal.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Context Engineering/Context Engineering.md" data-tooltip-position="top" aria-label="Context Engineering">Context Engineering</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Embeddings">Embeddings</span></span></div><p class="db-card-summary">Mapping text into a dense vector space where semantic similarity becomes geometric proximity.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Embeddings.md" data-tooltip-position="top" aria-label="Embeddings">Embeddings</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Evaluation">Evaluation</span></span><span class="folder-map-node-count">5 notes</span></div><p class="db-card-summary">Measuring LLM behavior with versioned cases, exact checks, semantic scoring, and production outcomes.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Evaluation/Evaluation.md" data-tooltip-position="top" aria-label="Evaluation">Evaluation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Fine-tuning">Fine-tuning</span></span></div><p class="db-card-summary">Adapting model behavior with supervised training, parameter-efficient updates, and held-out evaluation.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Fine-tuning.md" data-tooltip-position="top" aria-label="Fine-tuning">Fine-tuning</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Generation">Generation</span></span></div><p class="db-card-summary">Producing reliable, grounded, correctly formatted output by controlling sampling, evidence, and structure.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Generation.md" data-tooltip-position="top" aria-label="Generation">Generation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Harness Engineering">Harness Engineering</span></span><span class="folder-map-node-count">2 notes</span></div><p class="db-card-summary">Designing the capability surface and scaffold the model acts through — tools, protocols, execution environment.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Harness Engineering/Harness Engineering.md" data-tooltip-position="top" aria-label="Harness Engineering">Harness Engineering</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Loop Engineering">Loop Engineering</span></span><span class="folder-map-node-count">2 notes</span></div><p class="db-card-summary">Designing how a model-driven system iterates — control flow, termination, verification, and recovery across turns.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Loop Engineering/Loop Engineering.md" data-tooltip-position="top" aria-label="Loop Engineering">Loop Engineering</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Model Selection and Routing">Model Selection and Routing</span></span></div><p class="db-card-summary">Selecting and routing models from measured task quality, latency, reliability, and cost.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Model Selection and Routing.md" data-tooltip-position="top" aria-label="Model Selection and Routing">Model Selection and Routing</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Prompt Engineering">Prompt Engineering</span></span><span class="folder-map-node-count">4 notes</span></div><p class="db-card-summary">Turning vague intentions into precise, testable model tasks: anatomy, settings, and role prompting.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Prompt Engineering/Prompt Engineering.md" data-tooltip-position="top" aria-label="Prompt Engineering">Prompt Engineering</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Safety">Safety</span></span><span class="folder-map-node-count">3 notes</span></div><p class="db-card-summary">Keeping an LLM system safe, secure, and truthful — the cross-cutting concern of guardrails, security threats, and hallucination.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Safety/Safety.md" data-tooltip-position="top" aria-label="Safety">Safety</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Engineering routes

Four inference-time disciplines wrap one another:

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
| [[AI & ML/LLM/Agent/Harness Engineering\|Harness Engineering]] | Tools and execution boundary | What can the model do, and through which constrained interface? |
| [[AI & ML/LLM/Agent/Loop Engineering\|Loop Engineering]] | Runtime across turns | How does work iterate, verify, recover, and stop? |

[[AI & ML/LLM/Evaluation/Evaluation|Evaluation]] and [[AI & ML/LLM/Safety/Safety|Safety]] span every route. Model-level choices sit underneath them: [[AI & ML/LLM/Generation|generation]] controls decoding, [[AI & ML/LLM/Embeddings|embeddings]] represent inputs for retrieval, [[AI & ML/LLM/Fine-tuning|fine-tuning]] adapts behavior, and [[AI & ML/LLM/Model Selection and Routing|model selection and routing]] chooses which model serves a request.

# Transformer foundations and training

An LLM checkpoint is the output of a particular architecture, tokenizer, objective, and training pipeline. The weights are not a self-describing program that any inference runtime can load. To reproduce the model, the runtime must build the compatible computation graph, interpret every tensor correctly, tokenize text with the matching vocabulary and special-token rules, and implement the operators used by that architecture and quantization scheme.

## Transformer families

| Family | Training and attention boundary | Output path | Typical use |
| --- | --- | --- | --- |
| Encoder-only | Bidirectional contextual encoding; BERT pretrains with masked-token prediction and sentence-level objectives | One contextual vector per input token or a pooled representation | Classification, extraction, reranking, embeddings |
| Encoder-decoder | Encoder reads the source bidirectionally; decoder generates target tokens autoregressively while attending to encoder output | Generated target sequence | Translation, summarization, text-to-text tasks |
| Decoder-only | Causal attention exposes only earlier tokens during next-token prediction | Generated continuation | Chat, code, completion, tool-call generation |

**BERT** is encoder-only. It predicts masked tokens during pretraining and exposes contextual representations to a task head; it has no autoregressive decoder for open-ended generation.

**T5** is a generative encoder-decoder. It pretrains with a span-corruption text-to-text objective: the encoder consumes corrupted input, and the decoder autoregressively generates missing target spans.

**GPT-style models** are decoder-only. A causal mask makes each position predict from earlier positions, so the same stack can continue a prompt one token at a time.

## Checkpoint is more than weights

Loading succeeds only when these contracts agree:

- **Architecture and configuration** — layer count, hidden size, attention heads, positional encoding, normalization, activation, vocabulary size, and expert layout.
- **Tensor contract** — parameter names, shapes, axis layout, serialization format, numerical type, sharding, and fused or transposed representations.
- **Tokenizer contract** — vocabulary, normalization, pre-tokenization, merge rules, byte fallback, and identifiers for beginning, end, padding, unknown, and chat-control tokens.
- **Adaptation and quantization metadata** — adapter targets, ranks, scaling, quantization groups, scales, zero points, and calibration assumptions.
- **Runtime operators** — compatible attention, position logic, expert routing, normalization, quantized matrix operations, and cache layout on the target hardware.

A `.safetensors` file defines a safe tensor container; it does not identify the model class or tokenizer. Loading Llama-shaped tensors into a GPT-2 graph fails on names and shapes. Using the wrong tokenizer can preserve tensor dimensions while mapping the same text to different IDs and silently corrupt behavior.

Portable graph formats such as ONNX make operators and tensor interfaces explicit, but the runtime must still support the graph’s operator versions, data types, custom operators, and hardware kernels. A successful file parse is weaker evidence than a known-answer inference test against the source runtime.

## Training pipeline

```text
base checkpoint = architecture + tokenizer + pretrained tensors + configuration
instruction model = compatible base checkpoint + SFT + optional preference/reward stage
deployable artifact = model bundle + runtime + release evaluation
```

![[Assets/AI & ML/AI & ML-LLM-18120000.png]]

1. **Pretraining** fits the architecture’s language objective over a large corpus. The output is a base checkpoint, not automatically a conversational assistant.
2. **Supervised fine-tuning (SFT)** trains on instruction-response or task examples. [[AI & ML/LLM/Fine-tuning|Fine-tuning]] covers full and parameter-efficient updates, data contracts, preference alignment, GRPO, and evaluation.
3. **Preference or reward optimization** uses comparisons or verifiable rewards to favor some outputs over others. It remains a separate training stage even when documented in the same canonical note as fine-tuning.

Training provenance matters at deployment. Record the base revision, data version, tokenizer files, configuration, adapters, quantization recipe, runtime version, and evaluation result. A model name without those versions is not enough to reproduce output or investigate a regression.

## Failure modes

- **Architecture mismatch** — tensor names or shapes fail during load, or a permissive loader leaves expected parameters uninitialized.
- **Tokenizer mismatch** — loading appears successful, but prompts use different token IDs, special markers, or normalization and quality collapses.
- **Runtime mismatch** — unsupported operators, cache layout, precision, or quantization kernels cause load failure, numerical drift, or a slow fallback path.
- **Training-stage ambiguity** — benchmark results for a base checkpoint are compared with an instruction or preference-aligned variant as though they were the same model.

# Mixture-of-experts

A sparse mixture-of-experts (MoE) model replaces some dense feed-forward layers with several expert networks and a learned router. For each token, the router activates only a small subset of experts and combines their outputs. This increases total parameter capacity without evaluating every expert for every token. It is internal model architecture, not the application-level decision to send a request to one model or another in [[AI & ML/LLM/Model Selection and Routing|model selection and routing]].

## Token routing

```text
token hidden state
    → router scores experts
    → select top-k experts
    → dispatch token
    → combine weighted expert outputs
```

If many tokens choose the same expert, that device becomes a bottleneck while other experts sit idle. Implementations use capacity limits, load-balancing objectives or biases, token dropping or rerouting policies, and careful expert placement.

## What sparse activation saves

Sparse activation reduces feed-forward arithmetic relative to evaluating every expert. It does not remove the rest of the transformer, and it does not make total parameters disappear from deployment.

Distinguish three measurements:

- **Total parameters** affect checkpoint storage and expert placement across device memory.
- **Active parameters per token** approximate part of the arithmetic executed for a token.
- **Measured throughput and latency** include router work, token dispatch, all-to-all communication, batching, precision, kernels, and load imbalance.

A dense model can outperform a sparse model with a similar advertised active count when expert traffic is communication-bound. A well-placed MoE can deliver more learned capacity at manageable per-token compute. Neither conclusion follows from parameter counts alone.

## Capacity and communication

An expert capacity factor reserves room for more than the average token share. Too little capacity can drop or reroute tokens; too much wastes memory and compute. During distributed training or serving, tokens cross device boundaries to reach experts, making interconnect topology and expert placement part of model latency.

Batch shape matters. A large batch can distribute tokens more efficiently across experts, while low-latency small batches expose imbalance and communication overhead. Measure the exact serving regime rather than extrapolating from training throughput.

## DeepSeek architecture boundary

The DeepSeek-V3 report describes routed experts, shared experts, and an auxiliary-loss-free load-balancing strategy. DeepSeek-R1 uses that base architecture, while [[AI & ML/LLM/Fine-tuning#GRPO|GRPO]] belongs to post-training. Token routing and policy optimization solve different problems.

Use the primary technical report for architecture claims. Undated prices, hardware totals, and benchmark tables from secondary comparisons mix hardware, precision, prompts, and model versions and do not establish an MoE design tradeoff.

# Minimal vocabulary

- **Token** — the integer-id unit produced by a specific tokenizer. Tokenizer choice affects sequence length and must match the checkpoint.
- **Context window** — the token budget visible to one model invocation, including instructions, history, evidence, tool results, and output allowance.
- **Inference** — executing a trained model to produce representations or generated tokens; [[AI & ML/LLM/Generation|generation]] covers sampling controls for generative models.
- **Embedding** — a vector representation used for similarity or downstream prediction; covered in [[AI & ML/LLM/Embeddings|embeddings]].

# Questions

> [!QUESTION]- Why does architecture matter when someone says “LLM”?
> Encoder-only, encoder-decoder, and decoder-only transformers expose different inputs, objectives, and output paths. A BERT checkpoint is not a causal text generator, while T5 generates through an autoregressive decoder conditioned on encoder output.

> [!QUESTION]- What must match besides checkpoint tensor bytes?
> The architecture and configuration, tensor names and layouts, tokenizer and special-token IDs, adaptation or quantization metadata, and runtime operator implementations must agree. Verify the bundle with known-answer inference, not only a successful file parse.

> [!QUESTION]- Why is active parameter count not an inference-cost measurement?
> It omits dense layers, memory traffic, token dispatch, interconnect communication, batching, and expert imbalance. Measure throughput and latency on the target serving stack.

> [!QUESTION]- How do you choose between prompting, RAG, and fine-tuning?
> Start with prompting. Add RAG when the gap is current, private, or attributable knowledge. Fine-tune when a measured behavior gap remains—format, policy, style, or a narrow task that prompting cannot stabilize.

# References

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) — the primary transformer architecture paper and attention mechanism.
- [BERT](https://arxiv.org/abs/1810.04805) — the primary encoder-only masked-language-model pretraining paper.
- [Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer](https://arxiv.org/abs/1910.10683) — the primary encoder-decoder architecture and span-corruption text-to-text objective.
- [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) — the primary GPT-style causal-language-model report.
- [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) — the primary SFT, reward model, and RLHF pipeline context.
- [Switch Transformers](https://jmlr.org/papers/v23/21-0998.html) — sparse-expert routing and load-balancing tradeoffs.
- [GShard](https://arxiv.org/abs/2006.16668) — primary MoE distributed scaling architecture.
- [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437) — primary report for routed and shared experts and its load-balancing design.
- [ONNX concepts](https://onnx.ai/onnx/intro/concepts.html) — the normative model format and operator model.
- [ByteByteGo source snapshot: DeepSeek one-pager](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/deepseek-1-pager.md) — the pinned secondary summary reconciled here by separating sparse architecture from GRPO and excluding incomparable product claims.
