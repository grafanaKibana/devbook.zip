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
qard-deck: "AI & ML"
qard-topic: "LLM/Context Engineering/RAG/Evaluation/Evaluation Metrics"
flashcard_uid: "a6155222"
---

RAG evaluation needs separate views of retrieval and generation. Retrieval metrics test whether the right evidence arrived. Generation metrics test whether the answer used that evidence correctly. End-to-end outcomes then show whether the task was solved. Mixing the layers turns every regression into guesswork: a faithful answer over irrelevant documents needs a retrieval fix, while ignored evidence points at generation.

Retrieval and correctness metrics depend on relevance labels, reference evidence, or reference answers. Some generation diagnostics, including faithfulness and response relevancy, can instead compare the query, response, and retrieved context without a reference answer. [[Retrieval Evaluation Sets]] covers retrieval labels and builds on the broader [[Building an Evaluation Set]] process. A changed score still identifies a symptom, not the responsible component. [[Component-Level Evaluation]] provides the ablation method for that diagnosis.

A support bot can retrieve the correct policy and still misread its date constraint. Retrieval passed. Generation failed. More search tuning cannot repair that answer.

# Retrieval Metrics

Retrieval metrics evaluate whether the relevant documents reached the generator. All assume a labeled set where each query has known relevant documents. The full definitions, worked examples, and alerting guidance live in [[Monitoring#Retrieval Quality Metrics|Monitoring — Retrieval Quality Metrics]]. This table summarizes what each metric answers and when to prefer it.

| Metric | What it answers | When to prefer |
| --- | --- | --- |
| [[Monitoring#Retrieval Quality Metrics\|Recall@k]] | Were the relevant documents found | Primary metric -- always track |
| [[Monitoring#Retrieval Quality Metrics\|Precision@k]] | How much noise is in the context | Context window is tight or token cost matters |
| [[Monitoring#Retrieval Quality Metrics\|HitRate@k]] | Did at least one relevant doc appear | Quick minimum-bar check. Good for dashboards |
| [[Monitoring#Retrieval Quality Metrics\|MRR]] | Is the best result ranked first | Generator uses only top-1 or top-2 chunks |
| [[Monitoring#Retrieval Quality Metrics\|MAP]] | Are all relevant docs found and ranked high | Multiple relevant documents per query expected |
| [[Monitoring#Retrieval Quality Metrics\|nDCG@k]] | Is the full ranking quality good | Generator uses all k chunks with position-aware weighting |
| [[Monitoring#Deterministic Metrics\|Empty-result rate]] | Are there coverage gaps | Corpus is growing or query patterns are shifting |

Recall creates a hard ceiling because the generator cannot use evidence it never receives. Track [[Monitoring#Deterministic Metrics|empty-result rate]] separately as well. Aggregate recall can hide queries for which the index returns nothing.

# Generation Metrics

Generation metrics judge the answer against the query and retrieved context. Many use a separate [[LLM-as-a-Judge|LLM-as-judge]] model. [[Monitoring#LLM-as-Judge Metrics|Monitoring — LLM-as-Judge Metrics]] gives the full definitions. These dimensions cover different failure modes:

- **[[Monitoring#LLM-as-Judge Metrics|Faithfulness (groundedness)]]** — does every claim in the answer trace back to the provided context? The RAG-specific counterpart to hallucination detection — see [[Hallucinations]] for broader coverage.
- **[[Monitoring#LLM-as-Judge Metrics|Answer correctness]]** — does the answer actually solve the user's question? A response can be perfectly faithful yet still wrong if it misses the key constraint or answers a different question. Requires a reference answer.
- **[[Monitoring#LLM-as-Judge Metrics|Citation validity]]** — does each citation actually support the claim it is attached to? Stricter than faithfulness: an answer can be grounded overall while a specific citation points to an irrelevant passage.
- **[[Monitoring#LLM-as-Judge Metrics|Response completeness]]** — does the answer cover all aspects of the query? "Compare A and B" expects coverage of both. Partial answers score lower.

# RAGAS Framework

[RAGAS](https://docs.ragas.io/) turns these concepts into runnable scores, often through an [[LLM-as-a-Judge|LLM-as-judge]]. Each score targets a distinct retrieval or generation failure, though its exact implementation and model requirements depend on the RAGAS version.

| Metric | Layer | What it measures | Reference needed |
| --- | --- | --- | --- |
| **Faithfulness** | Generation | Are all claims in the response supported by retrieved context? Score = `supported_claims / total_claims` | No |
| **Response Relevancy** | Generation | Does the response address the user's question? Reverse-engineers questions from response, measures embedding similarity to original query | No |
| **Context Precision** | Retrieval | Are relevant chunks ranked higher than irrelevant ones? Signal-to-noise in the retrieved set | Variant-dependent: reference response, reference contexts, or another declared relevance signal |
| **Context Recall** | Retrieval | Did retrieval capture all evidence needed to answer? Score = `reference_claims_in_context / total_reference_claims` | Always |

Faithfulness and Response Relevancy can run without a reference answer. Context Recall requires reference evidence. Current RAGAS releases expose several Context Precision variants whose required columns differ: some compare retrieved contexts with a reference response, while others use reference contexts or a non-LLM relevance signal. The exact class names and inputs are versioned API details, so the evaluation record must name the variant rather than reporting an unqualified "Context Precision" score.

## Diagnostic Combinations

Individual scores identify symptoms. Interpret combinations as hypotheses only after checking reference quality, captured context, metric configuration, and representative samples. Scores alone do not establish a component's root cause.

| Faithfulness | Context Recall | Observation / hypothesis | Investigation |
| --- | --- | --- | --- |
| High | Low | Answer claims are largely supported by retrieved context, but reference coverage is low | Inspect missing evidence, metadata filters, candidate cutoff, and retrieval fit |
| Low | High | Unsupported answer claims despite high reference coverage in the measured context | Inspect assembled model input, generation behavior, and evaluator judgments |
| Low | Low | Unsupported answer claims and low reference coverage | Validate both measurements, then investigate missing evidence and generation separately |

| Context Precision | Context Recall | Observation / hypothesis | Investigation |
| --- | --- | --- | --- |
| Low | High | Relevant chunks tend to rank below irrelevant chunks while reference coverage is high | Inspect ranking, metadata filters, and final context selection |
| High | Low | Relevant chunks tend to rank above irrelevant chunks while reference coverage is low | Inspect missing evidence, candidate cutoff, [[Home/AI & ML/LLM/Context Engineering/RAG/Retrieval#Hybrid Retrieval — Vector + Keyword\|hybrid search]], and chunk boundaries |

## Additional RAGAS Metrics

Two additional diagnostics cover failure modes that the four core rows above do not:

- **[[Monitoring#LLM-as-Judge Metrics|Noise Sensitivity]]** — measures incorrect claims introduced when retrieved context contains irrelevant chunks. Catches a gap the original four miss: the model hallucinating claims consistent with noisy context rather than ground truth. Requires reference. Lower is better.
- **[[Monitoring#LLM-as-Judge Metrics|Context Entities Recall]]** — compares named entities in the reference answer against entities in retrieved context. Useful for entity-heavy domains (legal, medical, financial) where missing a specific name, date, or identifier is a hard failure even when general topic recall is adequate.

# Tradeoffs

No scoring method gives high semantic coverage, low cost, and stable calibration at once. The mix depends on available ground truth and the consequence of a false pass.

| Approach | Coverage | Cost | Latency | Reliability |
| --- | --- | --- | --- | --- |
| Human evaluation | Highest -- catches nuance and edge cases | Highest -- annotator time per query | Slow -- days to weeks per batch | Gold standard but low throughput |
| LLM-as-judge | High -- handles open-ended semantics | Medium -- API cost per scored response | Fast -- seconds per judgment | Subject to bias and prompt sensitivity |
| Deterministic checks | Low -- only exact match and format rules | Lowest -- no model calls | Instant | Reproducible, but only as valid as the encoded specification |
| Reference-free metrics | Medium -- no ground truth needed | Medium -- model calls for scoring | Fast | Lower precision -- cannot catch factual errors without reference |
| End-to-end user metrics | Highest signal -- measures real impact | Low direct cost -- piggybacks on production | Delayed -- needs traffic volume | Noisy -- confounded by UI and user behavior |

Use deterministic checks as fast release gates and an LLM judge for semantic failures. Human labels calibrate both and cover costly edge cases. Production outcomes validate the system, but they are too delayed and confounded to serve as the only evaluation.

# Pitfalls

## Aggregate Metrics Mask Segment Regressions

A change can improve average Recall@5 by 2% while dropping 15% for one tenant's query cluster. The average passes and the tenant sees a regression. Query types and document sources do not share one retrieval distribution.

Slice by the dimensions that can change the retrieval problem, such as tenant, language, query cluster, or document source. A material segment regression remains a regression even when the global average rises.

## LLM-as-Judge Bias in Generation Metrics

LLM judges exhibit positional bias (scoring the first response higher in pairwise comparisons), verbosity bias (rewarding longer answers regardless of correctness), and self-preference bias (scoring outputs from the same model family higher). For RAG specifically, judges are also sensitive to evaluation prompt wording: small changes to the prompt that asks whether an answer is faithful can shift scores across the entire eval set.

Binary judgments often calibrate more reliably than broad numeric scales. Check prompt sensitivity, compare outputs with a small human-labeled set, and track agreement over time. [[LLM-as-a-Judge]] covers the reliability mechanics in more depth.

# Questions

> [!qard]- Why can aggregate retrieval metrics hide regressions, and when is a segment drop actionable?
> An aggregate can improve while a tenant, language, or query class regresses because large groups dominate the average. Segment metrics expose that tradeoff, but small samples can make apparent changes noisy. Compare segments with enough representative labels, estimate uncertainty, and apply thresholds chosen for the product's risk; investigate a material, credible regression rather than treating every raw drop as a failure. [Subgroup evaluation guidance](https://tensorflow.github.io/fairness-indicators/guide/guidance/)

> [!qard]- What do high Faithfulness and low Context Recall suggest, and what should be checked first?
> Faithfulness asks whether answer claims are supported by the supplied context; Context Recall asks whether the context covers the reference answer's claims. A high Faithfulness score with low Context Recall suggests that the answer uses limited evidence consistently while required evidence may be missing. First verify the reference labels, captured context and metric configuration; if those are sound, inspect retrieval, filters and context assembly before changing generation. Neither score alone proves the cause. [Context Recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/) · [Faithfulness](https://docs.ragas.io/en/v0.2.5/concepts/metrics/available_metrics/faithfulness/)

# References

- [RAGAS -- automated evaluation of RAG pipelines (EACL 2024)](https://arxiv.org/abs/2309.15217)
- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena -- positional and verbosity bias (NeurIPS 2023)](https://arxiv.org/abs/2306.05685)
