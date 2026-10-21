---
publish: true
created: 2026-10-21T13:29:32.421Z
modified: 2026-10-21T13:29:32.421Z
published: 2026-10-21T13:29:32.421Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Retrieval, generation, and end-to-end metrics each answer a different question, making regressions diagnosable.
level:
  - "2"
priority: High
status: Done
qard-deck: AI & ML
qard-topic: LLM/Context Engineering/RAG/Evaluation/Evaluation Metrics
flashcard_uid: a6155222
---

RAG evaluation needs separate views of retrieval and generation. Retrieval metrics test whether the right evidence arrived. Generation metrics test whether the answer used that evidence correctly. End-to-end outcomes then show whether the task was solved. Mixing the layers turns every regression into guesswork: a faithful answer over irrelevant documents needs a retrieval fix, while ignored evidence points at generation.

Retrieval and correctness metrics depend on relevance labels, reference evidence, or reference answers. Some generation diagnostics, including faithfulness and response relevancy, can instead compare the query, response, and retrieved context without a reference answer. [[Retrieval Evaluation Sets]] covers retrieval labels and builds on the broader [[Building an Evaluation Set]] process. A changed score still identifies a symptom, not the responsible component. [[Component-Level Evaluation]] provides the ablation method for that diagnosis.

A support bot can retrieve the correct policy and still misread its date constraint. Retrieval passed. Generation failed. More search tuning cannot repair that answer.

# Retrieval Metrics

Retrieval metrics evaluate whether the relevant documents reached the generator. The relevance and ranking metrics assume a labeled set in which each query has known relevant documents. Empty-result rate needs no labels, because it only counts queries for which retrieval returns nothing. The full definitions, worked examples, and alerting guidance live in [[Monitoring#Retrieval Quality Metrics|Monitoring — Retrieval Quality Metrics]]. This table summarizes what each metric answers and when to prefer it.

| Metric | What it answers | When to prefer |
| --- | --- | --- |
| [[Monitoring#Retrieval Quality Metrics\|Recall@k]] | Were the relevant documents found | Primary metric -- always tracked |
| [[Monitoring#Retrieval Quality Metrics\|Precision@k]] | How much noise is in the context | Context window is tight or token cost matters |
| [[Monitoring#Retrieval Quality Metrics\|HitRate@k]] | Did at least one relevant doc appear | Quick minimum-bar check. Good for dashboards |
| [[Monitoring#Retrieval Quality Metrics\|MRR]] | Is the best result ranked first | Generator uses only top-1 or top-2 chunks |
| [[Monitoring#Retrieval Quality Metrics\|MAP]] | Are all relevant docs found and ranked high | Multiple relevant documents per query expected |
| [[Monitoring#Retrieval Quality Metrics\|nDCG@k]] | Is the full ranking quality good | Generator uses all k chunks with position-aware weighting |
| [[Monitoring#Deterministic Metrics\|Empty-result rate]] | How often retrieval returns nothing -- label-free telemetry for possible coverage gaps | Corpus is growing or query patterns are shifting |

Recall creates a hard ceiling because the generator cannot use evidence it never receives. [[Monitoring#Deterministic Metrics|Empty-result rate]] needs separate tracking as well. Aggregate recall can hide queries for which the index returns nothing.

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

Individual scores identify symptoms. Combinations are hypotheses, interpreted only after reference quality, captured context, metric configuration, and representative samples have been checked. Scores alone do not establish a component's root cause.

| Faithfulness | Context Recall | Observation / hypothesis | Investigation |
| --- | --- | --- | --- |
| High | Low | Answer claims are largely supported by retrieved context, but reference coverage is low | Missing evidence, metadata filters, candidate cutoff, and retrieval fit warrant inspection |
| Low | High | Unsupported answer claims despite high reference coverage in the measured context | Assembled model input, generation behavior, and evaluator judgments warrant inspection |
| Low | Low | Unsupported answer claims and low reference coverage | Both measurements are validated first; missing evidence and generation are then investigated separately |

| Context Precision | Context Recall | Observation / hypothesis | Investigation |
| --- | --- | --- | --- |
| Low | High | Relevant chunks tend to rank below irrelevant chunks while reference coverage is high | Ranking, metadata filters, and final context selection warrant inspection |
| High | Low | Relevant chunks tend to rank above irrelevant chunks while reference coverage is low | Missing evidence, candidate cutoff, [[AI & ML/LLM/Context Engineering/RAG/Retrieval#Hybrid Retrieval — Vector + Keyword\|hybrid search]], and chunk boundaries warrant inspection |

## Additional RAGAS Metrics

Two additional diagnostics cover failure modes that the four core rows above do not:

- **[[Monitoring#LLM-as-Judge Metrics|Noise Sensitivity]]** — measures incorrect response claims, judged against the reference, that are attributable to retrieved context. A selected mode sets the attribution: relevant mode counts incorrect claims attributable to relevant retrieved chunks, and irrelevant mode counts those attributable to irrelevant chunks, so a reported score names its mode. Catches a gap the original four miss: a claim that the retrieved context supports, and that Faithfulness therefore accepts, can still be incorrect against the reference. Attribution shows which context supports an incorrect claim, not that the chunk caused the error. Requires reference. Lower is better.
- **[[Monitoring#LLM-as-Judge Metrics|Context Entities Recall]]** — compares named entities in the reference answer against entities in retrieved context. Useful for entity-heavy domains (legal, medical, financial) where missing a specific name, date, or identifier is a hard failure even when general topic recall is adequate.

# Tradeoffs

No scoring method gives high semantic coverage, low cost, and stable calibration at once. The mix depends on available ground truth and the consequence of a false pass.

| Approach | Coverage | Cost | Latency | Reliability |
| --- | --- | --- | --- | --- |
| Human evaluation | Highest -- catches nuance and edge cases | Highest -- annotator time per query | Slow -- days to weeks per batch | Gold standard but low throughput |
| LLM-as-judge | High -- handles open-ended semantics | Medium -- API cost per scored response | Fast -- seconds per judgment | Subject to bias and prompt sensitivity |
| Deterministic checks | Low for open-ended semantics -- covers explicitly encoded rules such as exact match, format, business rules, permissions, and argument constraints | Lowest -- no model calls | Instant | Reproducible, but only as valid as the encoded specification |
| Reference-free metrics | Medium -- no ground truth needed | Medium -- model calls for scoring | Fast | Limited -- can flag claims unsupported by or contradicting the supplied context, but cannot establish real-world correctness or completeness, or catch an error the answer copies faithfully from that context |
| End-to-end user metrics | Highest signal -- measures real impact | Low direct cost -- piggybacks on production | Delayed -- needs traffic volume | Noisy -- confounded by UI and user behavior |

Deterministic checks serve as fast release gates, while an LLM judge covers semantic failures. Human labels calibrate both and cover costly edge cases. Production outcomes validate the system, but they are too delayed and confounded to serve as the only evaluation.

# Pitfalls

## Aggregate Metrics Mask Segment Regressions

A change can improve average Recall@5 by 2% while dropping 15% for one tenant's query cluster. The average passes and the tenant sees a regression. Query types and document sources do not share one retrieval distribution.

Slicing by the dimensions that can change the retrieval problem, such as tenant, language, query cluster, or document source, exposes such losses. A material segment regression remains a regression even when the global average rises.

## LLM-as-Judge Bias in Generation Metrics

LLM judges exhibit positional bias (scoring the first response higher in pairwise comparisons), verbosity bias (rewarding longer answers regardless of correctness), and self-preference bias (scoring outputs from the same model family higher). For RAG specifically, judges are also sensitive to evaluation prompt wording: small changes to the prompt that asks whether an answer is faithful can shift scores across the entire eval set.

Binary judgments often calibrate more reliably than broad numeric scales. Prompt-sensitivity checks, comparison with a small human-labeled set, and agreement tracked over time show whether a judge stays reliable. [[LLM-as-a-Judge]] covers the reliability mechanics in more depth.

# Questions

> [!qard]- How do Recall@k, Precision@k, HitRate@k, MRR and nDCG@k differ as retrieval metrics?
> All five compare a ranked result list with labeled relevant documents, but each rewards something different: coverage, low noise, any success, an early first hit or a well-ordered ranking.
>
> | Metric | What it measures | Effect of rank within the top k | What it misses |
> |---|---|---|---|
> | Recall@k | Share of a query's relevant documents that appear in the top k | None | How high the relevant documents rank and how much noise surrounds them |
> | Precision@k | Share of the top k results that are relevant | None | Relevant documents that were never retrieved |
> | HitRate@k | Share of queries with at least one relevant result in the top k | None | Every missing document after the first hit |
> | MRR | Mean, across queries, of `1 / rank` for the first relevant result, counting `0` when none is found | Strong, but only for the first hit | Everything after the first relevant result |
> | nDCG@k | Sum of the relevance grades in the top k, each discounted by its position, divided by that sum for the ideal ordering | Applies across the whole top k | Whether a low score comes from missing documents or from poor ordering |
>
> Example: a query has four known relevant documents, and its top five results are `[irrelevant, relevant, relevant, irrelevant, relevant]`.
>
> - Recall@5 is `3/4 = 0.75`, because three of the four relevant documents appear.
> - Precision@5 is `3/5 = 0.6`, because three of the five results are relevant.
> - The query counts as a hit for HitRate@5.
> - Its reciprocal rank is `1/2 = 0.5`, because the first relevant result is at rank 2.
>
> Recall sets a ceiling for generation, because the generator cannot use evidence it never receives. Precision matters when context space or token cost is tight. MRR fits a generator that reads only the top one or two chunks. nDCG@k fits a generator that uses all k chunks and benefits from seeing the strongest evidence first.
>
> Sources:
>
> - [RAG evaluators and document retrieval metrics (Microsoft Foundry)](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators?view=foundry)
> - [[Monitoring#Retrieval Quality Metrics|Monitoring: Retrieval Quality Metrics]]

<!-- qard-id: 93e287a9-2061-488e-ae8b-95393678099a -->

> [!qard]- Why can aggregate retrieval metrics hide regressions, and when is a segment drop actionable?
> An aggregate metric averages over all queries, so a gain on large, healthy segments can outweigh a serious loss on a small one. A segment drop is actionable when it matters to that segment's users and is too large to explain as sampling noise.
>
> Example: a change raises overall Recall@5 by 2%, while recall for one tenant's query cluster falls by 15%. A gate on the global average passes, yet that tenant now receives worse evidence.
>
> Slicing results by dimensions that change the retrieval problem, such as tenant, language, query class or document source, exposes such losses. Slicing has its own risk. A small segment has few labeled queries, so its score depends heavily on which queries happen to be in the set. A segment drop is credible and actionable when:
>
> - the segment has enough labeled queries, representative of its real traffic, for its score to be meaningful;
> - the drop exceeds the uncertainty that comes from that limited query sample, for example by falling outside a confidence interval computed over the segment's queries;
> - it crosses a threshold set in advance from the product's risk for that segment.
>
> Rerunning the same evaluation on the same queries does not satisfy the second condition. Repeated runs show whether scores stay stable when retrieval or judging is nondeterministic. They add no queries, and they do not make the existing queries more representative.
>
> A material, credible segment regression remains a regression even when the global average improves.
>
> Sources:
>
> - [Rules of Machine Learning (Google)](https://developers.google.com/machine-learning/guides/rules-of-ml)
> - [[Evaluation Metrics#Aggregate Metrics Mask Segment Regressions|Evaluation Metrics: Aggregate Metrics Mask Segment Regressions]]

<!-- qard-id: f85d000b-ccfc-45ce-9b8a-b98babd40c07 -->

> [!qard]- In a RAGAS evaluation, what does high Faithfulness with low Context Recall suggest, and what should be checked first?
> It suggests that the answer stays consistent with the context it received, but that context lacks evidence the reference answer needs. The first check is the measurement itself: the reference answer, the captured context and the metric configuration. Retrieval is investigated once those are confirmed sound.
>
> - **Faithfulness:** the share of claims in the response that the supplied context supports. It does not show whether that context was complete.
> - **Context Recall:** the share of claims in the reference answer that the retrieved context supports. It requires a reference and measures coverage of the evidence an answer needs.
>
> Together, the scores fit a generator that stays within limited evidence, which can produce a grounded but incomplete answer.
>
> The order of investigation:
>
> 1. **Measurement:** the reference answer is correct, the scored context is what the generator actually received, and the metric variant, judge model and inputs are as intended. A flawed reference or a logging gap can produce the same pattern.
> 2. **Retrieval path:** missing or unindexed documents, metadata filters, the candidate cutoff and context assembly.
> 3. **Generation:** changed only after the retrieval path is ruled out, because a prompt cannot make use of evidence that never arrived.
>
> Neither score alone proves the cause. The combination is a hypothesis to test on representative samples.
>
> Sources:
>
> - [Context Recall (Ragas)](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/)
> - [Faithfulness (Ragas v0.2.5)](https://docs.ragas.io/en/v0.2.5/concepts/metrics/available_metrics/faithfulness/)
> - [[Evaluation Metrics#Diagnostic Combinations|Evaluation Metrics: Diagnostic Combinations]]

# References

- [RAGAS -- automated evaluation of RAG pipelines (EACL 2024)](https://arxiv.org/abs/2309.15217)
- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena -- positional and verbosity bias (NeurIPS 2023)](https://arxiv.org/abs/2306.05685)
