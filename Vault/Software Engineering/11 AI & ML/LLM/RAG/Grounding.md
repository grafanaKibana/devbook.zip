---
topic:
  - "AI & ML"
subtopic:
  - "LLM"
level:
  - "2"
priority: High
status: Creation
dg-publish: false
---

# Intro

Grounding is the discipline of constraining answers to retrieved evidence. A model can sound fluent while being wrong, so grounding makes evidence linkage explicit and testable. The practical objective is to prevent unsupported claims and create a clear abstention path when evidence is missing.

Example: if retrieved sources do not mention a regulation date, a grounded system should abstain instead of inventing a date. The answer quality is lower in coverage but higher in trustworthiness.

## Grounding Contract

- Use only retrieved sources.
- Require citation tags for factual statements.
- Define abstention output when evidence is insufficient.
- Reject unsupported claims in post-check.

Minimal contract pattern:

```text
Use only sources [S1..Sn].
If evidence is insufficient, answer: "Insufficient evidence in provided sources."
Attach at least one citation to each factual statement.
```

## Citation Validation

How it works:

1. Extract claims from draft answer.
2. Resolve cited source IDs.
3. Verify each claim has supporting span evidence.
4. Regenerate or abstain when verification fails.

Where it fits:

- Any production workflow where factual errors are costly.

Pitfall:

- Citation-looking output can still be unsupported, so claim-to-span verification is required.

## Groundedness Failure Modes

- Retrieval brought relevant but partial context.
- Translation/fusion introduced off-topic evidence.
- Prompt contract is ambiguous about abstention rules.
- Verifier is too weak or not run on all material claims.

## Questions

> [!QUESTION]- Why is citation forcing a necessary but insufficient control?
> Citation tags create traceability, but models can still attach weak or irrelevant citations. A separate verification pass must confirm claim-to-evidence support.

> [!QUESTION]- When should grounding checks block the final answer?
> Block when any material claim lacks supporting evidence, when citations are unresolved, or when sources conflict without clear resolution.

## References

- [RAG techniques (Azure AI Search)](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)
- [Self-RAG: Learning to Retrieve, Generate, and Critique Through Self-Reflection](https://arxiv.org/abs/2310.11511)
- [Corrective Retrieval Augmented Generation (CRAG)](https://arxiv.org/abs/2401.15884)
- [Evaluate RAG with LLM evals and benchmarking 2.0 (Arize)](https://arize.com/blog/evaluate-rag-with-llm-evals-and-benchmarking-2.0/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/RAG/Caching|Caching]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Chunking|Chunking]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Embeddings|Embeddings]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Generation|Generation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring|Monitoring]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Query Translation|Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/RAG vs Fine-Tuning|RAG vs Fine-Tuning]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Re-ranking|Re-ranking]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]]
<!-- whats-next:end -->
