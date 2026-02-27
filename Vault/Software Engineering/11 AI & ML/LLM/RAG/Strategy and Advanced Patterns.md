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

RAG and fine-tuning solve different problems. RAG provides fresh, inspectable knowledge at inference time; fine-tuning shapes model behavior and style in model weights. Most mature systems combine both: RAG for knowledge, fine-tuning for behavior consistency.

## RAG vs Fine-Tuning

| Decision axis | RAG | Fine-tuning |
|---|---|---|
| Knowledge freshness | Strong | Weak |
| Source traceability | Strong | Weak |
| Behavioral control | Medium (prompt/runtime) | Strong (weights) |
| Time to first value | Faster | Slower |

Practical heuristic:

1. Start with RAG.
2. Add fine-tuning when style/format/reasoning behavior is unstable.
3. Keep mutable facts in retrieval, not in weights.

## Advanced RAG Patterns

- **Agentic RAG**: planner chooses tools or retrieval route.
- **Iterative retrieval**: retrieve -> reason -> retrieve again.
- **CRAG**: evaluate retrieval quality and trigger fallback retrieval.
- **Graph RAG**: retrieve over entities/relations for connected-fact questions.
- **Multimodal RAG**: combine text with images/tables/audio evidence.

## Example

```text
Policy assistant pattern:
- Base flow: Hybrid retrieval + rerank + citation forcing.
- Escalation: If confidence low, trigger iterative retrieval.
- Final fallback: Abstain and route to human reviewer.
```

## Questions

> [!QUESTION]- Why is fine-tuning alone a weak solution for frequently changing knowledge?
> **Expected answer:** Fine-tuning bakes knowledge into weights and requires retraining to update facts. RAG can update knowledge by updating corpus/index without model retraining.

> [!QUESTION]- When is CRAG worth the added complexity?
> **Expected answer:** CRAG is useful when retrieval quality is inconsistent and errors are expensive. It adds a retrieval-quality check and fallback path, trading higher latency/complexity for higher robustness.

## References

- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)
- [Corrective Retrieval Augmented Generation (CRAG)](https://arxiv.org/abs/2401.15884)
- [Fine-tuning guide (OpenAI)](https://platform.openai.com/docs/guides/fine-tuning)
- [Deconstructing RAG (LangChain engineering)](https://blog.langchain.com/deconstructing-rag/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/RAG/Chunking and Embeddings|Chunking and Embeddings]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Grounding and Generation|Grounding and Generation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Production Operations|Production Operations]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval and Query Translation|Retrieval and Query Translation]]
<!-- whats-next:end -->
