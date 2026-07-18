---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Search systems crawl or ingest documents, build versioned indexes, retrieve candidates, and rank results under freshness and quality constraints."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Search System

A search system separates document acquisition from query serving. Crawling or ingestion discovers content; processing creates canonical documents and index terms; serving retrieves candidates and ranks them. Freshness, recall, latency, and index cost pull the design in different directions.

## Crawl and Index Pipeline

A crawl frontier stores normalized URLs with host-level politeness and retry state. Fetchers obey access policy, content limits, and per-host budgets. Canonicalization removes fragments and normalizes known equivalents, but a canonical tag is evidence rather than permission to discard content blindly. Keep the raw fetch hash and chosen canonical ID so duplicate decisions are auditable.

Document processing extracts text, language, fields, links, and security labels. An inverted index maps a term to postings such as `(document_id, field, frequency, positions)`. For example:

```text
retry -> [(doc_7, title, 1), (doc_12, body, 4)]
```

Shard by document ID for balanced writes, then query every relevant shard and merge top candidates. Replicas improve read capacity and availability; they do not remove the need for a consistent index version during rollout.

![[System Design 101/e1fe892c6bae3f8a4ef467ddcc74610a64c0fea336080704e927103e825bd354.png]]

The visual shows the high-level stages. Real systems also need crawl policy, duplicate evidence, index-version rollout, distributed top-k merging, and ranking evaluation.

## Query Serving and Ranking

Parse and normalize the query, apply spelling or synonym rules with versioned dictionaries, retrieve candidates, enforce access filters, score, and return an index version with the response. Cache only after including tenant, locale, permissions, query rules, and index version in the key; otherwise a cache can leak results across policy boundaries.

Evaluate retrieval separately from ranking. Recall asks whether relevant documents entered the candidate set. Ranking metrics such as NDCG evaluate order. Clicks are biased by position and presentation, so offline labels and controlled experiments still matter.

Incremental indexing lowers freshness delay but creates more small segments and merge work. Batch rebuilds are simpler and reproducible but stale. Most systems combine an immutable base index with a small fresh tier, then compact.

## References

- [Google Search Central crawling documentation](https://developers.google.com/search/docs/crawling-indexing/overview) — official crawler discovery, fetching, rendering, indexing, and canonicalization boundaries.
- [Apache Lucene index file formats](https://lucene.apache.org/core/9_12_0/core/org/apache/lucene/codecs/lucene912/package-summary.html) — official segment, postings, stored-field, and index metadata structures.
- [Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/) — Stanford reference for inverted indexes, scoring, evaluation, and distributed retrieval.
- [ByteByteGo: how search engines work](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-search-engines-work.md) — provenance for the crawl, index, query, ranking, and feedback topology.
