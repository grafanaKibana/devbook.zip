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

RAG evaluation is two systems plus one product outcome: retrieval quality, generation quality, and end-to-end usefulness. Without this split, teams see "quality dropped" but cannot identify whether chunking, retrieval, prompt assembly, or model behavior caused it.

## Retrieval and Generation Metrics

- **Retrieval**: Recall@k, Precision@k, MRR, nDCG, empty-result rate.
- **Generation**: faithfulness/groundedness, answer correctness, citation validity.
- **Product**: user feedback, follow-up rate, task completion.

Use baselines and regression deltas instead of universal thresholds.

## Evaluation Loop

1. Build a labeled eval set (query + relevant evidence + expected answer behavior).
2. Run offline evals before rollout.
3. Run online sampled checks in production.
4. Keep a must-pass regression set for pipeline changes.

## Example

```text
Release gate example:
- Recall@5 must not regress more than 3% from baseline.
- Faithfulness score must not regress more than 2% from baseline.
- p95 latency must stay within agreed SLO budget.
```

## Questions

> [!QUESTION]- Why can aggregate quality stay flat while users still report failures?
> **Expected answer:** Aggregate metrics can hide segment-specific regressions. Query-cluster or tenant-level slicing may reveal low-recall or low-faithfulness pockets masked by overall averages.

> [!QUESTION]- What is the practical difference between faithfulness and answer correctness?
> **Expected answer:** Faithfulness checks whether claims are supported by provided context. Correctness checks whether the final answer solves the user problem. A response can be faithful but incomplete or unhelpful.

## References

- [RAGAS metrics reference](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/)
- [BEIR benchmark](https://arxiv.org/abs/2104.08663)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [RAG evaluation starter guide (Arize)](https://arize.com/blog-course/rag-evaluation/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/RAG/Chunking and Embeddings|Chunking and Embeddings]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Grounding and Generation|Grounding and Generation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Production Operations|Production Operations]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval and Query Translation|Retrieval and Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Strategy and Advanced Patterns|Strategy and Advanced Patterns]]
<!-- whats-next:end -->
