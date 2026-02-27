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

Query translation rewrites one user question into retrieval-friendly variants before search. It is useful when user phrasing is ambiguous, underspecified, or multi-hop. The goal is higher evidence recall without overwhelming retrieval with off-topic expansions.

Example: "Can partner customers burst above limits now?" can be translated into policy wording, release-note wording, and quota-comparison wording to retrieve stronger evidence.

## Multi-Query

How it works:

- Generate several paraphrases of the same intent.
- Retrieve per paraphrase.
- Fuse and deduplicate results.

Where it fits:

- Paraphrase-heavy user traffic.

Main risk:

- Query drift that introduces unrelated concepts.

## RAG-Fusion

How it works:

- Multi-query retrieval + rank fusion (commonly RRF).
- Reward documents that appear consistently across query variants.

Where it fits:

- Broad questions where one phrasing is usually insufficient.

Main risk:

- Added latency and cost from multiple retrieval calls.

## Decomposition

How it works:

- Split complex question into focused sub-questions.
- Retrieve evidence per sub-question.
- Synthesize final answer from combined evidence.

Where it fits:

- Multi-hop tasks with multiple entities and constraints.

Main risk:

- Fragmentation that loses global context.

## Step-Back Prompting

How it works:

- Generate a higher-level abstraction query.
- Retrieve background context plus specific-query context.
- Use both to answer original question.

Where it fits:

- Questions that need first-principles context before specifics.

Main risk:

- Overly abstract retrieval that misses actionable details.

## HyDE

How it works:

- LLM creates a hypothetical answer/document.
- Embed that synthetic text.
- Retrieve nearest real documents in vector space.

Where it fits:

- Very short or vague user queries.

Main risk:

- Synthetic content can bias retrieval toward wrong neighborhoods.

## Operational Guardrails

- Bound expansion budget (for many systems, 2-5 translated queries is a practical baseline).
- Preserve strict constraints (IDs, product names, versions, dates) in translated queries.
- Evaluate translation methods against single-query baseline using recall, precision, and latency deltas.

## Questions

> [!QUESTION]- Why does query translation often improve recall but sometimes hurt precision?
> Additional query variants increase coverage, but weak variants can pull related yet irrelevant documents. Precision drops unless fusion and reranking suppress noisy candidates.

> [!QUESTION]- When is decomposition a better choice than plain multi-query?
> Decomposition is better when the original query contains distinct sub-problems that need separate evidence retrieval and structured synthesis.

## References

- [RAG-Fusion: a New Take on Retrieval-Augmented Generation](https://arxiv.org/abs/2402.03367)
- [Take a Step Back: Evoking Reasoning via Abstraction in Large Language Models](https://arxiv.org/abs/2310.06117)
- [Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)](https://aclanthology.org/2023.acl-long.99/)
- [MultiQueryRetriever (LangChain docs)](https://python.langchain.com/docs/how_to/MultiQueryRetriever/)
- [Deconstructing RAG (LangChain engineering)](https://blog.langchain.com/deconstructing-rag/)

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
> - [[Software Engineering/11 AI & ML/LLM/RAG/Embeddings|Embeddings]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Generation|Generation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Grounding|Grounding]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring|Monitoring]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/RAG vs Fine-Tuning|RAG vs Fine-Tuning]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]]
<!-- whats-next:end -->
