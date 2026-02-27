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

Good retrieval is necessary but insufficient. Grounding and generation decide whether retrieved evidence becomes a faithful answer or a polished hallucination. The goal is to force evidence-backed output through prompt contract, citation format, and verification.

## Context Assembly and Prompt Contract

- Order chunks by relevance and diversity.
- Keep context compact to reduce distraction and lost-in-the-middle effects.
- Require source identifiers for factual claims.
- Add abstention behavior when evidence is missing.

Example contract:

```text
Use only sources [S1..Sn].
If evidence is missing, answer: "Insufficient evidence in provided sources."
Every factual sentence must include at least one citation tag like [S2].
Do not rely on unstated prior knowledge.
```

## Reducing Hallucinations

- **Before generation**: better retrieval precision (hybrid + rerank + confidence gate).
- **During generation**: citation forcing and strict abstention instructions.
- **After generation**: claim-level groundedness check and citation validation.

For high-risk domains, failed verification should trigger abstention or human review.

## Example

```text
Claim check loop:
1) Extract claims from answer.
2) Verify each claim against cited source spans.
3) If unsupported claim exists, reject/regenerate.
```

## Questions

> [!QUESTION]- Why is citation forcing alone not enough to prevent hallucinations?
> **Expected answer:** Models can attach citations that look correct but do not support the claim. You still need post-generation validation that maps each claim to supporting evidence spans.

> [!QUESTION]- When should a system abstain instead of answering?
> **Expected answer:** Abstain when retrieval confidence is low, evidence is contradictory, or claim verification fails for material statements. This is safer than generating unsupported conclusions.

## References

- [Self-RAG: Learning to Retrieve, Generate, and Critique Through Self-Reflection](https://arxiv.org/abs/2310.11511)
- [Corrective Retrieval Augmented Generation (CRAG)](https://arxiv.org/abs/2401.15884)
- [RAG techniques (Azure AI Search)](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)
- [Evaluate RAG with LLM evals and benchmarking 2.0 (Arize)](https://arize.com/blog/evaluate-rag-with-llm-evals-and-benchmarking-2.0/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/RAG/Chunking and Embeddings|Chunking and Embeddings]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Production Operations|Production Operations]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval and Query Translation|Retrieval and Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Strategy and Advanced Patterns|Strategy and Advanced Patterns]]
<!-- whats-next:end -->
