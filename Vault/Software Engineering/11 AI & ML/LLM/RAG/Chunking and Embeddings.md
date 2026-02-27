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

Chunking and embedding define what your retriever can see. If chunks are too large, retrieval becomes noisy; if chunks are too small, key context is split away from the answer. Embeddings then map these chunks into vector space, where similarity search happens.

## Chunking Strategies

- **Fixed-size chunking**: simplest baseline, stable latency, can split semantics.
- **Recursive chunking**: split by headings, then paragraphs, then sentences; usually better semantic boundaries.
- **Structure-aware chunking**: preserve document blocks (tables, code, FAQ entries, sections).
- **Semantic chunking**: split where semantic similarity drops, not only by character count.

Practical starting ranges (calibrate on your corpus):

- Chunk size: 300-800 tokens.
- Overlap: 10-20%.
- Keep metadata per chunk: source, section, timestamp, ACL scope.

## Embeddings and Dimensions

Embeddings encode semantic meaning, which helps match paraphrases that keyword search can miss. Keyword search is still better for exact lexical constraints (error codes, SKUs, exact function names), so hybrid retrieval is often the better production default.

Dimension tradeoff:

- Higher dimensions often improve recall but increase storage and ANN compute cost.
- Lower dimensions reduce cost/latency but can hurt fine-grained semantic separation.

Model selection should follow your domain, language coverage, latency budget, and infra constraints.

## Example

```yaml
chunking:
  strategy: recursive
  target_tokens: 500
  overlap_tokens: 80
embedding:
  model: text-embedding-3-small
  dimensions: 1536
  metadata:
    - source_id
    - section
    - updated_at
    - acl_scope
```

## Questions

> [!QUESTION]- Why can smaller chunks reduce answer quality even when retrieval recall improves?
> **Expected answer:** Smaller chunks can isolate facts from the surrounding constraints and definitions required for correct interpretation. Retrieval may find the right sentence, but generation lacks supporting context and can produce incorrect synthesis.

> [!QUESTION]- When should a team prefer a smaller embedding model over a larger one?
> **Expected answer:** Prefer smaller models when latency and cost dominate, corpus semantics are simple, and evaluation shows acceptable recall/precision. Move to larger models when domain language is nuanced or failure cases cluster around semantic misses.

## References

- [RAG techniques (Azure AI Search)](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)
- [text-embedding-3-small and text-embedding-3-large](https://platform.openai.com/docs/guides/embeddings)
- [Sentence Transformers documentation](https://www.sbert.net/)
- [Chunking strategies for RAG (Pinecone)](https://www.pinecone.io/learn/chunking-strategies/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/RAG/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Grounding and Generation|Grounding and Generation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Production Operations|Production Operations]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval and Query Translation|Retrieval and Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Strategy and Advanced Patterns|Strategy and Advanced Patterns]]
<!-- whats-next:end -->
