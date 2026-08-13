---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Pairs queries with their relevant chunks. The hard part is labeling which chunks count."
level:
  - "2"
priority: High
status: Done
publish: true
---

A retrieval evaluation set pairs queries with chunks judged relevant to them so [[Evaluation Metrics|retrieval metrics]] have ground truth. [[Building an Evaluation Set]] covers general dataset construction. This note focuses on the retrieval-specific part: deciding which chunks count, then avoiding distortions introduced by chunk-anchored synthetic questions.

A query rarely maps cleanly to one chunk. Bad labels can punish a correct retriever or pass an incomplete one even when the evaluation harness is sound.

# When One Query Has Several Relevant Chunks

Single-chunk labels are cheap, but many real queries have several relevant chunks. The right metric depends on why those chunks matter.

**Substitutable relevance: any one is enough.** Several chunks independently answer the query, perhaps because a policy is duplicated or multiple FAQ entries cover it. Label every valid answer and use **HitRate@k** for success, with **MRR** when early rank matters. Strict recall and MAP would penalize missing redundant copies that the generator never needed.

**Complementary relevance: the answer needs the set.** Comparisons and multi-hop questions combine evidence across chunks. Missing one can make the answer incomplete. Use **Recall@k** and RAGAS **Context Recall** because HitRate would pass after the first hit. Synthetic questions for this case should be generated from the full required set and retain every source chunk as ground truth.

**Graded relevance: usefulness differs.** Binary labels lose information when one chunk answers directly and another only supports it. Scores such as `2` for direct evidence, `1` for supporting context, and `0` for irrelevant content feed **nDCG@k**, which rewards ranking stronger evidence first.

| Ground-truth shape | Question it answers | Primary metric | Avoid |
| --- | --- | --- | --- |
| Substitutable (any-of) | Did at least one good chunk arrive | HitRate@k, MRR | Strict recall / MAP — penalizes not finding redundant copies |
| Complementary (all-of) | Did every required chunk arrive | Recall@k, Context Recall | HitRate — one hit hides the misses |
| Graded (some better) | Are the best chunks ranked highest | nDCG@k | Binary recall / precision — discards the grades |

The label shape changes the verdict even when the retrieved list stays fixed. Suppose the query is “How do plans A and B differ on refunds?” and the answer requires one policy chunk for each plan. A result containing only plan A has `HitRate@5 = 1`, but complementary recall is `1/2`; the first metric calls the retrieval successful while the generator is missing half the comparison. If two chunks instead repeat the complete plan A policy, retrieving either one is enough. Strict recall would again report `1/2`, this time punishing a result that already contains the whole answer.

**Set k from the generator's real input.** If generation receives five chunks, evaluate at k=5. Complementary cases need a cutoff at least as large as the required set. Otherwise the evaluation itself caps recall below 1.0. [[Monitoring#Retrieval Quality Metrics|Monitoring — Retrieval Quality Metrics]] gives the complete definitions.

The annotation cost should follow the answer path. Simple lookup questions can stay binary and substitutable. Comparisons, aggregation, and multi-hop questions need the full required set, while graded labels earn their cost only when rank among differently useful chunks changes what the generator can answer.

# How Synthetic Questions Distort Labels

Synthetic generation, introduced in [[Building an Evaluation Set]], reverses the labeling direction. Sample a chunk, ask a model for questions that the chunk answers, and record that chunk as relevant to each question. This quickly produces `(query, relevant_chunk)` pairs, though the first-pass label is only a hypothesis until other valid chunks are checked.

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

- **False negatives in ground truth.** Another chunk may answer the synthetic query just as well because of duplicated policy text or an overview section. If only the source is labeled, a correct result becomes a false miss. Run a second retrieval pass and judge the top candidates, then add other valid chunks or drop the ambiguous query.
- **Lexical leakage.** A generated question may copy rare source phrases, making keyword retrieval look stronger than it will on real queries. Require paraphrases, ask for realistically incomplete wording, and inspect token overlap.

# Questions

> [!QUESTION]- When several chunks are relevant to one query, how should the retrieval metric be chosen?
> Classify the evidence relationship first. Substitutable chunks need HitRate@k and often MRR because any early hit succeeds. Complementary chunks need Recall@k or Context Recall because the whole required set matters. If usefulness varies, graded labels and nDCG@k preserve that distinction. The cutoff must match what generation consumes and cannot be smaller than a complementary ground-truth set.

> [!QUESTION]- Why do synthetically generated retrieval eval sets often report worse recall than the system delivers in production?
> Chunk-anchored generation initially labels only its source, even when duplicated or summary chunks also answer the question. Retrieval can return valid evidence that the labels call wrong, depressing the score and even reversing model rankings. Retrieve a candidate set, judge other valid answers, and expand the qrels or discard ambiguous cases. Lexical leakage creates the opposite bias by copying rare source terms and making exact match unrealistically easy.

# References

- [RAGAS synthetic test data generation](https://docs.ragas.io/en/stable/concepts/test_data_generation/rag/) — documents chunk-to-query generation, query types, and the framework's test-set construction workflow.
- [BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models](https://arxiv.org/abs/2104.08663) — introduces the benchmark's qrels-style relevance judgments and evaluation across heterogeneous retrieval tasks.
