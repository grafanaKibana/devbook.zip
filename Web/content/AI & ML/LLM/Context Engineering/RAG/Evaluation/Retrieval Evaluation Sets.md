---
publish: true
created: 2026-07-18T14:02:43.892Z
modified: 2026-07-18T14:02:43.892Z
published: 2026-07-18T14:02:43.892Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Pairs queries with their relevant chunks; the hard part is labeling which chunks count.
level:
  - "2"
priority: High
status: Done
---

A retrieval eval set is the labeled data the [[Evaluation Metrics|retrieval metrics]] run against: a set of queries, each with its known-relevant chunks. The general machinery for building any eval set — example structure, LLM-driven synthetic generation, golden-set curation, sizing for statistical power — lives in [[Building an Evaluation Set]]. This page covers only the two parts that are specific to retrieval and have no analogue in a single-shot LLM or agent eval: how you label _which_ chunks count as relevant, and how chunk-anchored synthetic generation distorts retrieval scores.

Both come down to one fact: a query rarely maps to exactly one chunk. Get the labeling wrong and the metric punishes a correct retriever or passes a broken one, regardless of how clean the rest of the eval harness is.

# Multiple relevant chunks per query

The simplest eval labels one relevant chunk per query, but most real queries have several, and how you label and score them depends on _why_ multiple chunks are relevant. Conflating the two cases below produces metrics that punish a correct retriever or pass a broken one.

**Substitutable relevance — "any of these is good."** Several chunks each independently and fully answer the query: the same policy duplicated across documents, multiple FAQ entries covering one topic. Retrieving any single one of them is success. Label all of them relevant and score with **HitRate@k** (did at least one relevant chunk arrive) as the primary metric and **MRR** to reward ranking a hit early. Do not use strict recall or MAP here — they penalize the retriever for "missing" redundant copies it never needed to find, which is not a real failure.

**Complementary relevance — "all of these are needed."** The answer requires combining evidence spread across chunks: multi-hop reasoning, comparisons ("how do plans A and B differ on refunds"), or aggregation. Missing any one chunk yields an incomplete answer. Score with **Recall@k** — the fraction of _required_ chunks retrieved — and RAGAS **Context Recall**. HitRate is actively misleading here: retrieving one of three required chunks looks like a pass but produces a wrong answer. For synthetic generation of this case, give the LLM 2-3 chunks at once and ask for a question that needs _all_ of them, recording the whole set as ground truth.

**Graded relevance — "some are better than others."** When chunks differ in usefulness (one directly answers, another is supporting context), binary labels throw away signal. Label with graded scores — `2` = directly answers, `1` = useful supporting context, `0` = irrelevant — and score with **nDCG@k**, the one common metric that consumes graded labels and rewards placing the most-relevant chunk highest.

| Ground-truth shape | Question it answers | Primary metric | Avoid |
| --- | --- | --- | --- |
| Substitutable (any-of) | Did at least one good chunk arrive | HitRate@k, MRR | Strict recall / MAP — penalizes not finding redundant copies |
| Complementary (all-of) | Did every required chunk arrive | Recall@k, Context Recall | HitRate — one hit hides the misses |
| Graded (some better) | Are the best chunks ranked highest | nDCG@k | Binary recall / precision — discards the grades |

**Set k from what the generator actually consumes**, not a borrowed default. If the prompt packs the top 5 chunks into context, evaluate at k=5. For the substitutable case a small k (HitRate@3) is enough. For the complementary case, k must be at least the number of required chunks, or recall is capped below 1.0 by construction and the metric measures the eval design rather than the retriever. See [[Monitoring#Retrieval Quality Metrics|Monitoring — Retrieval Quality Metrics]] for the full metric definitions.

# Chunk-anchored synthetic generation

The general synthetic-generation technique — prompt an LLM to write the questions a passage answers — is covered in [[Building an Evaluation Set]]. Applied to retrieval it has a specific shape: sample N chunks, and for each, prompt the model for the questions a real user would ask that this chunk answers. The chunk becomes the ground-truth relevant document for every query it produced — inverting the expensive direction of labeling. One batch yields thousands of `(query, relevant_chunk)` pairs with no human in the loop for the first pass.

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

This produces exactly the structure the retrieval metrics consume: the query is the eval input, the source chunk is the expected result, and Recall@k / MRR / nDCG@k are computed by checking where that chunk lands in the retrieved list. Two failure modes are specific to _retrieval_ labeling — distinct from the general distributional-homogeneity risk that applies to any synthetic set:

- **False negatives in ground truth.** The synthesized query is frequently answerable by _other_ chunks you never labeled — duplicated policy text, an overview paragraph, a near-identical FAQ entry. The retriever returns a genuinely relevant chunk, but because only the source chunk is marked relevant, Precision@k and MRR penalize it as a miss. This deflates scores and can rank a _better_ retriever lower than a worse one. Mitigation: after generation, run a second pass (the retriever itself, or an LLM judge over the top-k) to find other chunks that also answer the query and either label them relevant too or drop ambiguous queries. This is the single most common reason synthetic retrieval numbers look worse than production reality.
- **Lexical leakage.** LLMs lift exact phrasing from the source chunk, producing queries that share rare tokens with the answer. These favor BM25 and exact match, overstating retrieval quality on a query distribution real users never type. Mitigation: instruct the model to paraphrase and to ask realistically underspecified questions; spot-check token overlap between query and source.

# Questions

> [!QUESTION]- When several chunks are relevant to one query, how do you decide which retrieval metric to score with?
>
> - First classify _why_ they are relevant — substitutable (any one fully answers) versus complementary (the answer needs all of them combined)
> - Substitutable: score HitRate@k and MRR — success is one good chunk arriving early; strict recall or MAP wrongly penalizes not retrieving redundant copies
> - Complementary: score Recall@k and Context Recall — every required chunk must arrive; HitRate is misleading because one-of-three looks like a pass but yields an incomplete answer
> - When chunks differ in usefulness rather than count, use graded labels (0/1/2) and nDCG@k, the only common metric that consumes grades and rewards ranking the best chunk first
> - Set k from how many chunks the generator actually consumes; for complementary cases k must be at least the number of required chunks or recall is capped below 1 by construction
> - Graded multi-chunk labels cost far more annotation effort than single-chunk binary labels — invest only where the generator genuinely fuses multiple sources (multi-hop, comparison), and keep single-label binary sets for simple lookup queries

> [!QUESTION]- Why do synthetically generated retrieval eval sets often report worse recall than the system delivers in production?
>
> - Chunk-anchored generation labels only the source chunk as relevant, but the synthesized query is frequently answerable by other unlabeled chunks (duplicated text, overview paragraphs, near-identical FAQ entries)
> - The retriever returns a genuinely relevant chunk, but because it is not in the ground truth, Precision@k and MRR score it as a miss — a false negative in the labels, not a retrieval failure
> - This deflates absolute numbers and, worse, can rank a better retriever below a worse one, corrupting model-selection decisions
> - Fix: after generation, run a second pass (the retriever plus an LLM judge over top-k) to label additional chunks that also answer the query, or discard ambiguous queries
> - Secondary cause: lexical leakage — the LLM copies rare phrasing from the source chunk, inflating exact-match and BM25 scores on queries no real user would type
> - The dedup/judge pass does add LLM cost per query and some noise of its own, but without it synthetic retrieval metrics are systematically pessimistic and unreliable for ranking pipelines

# References

- [RAGAS synthetic test data generation -- chunk-to-query generation, query types, and labeling (RAGAS docs)](https://docs.ragas.io/en/stable/concepts/test_data_generation/rag/)
- [BEIR -- heterogeneous zero-shot retrieval benchmark with qrels-style relevance judgments (NeurIPS 2021)](https://arxiv.org/abs/2104.08663)
