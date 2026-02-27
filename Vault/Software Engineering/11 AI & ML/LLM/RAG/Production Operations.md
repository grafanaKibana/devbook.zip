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

Production RAG fails from operations issues as often as model quality issues: stale caches, latency spikes, drift, and access-control mistakes. Operational design should optimize cost and latency without violating freshness or authorization boundaries.

## Caching Layers

- **Embedding cache**: cache vectors by content hash + model/version.
- **Retrieval cache**: cache top-k candidate IDs by normalized processed query + index version + auth scope.
- **LLM cache**: cache full responses only when prompt/context/permissions are stable enough.

Security-critical rule: namespace caches by tenant and authorization context to avoid cross-user leaks.

## Monitoring

- **Quality**: Recall@k, faithfulness, citation accuracy.
- **Latency**: per-stage p50/p95/p99.
- **Cost**: cost per query and cache hit rates.
- **Data health**: document freshness and reindex lag.

## Example

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

## Questions

> [!QUESTION]- Why do retrieval cache keys need `tenant_id` and `authz_context_hash`?
> **Expected answer:** Retrieval output eligibility depends on permissions. Without tenant/authz scoping, cached results can leak unauthorized documents across users or roles.

> [!QUESTION]- Why can long embedding-cache TTLs be safer than long LLM-response TTLs?
> **Expected answer:** Embedding keys are usually content-addressed and self-invalidating on content/model changes. LLM responses depend on mutable retrieval context and policy rules, so stale-answer risk is higher.

## References

- [Prompt caching (OpenAI API docs)](https://platform.openai.com/docs/guides/prompt-caching)
- [How to cache semantic search (Redis engineering)](https://redis.io/blog/how-to-cache-semantic-search/)
- [Embedding drift detection methods (Evidently AI)](https://www.evidentlyai.com/blog/embedding-drift-detection)

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
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval and Query Translation|Retrieval and Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Strategy and Advanced Patterns|Strategy and Advanced Patterns]]
<!-- whats-next:end -->
