---
publish: true
created: 2026-07-08T16:14:17.484+03:00
modified: 2026-07-08T16:14:17.484+03:00
published: 2026-07-08T16:14:17.484+03:00
topic:
  - AI & ML
subtopic:
  - LLM
level:
  - "2"
priority: High
status: Done
---

# Intro

End-to-end retrieval and generation metrics measure layer quality — whether the right chunks arrived and whether the answer is faithful — but they do not isolate which upstream component caused a failure. A drop in Recall@5 could come from bad chunking (evidence split across boundaries), weak embeddings (model misrepresents domain vocabulary), or poor ANN approximation (index too lossy). Component-level evaluation isolates each layer so fixes target the actual bottleneck.

The methodology is ablation: change one component while holding all others constant, then measure the retrieval metric delta. If the delta is within noise, that component is not the bottleneck. The metrics these ablations move — Recall@k, nDCG@10, Faithfulness — are defined in [[Evaluation Metrics]], and the labeled query sets, qrels, and token-span ground truth they consume come from [[Retrieval Evaluation Sets]].

## Chunking Evaluation

There is no standalone "chunking quality" metric in most RAG frameworks. Chunking is evaluated through its downstream impact on retrieval. Two approaches exist.

**Token-level IoU** measures how efficiently retrieved chunks cover the evidence a query actually needs. Build a set of `(query, gold_evidence_span)` pairs — either manually or by prompting an LLM to generate questions from corpus chunks along with the exact text span that answers each question. For each query, compute:

- **Token Recall** = `|gold ∩ retrieved| / |gold|` — did you retrieve the relevant tokens?
- **Token Precision** = `|gold ∩ retrieved| / |retrieved|` — how much noise came along?
- **Token IoU** = `|gold ∩ retrieved| / |gold ∪ retrieved|` — combined efficiency that penalizes both missed evidence and noise

Token IoU is more informative than end-to-end Recall@k because it captures chunk efficiency. A chunking strategy can achieve high retrieval recall by retrieving large, noisy chunks while wasting context window tokens on irrelevant content. In controlled experiments, the default OpenAI configuration (800 tokens, 400 overlap) achieved 87.9% token recall but only 1.4% token precision — nearly all retrieved tokens were noise. Semantic chunking at 400 tokens reached 91.3% recall with 4.5% precision, a 3× IoU improvement.

**Ablation via retrieval metrics** is the practical alternative when building token-level ground truth is too expensive. Run the same evaluation query set through the pipeline with different chunking strategies, holding the embedding model, vector index, and retriever constant. Use a fill-to-budget retrieval policy — retrieve chunks until a token budget is filled, in rank order — rather than fixed top-k, which biases the comparison toward smaller chunks. Measure Recall@k and Faithfulness across strategies. Two patterns emerge consistently across ablation studies: chunk overlap (10-20%) shows diminishing returns when sentence-preserving splitting is already in use because the splitter already handles boundary cases, and overlap primarily inflates index size without proportional quality gains. Additionally, answer quality tends to degrade when context exceeds a few thousand tokens — the generator's attention dilutes across too much material, regardless of how well chunked it is.

## Embedding Evaluation

Embedding models are evaluated by treating retrieval quality as a proxy for embedding quality. Cosine similarity scores alone do not tell you whether an embedding model is good for your domain — you need retrieval-based metrics against a labeled evaluation set.

**Building a domain-specific evaluation set.** Collect 50-100 representative queries the system will actually receive and manually identify 3-5 relevant passages per query from the actual corpus. Store these as qrels — a mapping of `query_id → doc_id → relevance_score`. This set is essential because general benchmarks (MTEB, BEIR) do not predict domain-specific performance. Domain-specific or fine-tuned embedding models routinely outperform generalist models by 10-30% nDCG@10 on specialized corpora, even when the generalist scores higher on MTEB leaderboards.

**Model comparison protocol.** Embed the same corpus with each candidate model, retrieve against the same query set using the same ANN index configuration (to isolate the embedding variable), and compute nDCG@10 per model. Evaluate at multiple k values — some models are more top-heavy (stronger at top-3 than top-10), which matters when only 3-5 chunks are passed to the generator. If nDCG@10 difference is less than 3%, choose the cheaper or faster model. If the gap exceeds 5%, the quality gain likely justifies the cost. Domain-specific fine-tuning is worth the engineering overhead when the generic model scores below 0.75 nDCG@10 on your domain set.

**Drift monitoring.** Track three signals as a nightly heartbeat job: **JS divergence** between baseline and current embedding cluster distributions (cluster embeddings into k bins, compare histograms — set alert thresholds empirically by measuring divergence during known-good and known-bad deployments), **nearest-neighbor overlap** on a golden query set (what fraction of top-k neighbors changed between deployments — significant drops indicate the embedding space has shifted), and **behavioral signals** (CTR drop on retrieved documents, query reformulation rate spike). Gate deployments on golden Recall@k. When switching embedding models, use shadow indexes to validate before cutover — build the new index in parallel, compare golden recall and JS divergence, then ramp traffic gradually.

## Vector Search (ANN) Evaluation

ANN Recall@k measures a different quantity than the retrieval Recall@k defined above. Retrieval Recall@k asks "of all relevant documents, how many appeared in top-k?" ANN Recall@k asks "of the true k nearest neighbors found by exact brute-force search, how many did the approximate index return?" It measures the index's approximation quality in isolation — see [[Retrieval]] for how index parameters (HNSW `ef_search`, IVF `nprobe`) and filtered search affect retrieval mechanics.

Ground truth is established by running brute-force (exact) search over the full corpus for every query in a test set. ANN results are then compared against these true neighbors. ANN Recall@10 = 0.85 means the approximate index returned 85% of the actual 10 closest vectors.

**Tuning protocol.** Sweep `ef_search` (HNSW) or `nprobe` (IVF) across a range, plot ANN recall vs p99 latency for each value, and pick the knee of the curve — the point where recall plateaus but latency continues rising. A practical HNSW starting point is M=16-32, ef\_construction=100-200, ef\_search=64-128. Re-tune when the corpus grows significantly — at fixed parameters, recall degrades silently as more vectors crowd the graph because the search path explores proportionally less of it. Latency remains constant, so only explicit ANN recall checks against brute-force ground truth on a scheduled query set will detect the regression.

**Filtered search evaluation** requires separate ground truth: brute-force over only the vectors that pass the metadata filter, then compare ANN filtered results against this restricted set. Post-filtering HNSW (run ANN first, then apply filter) degrades recall significantly under high selectivity because the graph becomes disconnected when most nodes are filtered out — the severity depends on the index configuration and selectivity ratio. Test at multiple selectivity levels (100%, 10%, 1%) to characterize the degradation curve for your workload. Some vector databases offer filtered indexes that maintain graph connectivity across filter boundaries, preserving recall under narrow filters at the cost of additional index storage.

**Production monitoring.** Run ANN recall checks on a golden query set daily or after major ingestion events. Track infrastructure proxy signals: rising `nprobe` requirements to maintain recall (indicates IVF centroid collapse), shard load skew ratio exceeding 3-5× (hot shard from semantic clustering), and embedding distribution shift via KL divergence on pairwise distance distributions.

## Questions

> [!QUESTION]- Why does ANN recall degrade silently as the corpus grows while latency stays flat?
>
> - At fixed `ef_search`/`nprobe`, the search explores a constant amount of work regardless of corpus size
> - As more vectors crowd the graph, that fixed search path covers a proportionally smaller fraction of it, so true neighbors are missed more often
> - Latency is driven by the search budget, not corpus size, so it stays constant and gives no signal that recall has dropped
> - Detection requires explicit ANN recall checks against brute-force ground truth on a scheduled query set — dashboards watching only latency will not catch it
> - Fix: re-tune `ef_search`/`nprobe` as the corpus grows, or move to a parameterization that scales the search budget with index size
> - Raising the search budget restores recall but increases p99 latency — pick the knee of the recall-vs-latency curve rather than maxing either

> [!QUESTION]- Why is token-level IoU more informative than Recall@k when comparing chunking strategies?
>
> - Recall@k only asks whether a relevant chunk appeared; it ignores how much irrelevant text rode along inside that chunk
> - A strategy can hit high Recall@k by returning large, noisy chunks that waste context-window tokens on irrelevant content
> - Token IoU scores the overlap between retrieved tokens and the gold evidence span, penalizing both missed evidence (recall) and noise (precision) in one number
> - Concrete gap: the default 800/400 OpenAI config reached 87.9% token recall but 1.4% token precision — Recall@k would call it a success while IoU exposes the waste
> - Use IoU when context budget or generator attention dilution matters; fall back to ablation via Recall@k and Faithfulness when building token-span ground truth is too expensive
> - IoU needs `(query, gold_span)` labels, which cost more to produce than binary relevance — invest only where chunk efficiency materially affects cost or answer quality

## References

- [Evaluating chunking strategies for retrieval -- token-level IoU methodology and benchmark (Chroma Research)](https://research.trychroma.com/evaluating-chunking)
- [A practical guide to selecting HNSW hyperparameters -- portfolio learning across 15 datasets (OpenSearch)](https://opensearch.org/blog/a-practical-guide-to-selecting-hnsw-hyperparameters/)
- [BEIR -- heterogeneous zero-shot retrieval benchmark across 18 datasets (NeurIPS 2021)](https://arxiv.org/abs/2104.08663)
