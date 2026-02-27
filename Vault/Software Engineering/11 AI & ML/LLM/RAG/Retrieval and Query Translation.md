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

Retrieval quality is usually one of the strongest levers for RAG answer quality. Query translation improves retrieval by rewriting one user query into multiple retrieval-ready views, then fusing results before generation.

## Retrieval Modes

- **Dense retrieval**: semantic match via embeddings.
- **Sparse retrieval (BM25)**: lexical match for exact terms.
- **Hybrid retrieval**: combine dense + sparse results, often with Reciprocal Rank Fusion (RRF).

RRF reminder:

```text
RRF_score(doc) = sum(1 / (rank_i + k))
```

## Query Translation Techniques

| Technique | What it improves | Typical failure mode |
|---|---|---|
| Multi-Query | Recall for paraphrased/ambiguous phrasing | Query drift adds noise |
| RAG-Fusion | Robustness by fusing multiple query result lists | More retrieval latency/cost |
| Decomposition | Multi-hop questions with multiple constraints | Fragmentation loses global constraints |
| Step-Back prompting | Background context for specific questions | Overly abstract results |
| HyDE | Retrieval for short/vague inputs | Hypothetical text biases retrieval |

Practical constraints:

- Keep generated query count bounded (for many systems, 2-5 is a practical starting range).
- Preserve hard constraints in translation prompts (IDs, names, versions, dates).
- Apply deduplication and optional reranking after fusion.

## Example

```text
User query: "How did API v2 rate limits change for partner tier?"

Generated queries:
1) "API v2 partner tier rate limit changes"
2) "partner plan throttling updates in v2 release notes"
3) "compare v1 vs v2 partner request quota"

Run retrieval per query -> fuse with RRF -> rerank top candidates -> pass top-k to generator.
```

## Questions

> [!QUESTION]- Why is RRF often preferred over naive score averaging in hybrid retrieval?
> **Expected answer:** Dense and sparse retrievers output scores on different scales, so averaging can be unstable without careful normalization. RRF fuses by rank position, which is more robust across heterogeneous retrievers.

> [!QUESTION]- When does decomposition outperform a single complex query?
> **Expected answer:** Decomposition helps when the question is multi-hop or combines multiple entities and constraints. It allows focused retrieval per sub-question, then synthesis across retrieved evidence.

## References

- [Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods](https://dl.acm.org/doi/10.1145/1571941.1572114)
- [RAG-Fusion: a New Take on Retrieval-Augmented Generation](https://arxiv.org/abs/2402.03367)
- [Take a Step Back: Evoking Reasoning via Abstraction in Large Language Models](https://arxiv.org/abs/2310.06117)
- [Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)](https://aclanthology.org/2023.acl-long.99/)
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
> - [[Software Engineering/11 AI & ML/LLM/RAG/Strategy and Advanced Patterns|Strategy and Advanced Patterns]]
<!-- whats-next:end -->
