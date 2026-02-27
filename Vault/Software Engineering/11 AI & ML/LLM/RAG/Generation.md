---
topic:
  - "AI & ML"
subtopic:
  - "LLM"
level:
  - "2"
priority: High
status: Creation
---

# Intro

Generation converts retrieved evidence into the final answer. This stage is where good retrieval can still fail: weak prompt contracts, poor context ordering, or missing abstention logic can turn correct evidence into incorrect output.

Example: the right source chunk is retrieved, but the model omits a "partner-tier exception" sentence because context assembly did not prioritize it. The answer becomes fluent and wrong.

## Context Assembly

- Keep top evidence compact and diverse.
- Prefer section-complete chunks over many partial fragments.
- Include source IDs in context payload to support traceable citations.

## Prompt Construction

- State role and task clearly.
- Encode hard constraints: answer from provided sources only.
- Define abstention behavior for insufficient evidence.
- Specify required answer format and citation style.

## Model Selection

- Use smaller models when latency and cost dominate and answer complexity is modest.
- Use larger models when synthesis across multiple evidence pieces is the main failure mode.
- Select model by eval evidence, not benchmark reputation alone.

## Example

```text
System contract:
- Use only [S1..Sn]
- Cite every factual claim with source tag
- If evidence conflicts, explain conflict
- If evidence is insufficient, abstain
```

## Questions

> [!QUESTION]- Why can generation quality regress even if retrieval metrics improve?
> **Expected answer:** Better retrieval recall can increase context volume and noise. Without tighter context assembly and prompt constraints, the model may attend to weaker evidence and produce less precise answers.

> [!QUESTION]- When should abstention be part of generation logic?
> **Expected answer:** Include abstention when wrong answers are costly and evidence can be missing or conflicting. Abstention is a controlled failure mode that preserves trust.

## References

- [RAG techniques (Azure AI Search)](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)
- [Prompt engineering best practices (Anthropic)](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Deconstructing RAG (LangChain engineering)](https://blog.langchain.com/deconstructing-rag/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/RAG/Advanced RAG Patterns|Advanced RAG Patterns]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Caching|Caching]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Chunking|Chunking]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Embeddings|Embeddings]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Grounding|Grounding]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring|Monitoring]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Query Translation|Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/RAG vs Fine-Tuning|RAG vs Fine-Tuning]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]]
<!-- whats-next:end -->
