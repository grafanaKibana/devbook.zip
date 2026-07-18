---
topic:
  - Data Persistence
subtopic:
  - NoSQL
summary: "How Elasticsearch maps and analyzes documents into Lucene segments, distributes shards, and serves search and aggregations."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

Elasticsearch is a distributed search and analytics engine built on Apache Lucene. It earns a place beside the system of record when the read path needs relevance-ranked full-text search, faceting, geospatial predicates, or aggregations over indexed events. The application writes JSON documents; mappings define field types, analyzers turn text into terms, and Lucene builds immutable segments whose inverted indexes map terms to matching document identifiers.

Elasticsearch is normally a derived read store. If the cluster is lost, an ingestion pipeline should be able to rebuild it from PostgreSQL, an object store, or a retained log. Treating the index as authoritative changes the backup, durability, concurrency, and recovery problem substantially.

# Mapping and Analysis

A mapping decides how every field is indexed and queried. `text` fields are analyzed for full-text search; `keyword` fields retain one exact value for filters, sorting, and aggregations. Numeric, date, boolean, `geo_point`, nested, and vector fields each have different storage and query behavior. Dynamic mapping is convenient during exploration but can turn an accidental field shape or unbounded field names into a production mapping explosion.

```json
PUT products
{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "name": { "type": "text", "fields": { "raw": { "type": "keyword" } } },
      "tenant_id": { "type": "keyword" },
      "price": { "type": "scaled_float", "scaling_factor": 100 },
      "updated_at": { "type": "date" },
      "location": { "type": "geo_point" }
    }
  }
}
```

An analyzer runs a character-filter, tokenizer, and token-filter pipeline at index time and again at search time. For `"Running Shoes"`, a standard analyzer may emit `running` and `shoes`; a language analyzer may also lowercase, remove stop words, or stem terms. Analyzer changes alter the indexed term space, so they usually require a new index and reindexing behind an alias rather than an in-place mapping edit.

# Segments, Refresh, and Shards

Each Elasticsearch index has primary shards; every primary is one Lucene index. A document ID is routed to one primary shard, indexed there, then copied to configured replica shards. More shards increase parallelism and distribution options, but every shard has heap, file-handle, metadata, recovery, and merge cost. Choose shard count from measured data size, indexing rate, recovery target, and node capacity—not from node count alone.

Lucene segments are immutable. New and updated documents first enter in-memory indexing buffers and the transaction log. A **refresh** opens newly written segments for search, which is why Elasticsearch is near real-time rather than instantaneously searchable. A **flush** commits Lucene state and starts a new transaction-log generation. Background **merges** combine segments and discard obsolete document versions; aggressive refreshes create many small segments and increase merge pressure.

| Operation | What it changes | Failure/cost boundary |
| --- | --- | --- |
| Index document | Buffer, translog, and eventually a new segment | Acknowledgement depends on primary/replica write settings, not refresh visibility |
| Refresh | Makes recent segments searchable | Lower interval improves freshness but raises segment and merge overhead |
| Merge | Rewrites immutable segments | Consumes CPU, disk bandwidth, and temporary disk space |
| Replica recovery | Copies shard history/state to another node | Large or numerous shards extend recovery and rebalance time |

The source learning visual is not embedded because it describes the term dictionary as an LSM tree. Lucene uses immutable segments and specialized term dictionaries/postings structures; the lifecycle resembles append-and-merge storage, but calling the term dictionary itself an LSM tree obscures the actual boundary.

# Query, Filter, and Aggregation

**Query context** computes a relevance score, for example a `match` query over analyzed text. **Filter context** asks a yes/no question without scoring, for example tenant, status, or date predicates, and is the right default for exact constraints. Aggregations bucket and summarize the matching documents, but high-cardinality terms, large bucket counts, and cross-shard reduction can consume substantial heap and network bandwidth.

```json
GET products/_search
{
  "size": 20,
  "query": {
    "bool": {
      "must": [{ "match": { "name": "running shoes" } }],
      "filter": [
        { "term": { "tenant_id": "t9" } },
        { "range": { "price": { "lte": 15000 } } }
      ]
    }
  },
  "aggs": {
    "price_bands": { "histogram": { "field": "price", "interval": 2500 } }
  }
}
```

The tenant filter is a correctness boundary, not only a performance hint. Every search, aggregation, autocomplete, and export path must apply it, or documents can leak across accounts.

# Use Cases

![[Data Persistence/Data Persistence-Elasticsearch-18120000.png]]

> [!WARNING] Near-real-time and product-specific features
> Elasticsearch search visibility follows refresh, so the visual's “real-time” label means near real-time. Flink, Beats, Logstash, Kibana, machine-learning, and SIEM capabilities are separate components or licensed features whose availability and subscription terms must be checked for the deployed distribution and version.

| Use case | Access pattern that earns Elasticsearch | Pipeline and freshness | Cost to accept |
| --- | --- | --- | --- |
| Product or knowledge search | Relevance, stemming, synonyms, facets, typo tolerance | CDC/outbox or batch rebuild; seconds of index lag may be visible | Analyzer/mapping evolution, reindexing, and relevance tuning |
| Logs and events | Time-bounded filtering, free-text investigation, and aggregations | Data stream with rollover and lifecycle retention | High ingest/storage volume, mapping/cardinality control, and tier management |
| Operational analytics | Dashboards over recent indexed events | Refresh interval defines visibility | Aggregation heap, shard fan-out, and sampled/pre-aggregated alternatives |
| Geospatial discovery | Bounding, distance, and shape queries | Application events index `geo_point`/`geo_shape` fields | Specialized mappings and expensive broad geometry queries |
| Security analytics | Search and correlation over normalized security events | Retained ingestion plus rules and case workflow | Sensitive-data controls, long retention, and feature licensing |
| Anomaly detection | Time-series feature jobs over indexed data | Model/job cadence adds another freshness boundary | Licensed capabilities, model operations, and false-positive review |

Use PostgreSQL full-text search when one relational data set needs modest search and transactionally current results. Use Elasticsearch when relevance, language analysis, faceting, log/event scale, or geospatial search justifies a separate derived system. Keep a rebuild path either way.

# Operational Boundaries

- **Mapping explosion:** unbounded dynamic fields consume cluster state and heap. Use explicit templates, `dynamic: strict` where practical, and flatten truly arbitrary key/value payloads.
- **Oversharding:** many tiny shards waste heap and make recovery slow. Rollover by measured size/age and consolidate cold data.
- **Refresh pressure:** calling `_refresh` after every write creates small segments and merge load. Use refresh-on-demand only for bounded workflows that truly need it.
- **Unbounded aggregations:** high-cardinality `terms` queries can exhaust memory. Bound bucket counts, use composite pagination, or pre-aggregate.
- **Disk watermarks:** merge and recovery need free space. A cluster near disk capacity can stop allocating shards or block writes before raw bytes reach 100%.
- **Schema changes:** field types generally cannot be changed in place. Create a new versioned index, reindex, validate, then switch an alias.

# Questions

> [!QUESTION]- Why can a successful Elasticsearch write be invisible to search briefly?
> The primary has accepted the operation and recorded it in its indexing/translog path, but search runs against opened Lucene segments. A refresh publishes recent segments to search. Durability acknowledgement and search visibility are separate boundaries.

> [!QUESTION]- Why use both `text` and `keyword` for one field?
> `text` is analyzed into terms for relevance-ranked full-text matching. `keyword` keeps the exact value for equality filters, sorting, and aggregations. One representation cannot efficiently provide both semantics.

# References

- [Elasticsearch mapping](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html) — official field-type, dynamic mapping, and schema behavior.
- [Elasticsearch analysis](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis.html) — analyzer, tokenizer, and token-filter mechanics.
- [Near real-time search](https://www.elastic.co/guide/en/elasticsearch/reference/current/near-real-time.html) — refresh and search-visibility boundary.
- [Elasticsearch shards and replicas](https://www.elastic.co/guide/en/elasticsearch/reference/current/scalability.html) — distribution, recovery, and shard-sizing considerations.
- [Query and filter context](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-filter-context.html) — scoring versus exact boolean constraints.
- [Elasticsearch aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html) — bucket, metric, and pipeline aggregation contracts.
- [Elastic subscriptions](https://www.elastic.co/subscriptions) — current feature and licensing matrix for machine learning, security, and operations features.
- [How to learn Elasticsearch (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-learn-elasticsearch.md) — source learning outline; its term-dictionary visual is rejected for an inaccurate LSM-tree claim.
- [Top six Elasticsearch use cases (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-6-elasticsearch-use-cases.md) — source use-case inventory and adopted visual, qualified here by access pattern, freshness, licensing, and operating cost.
