---
topic:
  - "AI & ML"
subtopic:
  - "LLM"
level:
  - "3"
priority: Medium
status: Creation

dg-publish: true
---

# Intro

Generation parameters (sometimes called decoding / sampling parameters) control how an LLM chooses the next token. They shape randomness, repetition, length, and whether you can reproduce outputs.

## Deeper Explanation

The most common parameters:

- `temperature`: randomness (higher = more diverse, lower = more deterministic).
- `top_p`: nucleus sampling; restricts the token pool to a probability mass.
- `max_tokens` / `max_completion_tokens`: caps the response length.
- `stop`: sequences that terminate generation.
- `presence_penalty`: discourages repeating tokens at all (pushes to new topics).
- `frequency_penalty`: discourages repeating tokens proportional to frequency.
- `seed`: best-effort determinism for repeated runs (not guaranteed).
- `logprobs` / `top_logprobs`: expose token likelihoods for debugging and evaluation.

Provider-specific (not universal):

- `top_k`: limit sampling to the top K tokens (common in many open-source stacks and some cloud providers).

Model-specific caveat:

- Some reasoning-focused models ignore sampling parameters like `temperature` and `top_p` entirely.

## Temperature vs Top_p

Both control randomness, but in different ways:

- `temperature` scales the distribution (softens or sharpens probabilities).
- `top_p` truncates the distribution to the smallest set of tokens whose cumulative probability mass is `top_p`.

In many APIs, the official guidance is to change one or the other, not both.

Practical rule of thumb:

- Prefer `temperature` when you want a smooth creativity dial.
- Prefer `top_p` when you want to limit "long tail" weird tokens while keeping some diversity.
- If you must tune both, keep one close to default and move the other in small steps.

## Example

Typical chat-completions style request (parameter names differ by provider/model):

```json
{
  "temperature": 0.2,
  "top_p": 1.0,
  "max_tokens": 300,
  "stop": ["\n\nUser:"]
}
```

Debugging hallucinations with `logprobs`:

- If the model assigns very low probability to the tokens it produced for a key claim, it can be a sign the output is unstable.
- For classification-style outputs, `logprobs` can be used to compute confidence-like signals.

## Questions

> [!QUESTION]- Should I tune temperature and top_p together?
> Usually no. Many official docs recommend changing either `temperature` or `top_p`, but not both, to keep behavior predictable and tuning simpler.

> [!QUESTION]- Why is output not perfectly reproducible even with a seed?
> Some providers only make a best effort to sample deterministically and note that determinism is not guaranteed. Track backend/version changes (for example via response fingerprints when available).

## Links

- [Azure OpenAI REST API reference (temperature, top_p, stop, max_tokens, penalties)](https://learn.microsoft.com/azure/ai-foundry/openai/reference#components)
- [Azure OpenAI REST API reference (seed determinism note)](https://learn.microsoft.com/azure/ai-foundry/openai/reference#completions)
- [Create completion - OpenAI API Reference (temperature vs top_p guidance)](https://developers.openai.com/api/reference/resources/completions/methods/create)
- [Messages - Anthropic Claude API (top_p, top_k)](https://docs.anthropic.com/en/api/messages)
- [Using logprobs (OpenAI Cookbook)](https://developers.openai.com/cookbook/examples/using_logprobs/)
- [Content generation parameters (Google Cloud Vertex AI)](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters)
- [Azure OpenAI reasoning models (unsupported parameters list)](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/reasoning#api-%26-feature-support)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/11 AI & ML|11 AI & ML]]
>
> **Topics**
> - [[Software Engineering/11 AI & ML/LLM/Agents/Agents|Agents]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/Prompting/Prompting|Prompting]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Guardrails|Guardrails]]
> - [[Software Engineering/11 AI & ML/LLM/Hallucinations|Hallucinations]]
> - [[Software Engineering/11 AI & ML/LLM/OWASP vulnerabilities on AI LLM|OWASP vulnerabilities on AI LLM]]
<!-- whats-next:end -->
