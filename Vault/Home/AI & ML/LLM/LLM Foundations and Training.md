---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Transformer architecture families, checkpoint compatibility, and the pretraining-to-alignment pipeline."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

An LLM checkpoint is the output of a particular architecture, tokenizer, objective, and training pipeline. The weights are not a self-describing program that any inference runtime can load. To reproduce the model, the runtime must build the compatible computation graph, interpret every tensor correctly, tokenize text with the matching vocabulary and special-token rules, and implement the operators used by that architecture and quantization scheme.

The common transformer families differ in which tokens can attend to which context and where generation happens. Keep that distinction separate from scale: a large encoder is still not an autoregressive decoder.

## Transformer families

| Family | Training and attention boundary | Output path | Typical use |
| --- | --- | --- | --- |
| Encoder-only | Bidirectional contextual encoding; BERT pretrains with masked-token prediction and sentence-level objectives | One contextual vector per input token or a pooled representation | Classification, extraction, reranking, embeddings |
| Encoder-decoder | Encoder reads the source bidirectionally; decoder generates target tokens autoregressively while attending to encoder output | Generated target sequence | Translation, summarization, text-to-text tasks |
| Decoder-only | Causal attention exposes only earlier tokens during next-token prediction | Generated continuation | Chat, code, completion, tool-call generation |

**BERT** is encoder-only. It predicts masked tokens during pretraining and then exposes contextual representations to a task head; it has no autoregressive decoder for open-ended generation.

**T5** is generative encoder-decoder. It pretrains with a span-corruption text-to-text objective: the encoder consumes corrupted input, and the decoder autoregressively generates the missing target spans. Translation and summarization are natural fits because generation is conditioned on a separately encoded source.

**GPT-style models** are decoder-only. A causal mask makes each position predict from earlier positions, so the same stack can continue a prompt one token at a time.

## Checkpoint is more than weights

Loading succeeds only when these contracts agree:

- **Architecture and configuration** — layer count, hidden size, attention heads, positional encoding, normalization, activation, vocabulary size, and expert layout.
- **Tensor contract** — parameter names, shapes, axis layout, serialization format, numerical type, sharding, and any fused or transposed representation.
- **Tokenizer contract** — vocabulary, normalization, pre-tokenization, merge rules, byte fallback, and identifiers for beginning, end, padding, unknown, and chat-control tokens.
- **Adaptation and quantization metadata** — adapter targets, ranks, scaling, quantization groups, scales, zero points, and calibration assumptions.
- **Runtime operators** — implementations for the model’s attention, rotary or relative position logic, mixture-of-experts routing, normalization, quantized matrix operations, and cache layout on the target hardware.

A `.safetensors` file only defines a safe tensor container. It does not say which model class to instantiate or which tokenizer turns text into the expected ids. Loading Llama-shaped tensors into a GPT-2 graph fails on names and shapes; using the wrong tokenizer can produce valid tensor dimensions while mapping the same text to different ids and silently corrupting behavior.

Portable graph formats such as ONNX make operators and tensor interfaces explicit, but compatibility still depends on the runtime supporting the graph’s operator versions, data types, custom operators, and hardware kernels. “The file opened” is weaker evidence than a known-answer inference test against the source runtime.

## Training pipeline

![[11 AI & ML/11 AI & ML-LLM-20260705173634102.png]]

Training is usually discussed in three stages, although real model families combine and repeat them.

1. **Pretraining** fits the architecture’s language objective over a large corpus. A decoder-only base model learns causal next-token prediction; BERT and T5 use the objectives described above. The output is a base checkpoint, not automatically a conversational assistant.
2. **Supervised fine-tuning (SFT)** trains on instruction-response or task examples. It teaches the model which continuation or target sequence should answer an instruction. [[Fine-tuning]] covers full and parameter-efficient updates, data contracts, and evaluation.
3. **Preference or reward optimization** uses comparisons or verifiable rewards to favor some outputs over others. [[Preference Alignment]] covers RLHF and DPO; [[GRPO]] covers group-relative online reinforcement learning.

```text
base checkpoint = architecture + tokenizer + pretrained tensors + configuration
instruction model = compatible base checkpoint + SFT + optional preference/reward stage
deployable artifact = model bundle + compatible runtime + release evaluation
```

Training provenance matters at deployment. Record the base revision, data version, tokenizer files, configuration, adapters, quantization recipe, runtime version, and evaluation result. A model name without those versions is not enough to reproduce output or investigate a regression.

## Failure modes

**Architecture mismatch** — tensor names or shapes fail during load, or a permissive loader leaves expected parameters uninitialized.

**Tokenizer mismatch** — loading appears successful, but prompts use different token ids, special markers, or normalization and quality collapses.

**Runtime mismatch** — unsupported operators, cache layout, precision, or quantization kernels cause load failure, numerical drift, or a slow fallback path.

**Training-stage ambiguity** — benchmark results for a base checkpoint are compared with an instruction or preference-aligned variant as though they were the same model.

## Questions

> [!QUESTION]- Why is T5 generative while BERT is not an open-ended generator?
> BERT is an encoder-only masked-language model that returns contextual representations. T5 has a bidirectional encoder plus an autoregressive decoder that generates a target sequence conditioned on the encoded input.

> [!QUESTION]- What must match besides checkpoint tensor bytes?
> The architecture/configuration, tensor names and layouts, tokenizer and special-token ids, adaptation or quantization metadata, and runtime operator implementations must agree. Verify the bundle with known-answer inference, not only a successful file parse.

## References

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) — the primary encoder-decoder transformer architecture and attention mechanism.
- [BERT](https://arxiv.org/abs/1810.04805) — the primary encoder-only masked-language-model pretraining paper.
- [Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer](https://arxiv.org/abs/1910.10683) — the primary T5 encoder-decoder architecture and span-corruption text-to-text objective.
- [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) — the primary GPT-3 decoder-only causal-language-model report.
- [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) — the primary InstructGPT SFT, reward-model, and RLHF pipeline.
- [ONNX concepts](https://onnx.ai/onnx/intro/concepts.html) — the normative graph, tensor, operator, and opset model used to exchange executable model structures across runtimes.
