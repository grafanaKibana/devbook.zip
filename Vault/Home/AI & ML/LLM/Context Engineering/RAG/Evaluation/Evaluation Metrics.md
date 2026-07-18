---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Retrieval, generation, and end-to-end metrics each answer a different question, making regressions diagnosable."
level:
  - "2"
priority: High
status: Done
publish: true
---

Three metric layers answer three different questions. Retrieval metrics ask whether the right evidence reached the generator; generation metrics ask whether the output is faithful to that evidence and actually answers the question; end-to-end metrics ask whether the user's task got solved. The separation is what makes a regression diagnosable — a pipeline can have perfect retrieval but poor generation (the model ignores its context), or perfect generation but poor retrieval (the model faithfully summarizes irrelevant documents), and the fix is different in each case.

All of these metrics assume a labeled set — see [[Retrieval Evaluation Sets]] for how to label one for retrieval, which builds on the general [[Building an Evaluation Set]] technique. When a metric moves, the metric alone does not tell you which upstream stage caused it; [[Component-Level Evaluation]] isolates chunking, embedding, and index effects.

Example: a support bot returns the correct policy document (retrieval passes) but the model misreads a date constraint and answers with the wrong deadline (generation fails). Without layer separation, the team would chase retrieval improvements that cannot fix a generation problem.

# Retrieval Metrics

Retrieval metrics evaluate whether the relevant documents reached the generator. All assume a labeled set where each query has known relevant documents. The full definitions, worked examples, and alerting guidance live in [[Monitoring#Retrieval Quality Metrics|Monitoring — Retrieval Quality Metrics]]; this table summarizes what each metric answers and when to prefer it.

| Metric | What it answers | When to prefer |
| --- | --- | --- |
| [[Monitoring#Retrieval Quality Metrics\|Recall@k]] | Did we find the relevant documents | Primary metric -- always track |
| [[Monitoring#Retrieval Quality Metrics\|Precision@k]] | How much noise is in the context | Context window is tight or token cost matters |
| [[Monitoring#Retrieval Quality Metrics\|HitRate@k]] | Did at least one relevant doc appear | Quick minimum-bar check; good for dashboards |
| [[Monitoring#Retrieval Quality Metrics\|MRR]] | Is the best result ranked first | Generator uses only top-1 or top-2 chunks |
| [[Monitoring#Retrieval Quality Metrics\|MAP]] | Are all relevant docs found and ranked high | Multiple relevant documents per query expected |
| [[Monitoring#Retrieval Quality Metrics\|nDCG@k]] | Is the full ranking quality good | Generator uses all k chunks with position-aware weighting |
| [[Monitoring#Deterministic Metrics\|Empty-result rate]] | Are there coverage gaps | Corpus is growing or query patterns are shifting |

Two evaluation-side facts matter beyond the definitions. First, a recall failure is a hard ceiling on answer quality — the generator cannot use evidence it never sees, so no generation-side fix compensates for missing context. Second, track [[Monitoring#Deterministic Metrics|empty-result rate]] separately: even a small rate signals coverage gaps in the index, and aggregate recall hides it.

# Generation Metrics

Generation metrics evaluate the quality of the model's output given the retrieved context. Most are computed using an [[LLM-as-a-Judge|LLM-as-judge]] pattern — a separate model scores the output against the context and query. Full definitions live in [[Monitoring#LLM-as-Judge Metrics|Monitoring — LLM-as-Judge Metrics]]; the four core dimensions:

- **[[Monitoring#LLM-as-Judge Metrics|Faithfulness (groundedness)]]** — does every claim in the answer trace back to the provided context? The RAG-specific counterpart to hallucination detection — see [[Hallucinations]] for broader coverage.
- **[[Monitoring#LLM-as-Judge Metrics|Answer correctness]]** — does the answer actually solve the user's question? A response can be perfectly faithful yet still wrong if it misses the key constraint or answers a different question. Requires a reference answer.
- **[[Monitoring#LLM-as-Judge Metrics|Citation validity]]** — does each citation actually support the claim it is attached to? Stricter than faithfulness: an answer can be grounded overall while a specific citation points to an irrelevant passage.
- **[[Monitoring#LLM-as-Judge Metrics|Response completeness]]** — does the answer cover all aspects of the query? "Compare A and B" expects coverage of both; partial answers score lower.

# RAGAS Framework

[RAGAS](https://docs.ragas.io/) (Retrieval-Augmented Generation Assessment) implements the retrieval and generation concepts above as four named, runnable scores. Each uses [[LLM-as-a-Judge|LLM-as-judge]] evaluation and isolates a specific failure mode in the pipeline.

| Metric | Layer | What it measures | Reference needed |
| --- | --- | --- | --- |
| **Faithfulness** | Generation | Are all claims in the response supported by retrieved context? Score = `supported_claims / total_claims` | No |
| **Response Relevancy** | Generation | Does the response address the user's question? Reverse-engineers questions from response, measures embedding similarity to original query | No |
| **Context Precision** | Retrieval | Are relevant chunks ranked higher than irrelevant ones? Signal-to-noise in the retrieved set | Yes -- or use reference-free `ContextUtilization` variant |
| **Context Recall** | Retrieval | Did retrieval capture all evidence needed to answer? Score = `reference_claims_in_context / total_reference_claims` | Always |

Faithfulness and Response Relevancy are fully reference-free — they run without labeled ground truth. Context Recall always requires a reference answer. Context Precision has both a reference-required variant and a reference-free variant (`ContextUtilization`) that uses the generated response as a relevance proxy. Bootstrapping evaluation without a labeled set is possible with Faithfulness + Response Relevancy + ContextUtilization, but Context Recall — the retrieval ceiling metric — requires investing in a golden set.

## Diagnostic Combinations

Individual scores identify symptoms. Reading two scores together identifies root causes — this is the primary diagnostic value of the framework.

| Faithfulness | Context Recall | Diagnosis | Fix |
| --- | --- | --- | --- |
| High | Low | Retrieval ceiling — model uses what it gets correctly, but evidence is missing | Hybrid retrieval, expand k, fix metadata filters, improve embeddings |
| Low | High | Generation problem — right evidence arrives but model confabulates | Prompt constraints, grounding instructions, output validation |
| Low | Low | Systemic — retrieval broken and generation unreliable | Fix retrieval first as the upstream bottleneck, then generation |

| Context Precision | Context Recall | Diagnosis | Fix |
| --- | --- | --- | --- |
| Low | High | Noise — retrieval finds relevant docs but drowns them in irrelevant chunks | Re-ranking, tighter metadata filters, reduce k |
| High | Low | Incomplete — retrieved set is clean but missing relevant evidence | Expand k, add [[Home/AI & ML/LLM/Context Engineering/RAG/Retrieval#Hybrid Retrieval — Vector + Keyword\|hybrid search]], improve chunk boundaries |

## Additional RAGAS Metrics

RAGAS v0.4+ adds two metrics beyond the original four:

- **[[Monitoring#LLM-as-Judge Metrics|Noise Sensitivity]]** — measures incorrect claims introduced when retrieved context contains irrelevant chunks. Catches a gap the original four miss: the model hallucinating claims consistent with noisy context rather than ground truth. Requires reference. Lower is better.
- **[[Monitoring#LLM-as-Judge Metrics|Context Entities Recall]]** — compares named entities in the reference answer against entities in retrieved context. Useful for entity-heavy domains (legal, medical, financial) where missing a specific name, date, or identifier is a hard failure even when general topic recall is adequate.

# Tradeoffs

Scoring methods trade coverage against cost and reliability. The right mix depends on how much ground truth you have and how much semantic nuance the metric must catch.

| Approach | Coverage | Cost | Latency | Reliability |
| --- | --- | --- | --- | --- |
| Human evaluation | Highest -- catches nuance and edge cases | Highest -- annotator time per query | Slow -- days to weeks per batch | Gold standard but low throughput |
| LLM-as-judge | High -- handles open-ended semantics | Medium -- API cost per scored response | Fast -- seconds per judgment | Subject to bias and prompt sensitivity |
| Deterministic checks | Low -- only exact match and format rules | Lowest -- no model calls | Instant | Perfect reliability but misses semantic quality |
| Reference-free metrics | Medium -- no ground truth needed | Medium -- model calls for scoring | Fast | Lower precision -- cannot catch factual errors without reference |
| End-to-end user metrics | Highest signal -- measures real impact | Low direct cost -- piggybacks on production | Delayed -- needs traffic volume | Noisy -- confounded by UI and user behavior |

Decision rule: combine deterministic checks (format, citation presence, length) as fast gates, LLM-as-judge for semantic quality (faithfulness, correctness), and human evaluation for calibration and edge-case discovery. Use end-to-end user metrics as the ultimate validation but never as the only evaluation.

# Pitfalls

## Aggregate Metrics Mask Segment Regressions

A pipeline change improves average Recall@5 by 2% but degrades recall by 15% on a specific tenant's query cluster. The aggregate looks great, the tenant files a support ticket. This happens because RAG workloads are heterogeneous — different query types, document formats, and languages have different retrieval characteristics.

Detection: always slice metrics by meaningful segments — tenant, language, query cluster, document source type. If any segment degrades beyond the threshold, treat it as a regression even if the aggregate improves.

## LLM-as-Judge Bias in Generation Metrics

LLM judges exhibit positional bias (scoring the first response higher in pairwise comparisons), verbosity bias (rewarding longer answers regardless of correctness), and self-preference bias (scoring outputs from the same model family higher). For RAG specifically, judges are also sensitive to evaluation prompt wording — small changes in how you ask "is this answer faithful" can shift scores across the entire eval set.

Mitigation: use binary pass/fail judgments instead of numeric scales (reduces calibration noise). Run the same evaluation with varied prompt phrasings and check consistency. Validate judge outputs against a small human-labeled set and track agreement rate over time. See [[LLM-as-a-Judge]] for deeper coverage of judge reliability.

# Questions

> [!QUESTION]- Why can aggregate retrieval metrics improve while individual user segments degrade?
> - Aggregate metrics average across query types and tenants, masking localized regressions
> - A pipeline change improving average Recall@5 can simultaneously degrade recall by double digits on a specific tenant's query cluster
> - RAG workloads are heterogeneous — different query types, document formats, and languages have different retrieval characteristics
> - The fix is segment-level evaluation: slice by tenant, language, query cluster, and document source type
> - Flag any segment that degrades beyond the threshold, even when the aggregate improves
> - Per-segment evaluation does cost more to maintain (more ground-truth labels, more compute per release), but it catches the most common RAG evaluation failure in production — choose granularity based on how heterogeneous your query population is

> [!QUESTION]- Given high Faithfulness (0.91) and low Context Recall (0.54), which pipeline layer do you fix first and why?
> - High faithfulness means the model correctly uses the context it receives — generation is not the problem
> - Low context recall means retrieval misses roughly half the necessary evidence — the retrieval layer is the bottleneck
> - Retrieval quality is a hard ceiling on answer quality: the generator cannot use evidence it never sees
> - Fix retrieval first: add hybrid search (BM25 + dense), expand k, review metadata filters, check embedding domain fit
> - Do not touch prompts or generation settings until recall improves — optimizing generation against incomplete evidence is wasted effort
> - After retrieval fix, re-measure both: if faithfulness drops as recall improves, the additional context is confusing the model — add re-ranking or improve prompt grounding
> - Improving recall often decreases precision (more chunks = more noise), so pair recall improvements with re-ranking to maintain context quality

# References

- [RAGAS metrics reference -- faithfulness, context precision, answer correctness (RAGAS docs)](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/)
- [RAG evaluators -- groundedness, relevance, completeness (Azure AI Foundry)](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/evaluation-evaluators/rag-evaluators)
- [RAGAS -- automated evaluation of RAG pipelines (EACL 2024)](https://arxiv.org/abs/2309.15217)
- [Creating a LLM-as-a-judge that drives business results (Hamel Husain)](https://hamel.dev/blog/posts/llm-judge/)
- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena -- positional and verbosity bias (NeurIPS 2023)](https://arxiv.org/abs/2306.05685)
