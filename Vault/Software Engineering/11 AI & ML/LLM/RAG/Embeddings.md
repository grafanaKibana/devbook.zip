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

Embeddings transform text into vectors so retrieval can match semantic meaning instead of exact wording. They are critical when users ask with paraphrases, synonyms, or cross-language phrasing. The engineering decision is not just model quality, but the quality-latency-cost tradeoff under your corpus and SLA.

Example: query "how to throttle partner API traffic" can match documents using "rate limiting for partner plan" even when no exact keywords overlap.

## Why Embeddings vs Keyword Search

- Embeddings are strong for semantic similarity and paraphrases.
- Keyword search is strong for exact lexical constraints (error code, SKU, exact API symbol).
- Most production systems use hybrid retrieval to combine both strengths.

## How Embedding Models Differ

### Model Size and Capacity

- Larger models usually separate nuanced concepts better, especially in specialized domains.
- Smaller models are cheaper and faster, often enough for simple FAQ-style corpora.

### Dimensionality

- Higher dimensions can improve representational granularity.
- Higher dimensions increase vector storage and ANN compute.
- Lower dimensions reduce memory and latency but may collapse fine distinctions.

### Domain and Language Coverage

- Evaluate multilingual and domain-specific queries separately.
- A model that looks strong on generic benchmarks can still underperform on internal terminology.

## Practical Selection Pattern

1. Start with a smaller embedding model as baseline.
2. Measure Recall@k and citation quality on your labeled set.
3. Upgrade model size only when failures are semantic misses, not chunking/filtering issues.

## Example

```yaml
embedding:
  model: text-embedding-3-small
  dimensions: 1536
  index: hnsw
  evaluation:
    primary_metric: recall_at_5
    guard_metric: latency_p95_ms
```

## Questions

> [!QUESTION]- Why can a high-dimensional model still fail retrieval quality goals?
> **Expected answer:** Embedding quality is only one part of retrieval. Poor chunking, weak metadata filters, or bad query translation can dominate failure modes even with a strong model.

> [!QUESTION]- When should keyword signals be retained even after deploying strong embeddings?
> **Expected answer:** Keep keyword signals for exact constraints such as IDs, codes, and function names, where semantic proximity alone can return plausible but wrong documents.

## References

- [Embeddings guide (OpenAI docs)](https://platform.openai.com/docs/guides/embeddings)
- [Sentence Transformers documentation](https://www.sbert.net/)
- [How we built hybrid search (Weaviate engineering)](https://weaviate.io/blog/hybrid-search-explained)

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
> - [[Software Engineering/11 AI & ML/LLM/RAG/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Generation|Generation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Grounding|Grounding]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring|Monitoring]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Query Translation|Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/RAG vs Fine-Tuning|RAG vs Fine-Tuning]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]]
<!-- whats-next:end -->
