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

Advanced RAG patterns address failure modes that basic retrieve-then-generate pipelines cannot handle well, such as multi-hop reasoning, uncertain retrieval quality, and cross-modal evidence synthesis. They improve robustness but add complexity, latency, and operational overhead.

Example: a compliance assistant needs connected evidence across policy docs, release notes, and incident timelines. Basic single-pass retrieval can miss relationships that graph-based or iterative patterns recover.

## Patterns

### Iterative Retrieval

- Loop: retrieve -> reason -> retrieve follow-up evidence.
- Useful for multi-step questions where second-hop evidence depends on first-hop findings.

### Self-RAG

- Model emits self-reflection signals about whether retrieval is sufficient.
- Can trigger additional retrieval or answer revision.

### CRAG

- Add retrieval-quality evaluator before generation.
- If retrieval quality is low, route to corrective retrieval path.

### Graph RAG

- Retrieve over entity and relation graph instead of flat chunk similarity only.
- Useful for connected-fact and dependency-heavy tasks.

### Multimodal RAG

- Retrieve across text, tables, images, or audio.
- Requires modality-aware chunking, embeddings, and evidence alignment.

## Tradeoffs

- Better robustness on hard queries.
- Higher latency and orchestration complexity.
- More moving parts to test and monitor.

Adopt incrementally after baseline RAG metrics plateau.

## Questions

> [!QUESTION]- Why should advanced patterns be introduced incrementally instead of all at once?
> **Expected answer:** Each pattern adds independent failure modes and observability needs. Incremental rollout isolates impact and prevents compounding complexity from masking root causes.

> [!QUESTION]- When is Graph RAG a better fit than plain vector retrieval?
> **Expected answer:** Graph RAG is better when answers require explicit entity relations, dependency paths, or multi-hop joins that are hard to recover from independent text chunks.

## References

- [Self-RAG: Learning to Retrieve, Generate, and Critique Through Self-Reflection](https://arxiv.org/abs/2310.11511)
- [Corrective Retrieval Augmented Generation (CRAG)](https://arxiv.org/abs/2401.15884)
- [RAGOps: Operating and Managing RAG Pipelines](https://arxiv.org/abs/2506.03401)
- [Building a production RAG app (LangChain engineering)](https://blog.langchain.com/agentic-rag-with-langgraph/)

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
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]]
<!-- whats-next:end -->
