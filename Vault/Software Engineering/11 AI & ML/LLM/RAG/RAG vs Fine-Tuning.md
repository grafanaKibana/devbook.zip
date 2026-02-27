---
topic:
  - "AI & ML"
subtopic:
  - "LLM"
level:
  - "2"
priority: Medium
status: Creation
---

# Intro

RAG and fine-tuning optimize different parts of the system. RAG externalizes knowledge into retrievable sources, while fine-tuning changes model behavior in weights. Choosing correctly prevents expensive retraining for problems that retrieval can solve more safely.

Example: if product policy changes weekly, RAG can update by reindexing documents. Fine-tuning would require repeated retraining cycles and still provide weak source traceability.

## Tradeoffs

| Axis | RAG | Fine-tuning |
|---|---|---|
| Knowledge freshness | High | Low |
| Source traceability | High | Low |
| Behavioral consistency | Medium | High |
| Time to first value | Faster | Slower |
| Operational complexity | Retrieval/index ops | Training/eval/release ops |

## Decision Rules

1. Start with RAG when facts change often or citation is required.
2. Add fine-tuning when output style or policy behavior remains unstable after prompt+retrieval tuning.
3. Keep mutable facts in retrieval; keep behavior patterns in fine-tuned weights.

## Combined Pattern

```text
Fine-tune model for behavior (format, tone, refusal policy)
+
Use RAG for current factual knowledge
```

This split keeps updates fast while preserving behavioral control.

## Questions

> [!QUESTION]- Why is fine-tuning a weak first move for a fast-changing knowledge base?
> **Expected answer:** Weight updates are slower and less transparent than retrieval updates. Frequent factual changes fit retrieval pipelines better because documents and indexes can be updated without retraining.

> [!QUESTION]- When is a combined RAG + fine-tuning stack justified?
> **Expected answer:** Use combined architecture when retrieval already provides correct evidence but output behavior still fails requirements such as structure, policy adherence, or domain-specific response style.

## References

- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)
- [Fine-tuning guide (OpenAI)](https://platform.openai.com/docs/guides/fine-tuning)
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
> - [[Software Engineering/11 AI & ML/LLM/RAG/Generation|Generation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Grounding|Grounding]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring|Monitoring]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Query Translation|Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]]
<!-- whats-next:end -->
