---
publish: true
created: 2026-07-05T10:54:06.723+03:00
modified: 2026-07-06T09:25:44.623+03:00
---

# Intro

Generation is where the model produces output from a prompt and optional context. The engineering challenge is not getting any output — it is getting reliable, grounded, correctly formatted output at the right cost and latency. This requires controlling three things: how the model samples tokens (parameters), what evidence constrains the output (grounding), and what shape the output takes (structured output).

The mechanism: the model predicts a probability distribution over the vocabulary at each step, picks a token according to the sampling parameters, and appends it. Repeat until a stop condition fires. Every parameter you set reshapes that distribution — temperature scales it, top-p truncates it, penalties suppress repetition. The prompt and context determine what the distribution looks like in the first place. Structured output constraints mask invalid tokens before sampling.

```mermaid
flowchart LR
    P[Prompt + Context] --> D[Token Distribution]
    D --> S[Sampling Parameters]
    S --> M[Structure Mask]
    M --> T[Next Token]
    T --> O[Output]
```

## Generation Parameters

Generation parameters control how the model selects the next token from the predicted distribution. They shape randomness, repetition, length, and reproducibility.

**`temperature`** scales the logit distribution before softmax. Temperature 0 (or near-zero) makes the model deterministic — it always picks the highest-probability token. Temperature 1.0 samples proportionally to learned probabilities. Temperature above 1.0 flattens the distribution, increasing diversity but also increasing the chance of low-quality tokens. In practice: use 0–0.3 for factual/grounded tasks, 0.7–1.0 for creative generation.

**`top_p`** (nucleus sampling) truncates the distribution to the smallest set of tokens whose cumulative probability mass reaches the threshold. `top_p=0.9` means the model samples from the top 90% of probability mass, discarding the long tail of unlikely tokens. This is an alternative way to control randomness — most provider documentation recommends adjusting temperature OR top\_p, not both simultaneously.

**`top_k`** limits sampling to the top K most probable tokens regardless of their cumulative probability. Available in Anthropic's API and open-source inference stacks, but not in OpenAI's API. Less adaptive than top\_p because a fixed K may be too restrictive for some distributions and too permissive for others.

**`frequency_penalty`** and **`presence_penalty`** control repetition. Frequency penalty scales with how many times a token has appeared (discourages repeating proportionally). Presence penalty applies a flat bias against any token that has appeared at all (pushes toward new topics). Range: -2.0 to 2.0 in OpenAI's API. Use moderate values (0.3–0.8) for generation tasks prone to looping.

**`max_tokens`** / **`max_completion_tokens`** caps response length. Set this based on the expected output size plus a margin. If the model hits the cap mid-sentence, the output is truncated without a proper ending — check the `finish_reason` in the API response to detect this. Reasoning models (o-series) use `max_completion_tokens` which includes internal reasoning tokens, not just visible output.

**`stop`** sequences terminate generation when the model produces a matching string. Useful for structured prompts where a delimiter signals the end of the useful output.

**`seed`** enables best-effort deterministic sampling. With the same seed and identical inputs, the model attempts to produce the same output. This is not guaranteed across provider infrastructure changes — track response fingerprints when reproducibility matters.

**`logprobs`** / **`top_logprobs`** expose token-level probabilities in the response. Use these for debugging: if the model assigns very low probability to the tokens it produced for a key claim, the output is unstable. For classification outputs, logprobs can serve as a confidence signal.

Note: some reasoning-focused models do not support certain sampling parameters or treat them as fixed. Check model-specific API docs before sending `temperature` or `top_p` — unsupported values may be silently ignored or cause request rejection depending on the provider.

## Grounding and Citations

Grounding constrains model output to evidence from provided context rather than parametric memory. A model can produce fluent, confident text that is entirely fabricated — grounding makes the evidence link explicit and testable. See [[Hallucinations]] for broader coverage of why models fabricate.

The grounding contract defines the rules the model must follow:

- Use only the provided sources to answer
- Attach a citation to each factual claim
- If evidence is insufficient or conflicting, abstain rather than guess
- Do not combine source material with parametric knowledge

**Citation generation** — the model tags each claim with the source that supports it. Anthropic's Citations API returns structured citation objects with character-level source locations. For other providers, prompt the model to output citation tags and validate them in post-processing.

**Claim verification** — after generation, decompose the answer into individual claims and check each against the cited source. Natural Language Inference (NLI) models are the standard approach: a lightweight model classifies each claim-source pair as entailed, neutral, or contradicted. Azure AI Content Safety offers groundedness detection as a managed service using this approach. MiniCheck (EMNLP 2024) provides an efficient open-source alternative.

**Abstention** — when evidence is insufficient, the model should explicitly state this rather than fabricate an answer. Abstention preserves user trust. Define the abstention output format in the system prompt: a specific phrase like "I don't have enough information to answer this" rather than a vague hedge.

Grounding is especially critical in [[07 AI & ML/LLM/RAG/RAG|RAG]] pipelines where the model must stay faithful to retrieved documents, but the same principles apply to any context-augmented generation: tool outputs, database results, or user-provided documents.

## Context Assembly

Context assembly determines what evidence enters the prompt and in what order — the core of [[Context Engineering]]. Research on how models use long contexts ("Lost in the Middle", Liu et al. 2023) shows a U-shaped performance curve: models attend most to information at the beginning and end of the context, and least to information in the middle.

Practical implications:

- Place the most relevant evidence at the start of the context window. If using multiple chunks, put the highest-ranked chunks first.
- For long contexts, consider placing a summary or key evidence at both the start and end to exploit primacy and recency effects.
- Keep the context compact and diverse — prefer fewer, higher-quality chunks over many partial fragments. More context is not always better; noise dilutes signal.
- Include source identifiers (document IDs, section markers) in the context payload so the model can produce traceable citations.
- When the total evidence exceeds the context window, truncate lower-ranked chunks rather than truncating all chunks. A complete chunk with full context is more useful than fragments of many chunks.

For RAG-specific context assembly patterns, see [[07 AI & ML/LLM/RAG/RAG|RAG]].

## Structured Output

Structured output ensures the model returns data in a machine-parsable format (JSON, function calls, enums) rather than free text. Three mechanisms exist, in order of reliability:

**Constrained decoding (Structured Outputs)** — the provider masks the logit distribution at each step so only tokens valid according to a JSON schema can be produced. The output is schema-compliant by construction, not by luck. OpenAI's `response_format: { type: "json_schema" }` and Azure's equivalent use this approach. Failure modes: the schema itself may be ambiguous, the model may produce technically valid but semantically nonsensical JSON, and complex nested schemas can degrade output quality.

**JSON mode** — guarantees the output is valid JSON but does not enforce a specific schema. The model can return any JSON structure. Useful when you want parsable output but the schema is flexible. Fails when the model returns valid JSON that does not match your expected structure.

**Function calling** — the model selects a function from a provided list and returns structured arguments. Best for tool-use scenarios where the model decides which action to take. The arguments conform to the function's parameter schema. Reliability depends on the model's ability to select the right function and populate arguments correctly.

Decision rule: use constrained decoding (Structured Outputs) when you need a specific schema enforced. Use function calling when the model must choose among multiple tools. Use JSON mode only as a fallback when neither is available.

## Pitfalls

### Temperature Miscalibration

Setting temperature too high for factual tasks introduces token-level randomness that manifests as hallucinated details, inconsistent formatting, and unreliable structured output. Setting it too low for creative tasks produces repetitive, generic output. Teams often set temperature once during prototyping and never revisit it.

Mitigation: evaluate output quality at multiple temperature values on your specific task before locking in a production value. Monitor output quality over time — model updates can shift the effective behavior at the same temperature.

### Lost-in-the-Middle Attention Failure

When relevant evidence lands in the middle of a long context, the model underweights it relative to evidence at the start or end. This causes the model to miss critical information even though it was provided. The effect is strongest with 10+ context chunks.

Mitigation: order chunks by relevance (most relevant first). For high-stakes queries, place key evidence at both the start and end of the context. Reduce context size by filtering lower-quality chunks rather than including everything.

### Grounding Bypass Under Conflicting Evidence

When retrieved sources contain conflicting information, models often silently pick one version instead of flagging the conflict. The output appears grounded but omits the contradiction. This is especially dangerous when sources from different time periods or jurisdictions disagree.

Mitigation: instruct the model explicitly to surface conflicts rather than resolve them silently. Add a post-generation check that compares claims against all provided sources, not just the one the model cited.

### Structured Output Schema Mismatch

The model produces valid JSON that passes schema validation but contains semantically wrong values — wrong field mappings, hallucinated enum values that happen to be valid strings, or arrays with the right structure but wrong content. Schema compliance does not guarantee correctness.

Mitigation: validate semantic content in addition to schema compliance. For critical fields, add explicit value constraints or post-generation checks. Test with adversarial inputs where the model must distinguish between structurally similar but semantically different schemas.

## Tradeoffs

| Factor | Low temperature with strict grounding | High temperature with loose grounding | Structured output | Free-text output |
| --- | --- | --- | --- | --- |
| Reliability | Highest -- deterministic and evidence-bound | Lowest -- creative but unpredictable | High -- schema-enforced format | Low -- format varies per response |
| Expressiveness | Limited -- constrained by source material | Highest -- explores beyond evidence | Limited -- constrained by schema | Highest -- natural language |
| Hallucination risk | Low -- grounding catches fabrication | High -- temperature amplifies fabrication | Medium -- format is reliable but content may not be | High -- no format or content constraints |
| Cost and latency | Higher if using verification pass | Lower -- single generation | Higher -- constrained decoding adds overhead | Lowest -- single unconstrained generation |
| Best for | Factual QA and RAG and compliance | Brainstorming and creative writing and exploration | API responses and data extraction and tool integration | Conversational and explanatory and long-form |

## Questions

> [!QUESTION]- Why is adjusting temperature and top\_p simultaneously discouraged?
> Both reshape the same token probability distribution but through different mechanisms. Temperature scales the logit distribution (sharpening or flattening), while top\_p truncates it to a cumulative mass threshold. Changing both creates unpredictable interactions — a low temperature already concentrates probability mass, so a low top\_p on top of it may have no additional effect, while a high temperature with a low top\_p creates conflicting signals. Tuning one while keeping the other at default keeps behavior predictable.

> [!QUESTION]- Why can a grounded response still contain unsupported claims despite citation tags?
> Models can attach citation markers to claims without verifying entailment. The citation looks correct but the cited passage may not actually support the claim — it may be topically related but not evidentially sufficient. This is why citation generation alone is not grounding: a separate claim-to-source verification step (NLI or similar) is needed to confirm that each cited passage actually entails the claim it is attached to.

> [!QUESTION]- When should constrained decoding be preferred over JSON mode for structured output?
> Constrained decoding enforces a specific JSON schema at the token level during generation — the output is structurally compliant by construction. JSON mode only guarantees valid JSON without schema enforcement, so the model can return any valid JSON structure. Use constrained decoding when downstream systems depend on a specific schema (API contracts, database inserts, tool arguments). Use JSON mode when you want parsable output but the structure is flexible or exploratory.

## References

- [Chat Completions API — generation parameters reference (OpenAI)](https://platform.openai.com/docs/api-reference/chat/create)
- [Messages API — temperature, top\_p, top\_k, stop\_sequences (Anthropic)](https://docs.anthropic.com/en/api/messages)
- [REST API reference — generation parameters for Azure OpenAI (Microsoft Learn)](https://learn.microsoft.com/azure/ai-foundry/openai/reference)
- [Structured Outputs — JSON schema enforcement and constrained decoding (OpenAI)](https://platform.openai.com/docs/guides/structured-outputs)
- [Citations API — source-grounded responses with citation objects (Anthropic)](https://docs.anthropic.com/en/docs/build-with-claude/citations)
- [Groundedness detection — NLI-based claim verification (Azure AI Content Safety)](https://learn.microsoft.com/azure/ai-services/content-safety/concepts/groundedness)
- [Lost in the Middle — how language models use long contexts (Liu et al. 2023)](https://arxiv.org/abs/2307.03172)
- [MiniCheck — efficient fact-checking of LLMs on grounding documents (EMNLP 2024)](https://aclanthology.org/2024.emnlp-main.499)
- [Using logprobs for debugging and confidence estimation (OpenAI Cookbook)](https://cookbook.openai.com/examples/using_logprobs)
- [Evaluating LLM temperature — systematic methodology for production tuning (Promptfoo)](https://www.promptfoo.dev/docs/guides/evaluate-llm-temperature/)
