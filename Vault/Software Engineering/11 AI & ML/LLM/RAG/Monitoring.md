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

Monitoring keeps RAG reliable after launch. Offline benchmarks are necessary, but production traffic shifts quickly and exposes failure modes that static test sets miss. Effective monitoring tracks retrieval quality, answer groundedness, latency, cost, and data freshness together.

Example: aggregate faithfulness looks stable, but one tenant's new query cluster has low retrieval recall because a new document type was never indexed correctly.

## Metric Groups

### Retrieval Quality

- Recall@k, nDCG@k, empty-result rate.
- Segment by tenant, language, and query cluster.

### Generation and Grounding

- Faithfulness or groundedness score.
- Citation validity rate.
- Abstention rate and abstention correctness.

### Performance and Cost

- Per-stage latency (query translation, retrieval, rerank, generation).
- Token usage and cost per successful answer.
- Cache hit rates per cache layer.

### Data Health

- Index freshness lag.
- Document age distribution.
- Ingestion failure rate.

## Alerting Baseline

- Alert on sustained retrieval recall regressions vs baseline.
- Alert on groundedness degradation in high-risk segments.
- Alert on p95 latency budget breaches.

Thresholds should be calibrated to your workload and error budget.

## Questions

> [!QUESTION]- Why should monitoring dashboards be segmented, not only global?
> Global aggregates hide localized regressions. Segmenting by tenant, domain, or query cluster reveals failures that impact real users but disappear in overall averages.

> [!QUESTION]- Why can latency-only SLO tracking be misleading for RAG?
> A system can meet latency targets while serving lower-quality or ungrounded answers. Monitoring must pair speed with quality and grounding metrics.

## References

- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [RAGAS metrics reference](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/)
- [Embedding drift detection methods (Evidently AI)](https://www.evidentlyai.com/blog/embedding-drift-detection)

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
> - [[Software Engineering/11 AI & ML/LLM/RAG/Query Translation|Query Translation]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/RAG vs Fine-Tuning|RAG vs Fine-Tuning]]
> - [[Software Engineering/11 AI & ML/LLM/RAG/Retrieval|Retrieval]]
<!-- whats-next:end -->
