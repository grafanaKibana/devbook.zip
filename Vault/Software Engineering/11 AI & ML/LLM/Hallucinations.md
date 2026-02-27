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

LLM hallucinations are outputs that sound plausible but are not supported by the model's provided evidence or by reality. In product terms: a hallucination is a correctness failure that often looks confident.

## Deeper Explanation

Why hallucinations happen (common drivers):

- The model is forced to answer without enough information.
- The prompt rewards fluency over evidence.
- Retrieval returns weak/irrelevant context (RAG failure).
- The model mixes multiple partially-related memories into a single statement.

How to detect them:

- Require evidence: citations, quotes, or links for factual claims.
- Run groundedness checks for RAG answers (is each claim supported by retrieved context?).
- Use targeted eval sets that contain "unanswerable" questions and adversarial cases.
- Compare against tools of record (databases/APIs) for structured facts.

Mitigations that work in practice:

- Add an explicit abstention policy: "If you are not sure, say you don't know and ask a clarifying question."
- Prefer retrieval/tool use for factual queries; keep the model focused on summarizing provided sources.
- Make the model quote-first: extract relevant passages, then answer.
- Post-validate: verify claims with a checker (rules + judge) and reject/repair outputs.
- Tighten output format: structured JSON reduces room for free-form invention.

## Example

RAG-style instruction snippet to reduce unsupported claims:

```text
System: Answer using only the provided SOURCES.
Rules:
- If SOURCES do not contain the answer, say "I don't know based on the provided sources".
- For each factual claim, add a citation like [S1] referencing the source.

User:
Question: <question>
SOURCES:
[S1] <retrieved snippet 1>
[S2] <retrieved snippet 2>
```

## Questions

> [!QUESTION]- How do I tell hallucination vs. missing retrieval?
> If a claim is absent from retrieved snippets, it may be either retrieval failure or model invention. First improve retrieval (query, chunking, ranking), then enforce "answer only from sources" with citations and abstention.

> [!QUESTION]- Do lower temperatures eliminate hallucinations?
> No. Lower temperature reduces randomness, but a deterministic wrong answer is still wrong. Grounding, tool use, and verification are the reliable fixes.

## Links

- [Reduce hallucinations (Anthropic Docs)](https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- [Groundedness in Azure AI Content Safety](https://learn.microsoft.com/azure/ai-services/content-safety/concepts/groundedness)
- [Developing hallucination guardrails (OpenAI Cookbook)](https://cookbook.openai.com/examples/developing_hallucination_guardrails)

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
> - [[Software Engineering/11 AI & ML/LLM/RAG/RAG|RAG]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Embeddings|Embeddings]]
> - [[Software Engineering/11 AI & ML/LLM/Generation|Generation]]
> - [[Software Engineering/11 AI & ML/LLM/Guardrails|Guardrails]]
> - [[Software Engineering/11 AI & ML/LLM/OWASP vulnerabilities on AI LLM|OWASP vulnerabilities on AI LLM]]
<!-- whats-next:end -->
