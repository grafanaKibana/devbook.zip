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

Caching controls RAG latency and cost, but incorrect cache design can break correctness and security. The right model is layered caching with strict key versioning and permission scoping.

Example: two users ask similar questions, but one user lacks permission for a document. If retrieval cache keys omit authorization context, the second user can receive leaked evidence from cache.

## Cache Layers

### Embedding Cache

- Key by content hash + embedding model version.
- Long TTL is often safe because content/model change naturally invalidates keys.

### Retrieval Cache

- Cache candidate IDs and scores, not final answer text.
- Key fields should include normalized processed query, query processing version, filters, top-k, index version, tenant ID, and authz context hash.

### LLM Response Cache

- Highest hit-rate risk surface.
- Use only when prompt and retrieval context are sufficiently stable.
- Keep conservative TTL and strict policy/version scoping.

## Recommended Key Shape

```text
retrieval_cache_key = hash(
  normalized_processed_query
  + query_processing_version
  + embedding_model_version
  + top_k
  + filters
  + index_version
  + tenant_id
  + authz_context_hash
)
```

## Pitfalls

- Cross-tenant leakage from missing authz fields in key.
- Silent staleness when index version is not part of key.
- Over-caching final answers while source freshness changes quickly.

## Questions

> [!QUESTION]- Why should retrieval cache keys be based on processed query text instead of raw embeddings?
> **Expected answer:** Processed query text and transformation version are easier to audit, deterministic across model upgrades, and align with query translation behavior. Raw embedding bytes are opaque and brittle for versioned cache invalidation.

> [!QUESTION]- Why is response caching riskier than embedding caching?
> **Expected answer:** Response outputs depend on prompt policy, retrieved evidence, and permissions, which change frequently. Embedding caches are usually content-addressed and less coupled to mutable policy state.

## References

- [Prompt caching (OpenAI API docs)](https://platform.openai.com/docs/guides/prompt-caching)
- [How to cache semantic search (Redis engineering)](https://redis.io/blog/how-to-cache-semantic-search/)
- [RAGOps: Operating and Managing RAG Pipelines](https://arxiv.org/abs/2506.03401)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/RAG/Advanced RAG Patterns|Advanced RAG Patterns]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Chunking|Chunking]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Embeddings|Embeddings]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Generation|Generation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Grounding|Grounding]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring|Monitoring]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Query Translation|Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/RAG vs Fine-Tuning|RAG vs Fine-Tuning]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]]
<!-- whats-next:end -->
