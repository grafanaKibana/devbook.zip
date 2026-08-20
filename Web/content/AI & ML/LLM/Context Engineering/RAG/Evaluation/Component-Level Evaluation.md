---
publish: true
created: 2026-08-20T20:41:15.480Z
modified: 2026-08-20T20:41:15.480Z
published: 2026-08-20T20:41:15.480Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Ablation varies one component at a time to isolate what caused a retrieval-metric change.
level:
  - "2"
priority: High
status: Done
---

End-to-end metrics show that a RAG pipeline regressed. They rarely show why. A lower Recall@5 could come from split evidence, an embedding model that mishandles domain vocabulary, or an ANN index that approximates too aggressively. Component-level evaluation holds most of the pipeline still and moves one part at a time.

That experiment is an ablation. Change one component, keep the rest fixed, and compare the metric delta with run-to-run noise. A component that does not move the result is unlikely to be the current bottleneck. [[Evaluation Metrics]] defines the measured outcomes, while [[Retrieval Evaluation Sets]] covers the labels those measurements consume.

# How to Evaluate Chunking

Most RAG frameworks have no standalone "chunking quality" score. Chunking is judged by what it does to retrieval, using either token-span labels or a controlled pipeline comparison.

**Token-level IoU** measures how tightly retrieved chunks cover the evidence a query needs. It requires `(query, gold_evidence_span)` pairs, built manually or generated and then checked. For each query, compute:

- **Token Recall** = `|gold ∩ retrieved| / |gold|` — were the relevant tokens retrieved?
- **Token Precision** = `|gold ∩ retrieved| / |retrieved|` — how much noise came along?
- **Token IoU** = `|gold ∩ retrieved| / |gold ∪ retrieved|` — combined efficiency that penalizes both missed evidence and noise

Token IoU exposes a weakness that Recall@k misses: a large chunk can count as a retrieval hit while most of its tokens are irrelevant. In Chroma's controlled experiment, an 800-token chunk with 400-token overlap reached 87.9% token recall and only 1.4% precision. A 400-token semantic strategy reached 91.3% recall with 4.5% precision. The comparison is specific to that corpus, but the measurement problem is general.

**Ablation via retrieval metrics** is cheaper when token-span labels are unavailable. Run the same queries through each chunking strategy while keeping the embedding model, index, and retriever fixed. Fill a fixed token budget in rank order instead of retrieving a fixed number of chunks. Fixed top-k confounds chunk size with retrieved context and generally gives larger chunks a larger token budget. Compare retrieval recall and answer faithfulness. Overlap often gives diminishing returns once the splitter already preserves sentence boundaries, while excessive context can lower answer quality by burying evidence in noise.

# How to Compare Embedding Models

An embedding model is useful when it ranks relevant corpus passages well. Raw cosine scores do not establish that. Only retrieval metrics against labeled queries do.

**Build a domain set.** Collect representative queries and label relevant passages from the real corpus as qrels: `query_id → doc_id → relevance_score`. Start small enough to review carefully, then add cases from production failures. General benchmarks such as MTEB and BEIR help with screening, but they do not predict performance on internal terminology.

**Compare one variable.** Embed the same corpus with each candidate and use exact search when the goal is to isolate embedding quality. If the corpus requires ANN, tune each index and verify matched ANN recall against exact search before comparing retrieval metrics; identical ANN settings can favor one embedding space over another. Measure nDCG at the cutoffs the generator actually consumes because two models can have similar top-10 quality and very different top-3 quality. Small metric gaps should be weighed against latency and cost. There is no portable percentage threshold that decides the tradeoff for every corpus.

**Watch for drift.** Golden-query neighbor overlap catches ranking changes directly. Distribution measures such as JS divergence can show that the embedding space moved, while click-through and query reformulation provide slower behavioral evidence. Set thresholds from known-good and known-bad deployments. Before changing models, build a shadow index and compare its recall before moving traffic.

# How to Isolate ANN Loss

ANN Recall@k is not retrieval Recall@k. Retrieval recall compares results with relevance labels. ANN recall compares an approximate index with exact nearest-neighbor search over the same vectors. The latter isolates index loss. [[Retrieval]] covers the parameters that control it.

Ground truth is established by running brute-force (exact) search over the full corpus for every query in a test set. ANN results are then compared against these true neighbors. ANN Recall@10 = 0.85 means the approximate index returned 85% of the actual 10 closest vectors.

**Tune against exact search.** Sweep `ef_search` for HNSW or `nprobe` for IVF and plot ANN recall against p99 latency. The useful operating point is where extra search work stops buying material recall. Re-run the sweep as the corpus and data distribution change. A fixed setting can leave the old recall/latency operating point behind, but the direction and size of each change depend on the index family, partition or graph shape, and workload. Fixed `nprobe`, for example, visits the same number of IVF lists while the number of vectors inside those lists can grow.

**Filtered search evaluation** requires separate ground truth: brute-force over only the vectors that pass the metadata filter, then compare ANN filtered results against this restricted set. Post-filtering HNSW (run ANN first, then apply filter) can lose recall under high selectivity because most candidates are removed after the graph search. Test several selectivity levels, such as 100%, 10%, and 1%, to measure the workload's degradation curve. Some vector databases maintain filtered indexes that preserve graph connectivity at the cost of more storage.

**Production monitoring.** Run exact-versus-approximate recall checks on a golden query set after major ingestion events and on a schedule that fits the index's change rate. Proxy signals help explain a regression but do not replace that comparison:

- rising `nprobe` requirements to hold recall can indicate degraded IVF partition quality.
- shard load skew exposes hot partitions caused by semantically clustered traffic or data.
- KL divergence over pairwise-distance distributions exposes embedding-space movement.

# References

- [Evaluating chunking strategies for retrieval -- token-level IoU methodology and benchmark (Chroma Research)](https://research.trychroma.com/evaluating-chunking)
- [A practical guide to selecting HNSW hyperparameters -- portfolio learning across 15 datasets (OpenSearch)](https://opensearch.org/blog/a-practical-guide-to-selecting-hnsw-hyperparameters/)
