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

Retrieval is the stage that decides what evidence enters the prompt. In most RAG systems, generation quality plateaus at the quality of retrieval. Good retrieval balances recall, precision, and latency across different query types such as semantic paraphrases, exact identifiers, and multi-constraint requests.

Example: if a user asks for "rate limit error 429 behavior in partner tier," dense retrieval can capture semantic intent while sparse retrieval catches exact terms like `429` and `partner tier`. Hybrid retrieval usually covers both better than either mode alone.

## Retrieval Modes

### Dense Retrieval

How it works:

- Embed query and chunks into vector space.
- Retrieve nearest neighbors by cosine or dot-product similarity.

Best fit:

- Semantic paraphrases and natural-language questions.
- Multilingual and synonym-heavy corpora.

Failure pattern:

- Misses exact lexical constraints like IDs, SKUs, and error codes.

### Sparse Retrieval (BM25)

How it works:

- Rank documents by lexical overlap and term statistics.

Best fit:

- Exact keyword constraints and domain-specific tokens.

Failure pattern:

- Weak semantic recall for paraphrased user intent.

### Hybrid Retrieval

How it works:

- Run dense and sparse retrieval in parallel.
- Fuse ranked lists into one candidate set.

Fusion baseline:

```text
RRF_score(doc) = sum(1 / (rank_i + k))
```

Best fit:

- Production systems with mixed query patterns.

Failure pattern:

- Over-retrieval noise if top-k is high and reranking/deduplication is weak.

## Indexing and Filtering

- Index choice (HNSW/IVF variants) affects latency and recall tradeoff.
- Metadata filters must apply before final ranking for tenant-safe retrieval.
- Keep index versioning explicit so cache keys and rollout behavior are deterministic.

## Practical Baselines

- Start with hybrid retrieval and conservative top-k (for many systems, 5-20 is a practical baseline).
- Add reranking only after baseline retrieval is stable.
- Track retrieval metrics per segment (tenant, locale, domain) to avoid aggregate blind spots.

## Questions

> [!QUESTION]- Why can dense-only retrieval underperform on technical support workloads?
> Support workloads often include exact lexical constraints such as error codes, version strings, and SKU IDs. Dense retrieval captures semantic similarity but can miss those exact tokens, reducing retrieval precision.

> [!QUESTION]- Why does retrieval require metadata filters even when semantic matching is strong?
> Semantic relevance does not enforce authorization boundaries. Without tenant and ACL filters, retrieval can return context that is relevant but unauthorized.

## References

- [RAG techniques (Azure AI Search)](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)
- [Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods](https://dl.acm.org/doi/10.1145/1571941.1572114)
- [Hybrid search with RRF (MongoDB docs)](https://www.mongodb.com/docs/atlas/atlas-vector-search/tutorials/reciprocal-rank-fusion/)
- [Deconstructing RAG (LangChain engineering)](https://blog.langchain.com/deconstructing-rag/)

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
> - [[Software Engineering/11 AI & ML/LLM/RAG/Grounding|Grounding]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring|Monitoring]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Query Translation|Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/RAG vs Fine-Tuning|RAG vs Fine-Tuning]]
<!-- whats-next:end -->
