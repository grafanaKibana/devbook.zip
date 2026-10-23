---
publish: true
created: 2026-10-21T13:29:32.421Z
modified: 2026-10-21T13:29:32.421Z
published: 2026-10-21T13:29:32.421Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Pairs queries with their relevant chunks. The hard part is labeling which chunks count.
level:
  - "2"
priority: High
status: Done
qard-deck: AI & ML
qard-topic: LLM/Context Engineering/RAG/Evaluation/Retrieval Evaluation Sets
flashcard_uid: 476f3199
---

A retrieval evaluation set pairs queries with chunks judged relevant to them so [[Evaluation Metrics|retrieval metrics]] have ground truth. [[Building an Evaluation Set]] covers general dataset construction. This note focuses on the retrieval-specific part: deciding which chunks count, then avoiding distortions introduced by chunk-anchored synthetic questions.

A query rarely maps cleanly to one chunk. Bad labels can punish a correct retriever or pass an incomplete one even when the evaluation harness is sound.

# When One Query Has Several Relevant Chunks

Single-chunk labels are cheap, but many real queries have several relevant chunks. The right metric depends on why those chunks matter.

**Substitutable relevance: any one is enough.** Several chunks independently answer the query, perhaps because a policy is duplicated or multiple FAQ entries cover it. Every valid answer is labeled, and **HitRate@k** measures success, with **MRR** added when early rank matters. Strict recall and MAP would penalize missing redundant copies that the generator never needed.

**Complementary relevance: the answer needs the set.** Comparisons and multi-hop questions combine evidence across chunks. Missing one can make the answer incomplete. **Recall@k** and RAGAS **Context Recall** fit this case, because HitRate would pass after the first hit. Synthetic questions for this case should be generated from the full required set and retain every source chunk as ground truth.

**Graded relevance: usefulness differs.** Binary labels lose information when one chunk answers directly and another only supports it. Scores such as `2` for direct evidence, `1` for supporting context, and `0` for irrelevant content feed **nDCG@k**, which rewards ranking stronger evidence first.

| Ground-truth shape | Question it answers | Primary metric | Avoid |
| --- | --- | --- | --- |
| Substitutable (any-of) | Did at least one good chunk arrive | HitRate@k, MRR | Strict recall / MAP — penalizes not finding redundant copies |
| Complementary (all-of) | Did every required chunk arrive | Recall@k, Context Recall | HitRate — one hit hides the misses |
| Graded (some better) | Are the best chunks ranked highest | nDCG@k | Binary recall / precision — discards the grades |

The label shape changes the verdict even when the retrieved list stays fixed. Suppose the query is “How do plans A and B differ on refunds?” and the answer requires one policy chunk for each plan. A result containing only plan A has `HitRate@5 = 1`, but complementary recall is `1/2`; the first metric calls the retrieval successful while the generator is missing half the comparison. If two chunks instead repeat the complete plan A policy, retrieving either one is enough. Strict recall would again report `1/2`, this time punishing a result that already contains the whole answer.

**The cutoff follows the generator's real input.** If generation receives five chunks, evaluation uses k=5. Complementary cases need a cutoff at least as large as the required set. Otherwise the evaluation itself caps recall below 1.0. [[Monitoring#Retrieval Quality Metrics|Monitoring — Retrieval Quality Metrics]] gives the complete definitions.

The annotation cost should follow the answer path. Simple lookup questions can stay binary and substitutable. Comparisons, aggregation, and multi-hop questions need the full required set, while graded labels earn their cost only when rank among differently useful chunks changes what the generator can answer.

# How Synthetic Questions Distort Labels

Synthetic generation, introduced in [[Building an Evaluation Set]], reverses the labeling direction. A sampled chunk is given to a model that writes questions the chunk answers, and that chunk is recorded as relevant to each question. This quickly produces `(query, relevant_chunk)` pairs, though the first-pass label is only a hypothesis until other valid chunks are checked.

```text
for chunk in sample(corpus, n=2000):
    prompt = f"""You are a user of this knowledge base. Read the passage and
    write 1-3 natural questions it fully answers. Paraphrase — do not copy
    phrases verbatim. Skip the passage if it is boilerplate (nav, headers).

    Passage:
    {chunk.text}"""
    for q in llm(prompt):
        eval_set.append({"query": q, "relevant_chunk_ids": [chunk.id]})
```

The structure fits retrieval metrics directly: a query goes in, and the source chunk is expected among the ranked results. Two labeling failures matter in particular.

- **False negatives in ground truth.** Another chunk may answer the synthetic query just as well because of duplicated policy text or an overview section. If only the source is labeled, a correct result becomes a false miss. A second retrieval pass whose top candidates are judged can surface further valid chunks, which are added to the labels, or show that the query is too ambiguous to keep. Because it judges only a finite candidate list, it cannot prove that the labels are exhaustive; unjudged chunks can still answer the query.
- **Lexical leakage.** A generated question may copy rare source phrases, making keyword retrieval look stronger than it will on real queries. Generation prompts that require paraphrases and realistically incomplete wording, together with a token-overlap check, limit this effect.

# Questions

<!-- qard-id: 68b4fc0a-ef08-471b-92c9-7e9ef9055056 -->

> [!qard]- How should retrieval metrics and cutoffs be chosen when a query has several relevant chunks?
> The metric depends on how the relevant chunks contribute to the answer, and the cutoff must match what each pipeline stage actually passes on.
>
> | Relevance shape | Success means | Fitting metric | Misleading metric |
> |---|---|---|---|
> | Substitutable: any one chunk answers, as with duplicated policy text | At least one valid chunk appears, ideally early | HitRate@k, plus MRR when the first relevant rank matters | Strict Recall@k, which penalizes missing copies the generator never needed |
> | Complementary: the answer needs the whole set, as in a comparison | Every required chunk appears | Recall@k or RAGAS Context Recall | HitRate@k, which passes after the first hit and hides the missing pieces |
> | Graded: some chunks are more useful than others | The most useful chunks rank highest | nDCG@k with graded labels, such as `2` for direct evidence, `1` for support and `0` for irrelevant | Binary recall or precision, which discard the grades |
>
> Example: “How do plans A and B differ on refunds?” needs one policy chunk per plan. A result containing only plan A has `HitRate@5 = 1` but complementary recall of `1/2`.
>
> Cutoffs:
>
> - The final k equals the number of chunks the generator receives. A larger k credits evidence that never reaches the model.
> - For complementary evidence, k must be at least the size of the required set. Otherwise recall cannot reach `1.0`.
> - In a retrieve-then-rerank pipeline, first-stage Recall@N shows whether the evidence entered the candidate set, and the final top-k shows what reaches generation. Either measurement alone can hide a loss at the other stage.
>
> Sources:
>
> - [RAG evaluators and document retrieval metrics (Microsoft Foundry)](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators?view=foundry)
> - [Retrieve & Re-Rank (Sentence Transformers)](https://sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html)
> - [Context Recall (Ragas)](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/)
> - [[Retrieval Evaluation Sets#When One Query Has Several Relevant Chunks|Retrieval Evaluation Sets: When One Query Has Several Relevant Chunks]]

<!-- qard-id: 48f01445-3d19-4e2a-99b4-df08403ad5a5 -->

> [!qard]- How can chunk-generated questions produce misleading retrieval evaluation labels?
> A question generated from one chunk is labeled with only that chunk as relevant. That label can miss other valid answers, and the question can be easier to retrieve than real user queries.
>
> - **Missing positives (false negatives):** a duplicate, an overview section or another passage may answer the question equally well. If it is not labeled, a retriever that returns it is scored as wrong, and comparisons between retrievers can be distorted.
> - **Lexical leakage:** the question may copy distinctive phrases from its source chunk. Exact-term overlap then makes keyword retrieval look stronger than it would on real queries.
>
> Both are risks to check, not certainties. Common controls:
>
> - A second retrieval pass runs each generated question, and the top candidates are judged. Other valid chunks are added to the labels, or questions that stay ambiguous are dropped.
> - Generation prompts ask for paraphrased, realistically incomplete wording, and the token overlap between each question and its source chunk is inspected.
>
> Sources:
>
> - [Test data generation (Ragas)](https://docs.ragas.io/en/stable/concepts/test_data_generation/rag/)
> - [Generate a synthetic test set for RAG (Ragas v0.3.1)](https://docs.ragas.io/en/v0.3.1/getstarted/rag_testset_generation/)
> - [[Retrieval Evaluation Sets#How Synthetic Questions Distort Labels|Retrieval Evaluation Sets: How Synthetic Questions Distort Labels]]

# References

- [RAGAS synthetic test data generation](https://docs.ragas.io/en/stable/concepts/test_data_generation/rag/)
- [BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models](https://arxiv.org/abs/2104.08663)
