---
tags:
  - FolderNote
status: Creation
priority: High
level:
  - "2"
---

# Intro

Retrieval-Augmented Generation (RAG) combines retrieval and generation: retrieve evidence from your corpus, then generate an answer grounded in that evidence. It matters because knowledge changes faster than model weights, and RAG lets you update knowledge without retraining the model.
In practice, strong RAG systems are pipelines, not prompts. The main engineering work is query processing, retrieval quality, context assembly, evaluation, and production operations.
Example: for a support assistant, a user asks "What changed in API v2 rate limits?". RAG retrieves release notes and policy docs first, then the model answers with citations to the exact source sections instead of guessing from stale parametric memory.

## Core Flow

```mermaid
flowchart LR
    Q[User Query] --> T[Query Translation]
    T --> R[Retrieval and Fusion]
    R --> RR[Optional Reranking]
    RR --> C[Context Assembly]
    C --> G[LLM Generation]
    G --> V[Groundedness and Citation Checks]
```

## Detailed Pages

- [[11 AI & ML/LLM/RAG/Chunking and Embeddings|Chunking and Embeddings]] - chunk boundaries, overlap, embedding model selection, vector dimensions.
- [[11 AI & ML/LLM/RAG/Retrieval and Query Translation|Retrieval and Query Translation]] - dense/sparse/hybrid retrieval, Multi-Query, RAG-Fusion, Decomposition, Step-Back, HyDE.
- [[11 AI & ML/LLM/RAG/Grounding and Generation|Grounding and Generation]] - prompt construction, citation forcing, abstention, hallucination control.
- [[11 AI & ML/LLM/RAG/Evaluation|Evaluation]] - retrieval and generation metrics, offline/online eval loop, regression checks.
- [[11 AI & ML/LLM/RAG/Production Operations|Production Operations]] - caching layers, monitoring, alerting, drift detection.
- [[11 AI & ML/LLM/RAG/Strategy and Advanced Patterns|Strategy and Advanced Patterns]] - RAG vs fine-tuning and advanced architectures.


## References

- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)
- [RAG techniques (Azure AI Search)](https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview)
- [RAGOps: Operating and Managing RAG Pipelines](https://arxiv.org/abs/2506.03401)

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
> - [[Software Engineering/11 AI & ML/LLM/RAG/Strategy and Advanced Patterns|Strategy and Advanced Patterns]]
<!-- whats-next:end -->
