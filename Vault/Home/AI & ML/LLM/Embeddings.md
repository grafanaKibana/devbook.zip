---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Mapping text into a dense vector space where semantic similarity becomes geometric proximity."
level:
  - "2"
priority: High
status: Done
publish: true
---

Embeddings turn text into vectors so that related meanings occupy nearby points. That geometry lets retrieval match "throttle partner API traffic" with a document about "rate limiting for partner plan" even when the wording does not overlap.

An encoder model, usually a transformer trained with a contrastive objective, reads a text span and produces a fixed-length vector. Training pulls similar pairs together and pushes unrelated pairs apart. At query time, the same model embeds the query, and the index finds nearby stored vectors with cosine similarity or dot product. Those neighbors are the candidate chunks.

```mermaid
sequenceDiagram
    participant Q as Query Text
    participant E as Embedding Model
    participant VS as Vector Space
    participant I as ANN Index
    participant R as Top-k Results
    Q->>E: Encode query
    E->>VS: Query vector 1x768
    Note over VS: Cosine similarity\nagainst stored chunk vectors
    VS->>I: ANN search -- HNSW or IVF
    I->>R: Return k nearest chunks
```

Leaderboard quality is only a starting point. The useful model is the one that meets recall and latency targets on the actual corpus, at an acceptable cost. A model that tops MTEB can still mishandle internal terminology.

# Embedding Model Selection

## Model Families

Production RAG systems usually start with one of these model families.

**Proprietary API models.** OpenAI `text-embedding-3-small` (1536 dimensions) and `text-embedding-3-large` (3072 dimensions) support a `dimensions` parameter for Matryoshka truncation at inference time. Cohere `embed-v3` distinguishes `search_document` from `search_query` through `input_type` and covers more than 100 languages. Per-token rates change, so cost comparisons need current provider pricing.

**Open-source bi-encoders.** Sentence Transformers (SBERT) includes `all-MiniLM-L6-v2` (384 dimensions, 22M parameters) and `all-mpnet-base-v2` (768 dimensions, 109M parameters). Local inference removes per-token API charges, but the serving hardware and model lifecycle become an internal concern.

**Domain-finetuned models.** A base model can be adapted when internal terminology is the measured source of retrieval misses. In a Databricks FinanceBench experiment, `gte-large-en-v1.5` (0.4B parameters) fine-tuned on synthetic domain data reached [[Monitoring#Retrieval Quality Metrics|Recall@10]] of 0.552 versus 0.44 for `text-embedding-3-large`. Adaptation commonly uses continued masked-language pre-training or contrastive training on query-document pairs.

## Dimensionality

Higher dimensions give the model more room to represent fine-grained distinctions. But higher dimensions also mean more storage (4 bytes × dimensions per vector), more compute for similarity search, and higher ANN index memory.

Matryoshka Representation Learning (MRL) trains models so that prefixes of the full vector remain independently meaningful. OpenAI reports `text-embedding-3-large` at 256 dimensions outperforming `ada-002` at 1536 dimensions on the aggregate MTEB benchmark. That result motivates testing shorter vectors, but corpus-specific Recall@k must establish the retrieval tradeoff. Shorter vectors can reduce storage and search work, with full dimensions reserved for cases that need them.

A two-stage design can generate the full embedding once, normalize and index its reduced prefix for ANN search, then score the small candidate set with the retained full vector or a cross-encoder. Full vectors must live outside the ANN index or be recomputed for the candidates. Retaining them reduces ANN memory and search work but not total vector storage; recomputing them trades storage for API cost and latency.

## Similarity Metrics

The similarity metric defines what "near" means in the vector space.

**Cosine similarity** measures the angle between vectors, ignoring magnitude. Most embedding models are trained with cosine objectives, making it the default choice. Range: -1 to 1 (1 = identical direction).

**Dot product** is cosine similarity scaled by vector magnitudes. For L2-normalized vectors, dot product equals cosine similarity. Normalization is model-specific: OpenAI documents its embedding vectors as length-normalized, while another model may preserve magnitude as part of the signal. Follow the selected model's contract rather than assuming every API behaves the same way.

**Euclidean (L2) distance** measures straight-line distance in vector space. Less common for text embeddings because high-dimensional spaces make absolute distances less discriminative than angular measures.

Cosine similarity is the safe default unless the model documentation specifies another metric.

# Pitfalls

## Distribution Shift on Internal Terminology

A model that scores well on MTEB can still fail on a specific domain. Internal acronyms or product names may be poorly represented in the training data, leaving related queries and documents far apart in vector space.

Detection: compare recall@k on a held-out set of domain-specific queries vs generic queries. A significant gap signals distribution shift.

The repair depends on the failure. Domain adaptation can improve semantic placement, while [[Retrieval|hybrid retrieval]] lets BM25 recover exact terminology that dense retrieval misses.

## Embedding Model Swap Invalidation

Changing the embedding model — even a minor version — invalidates every stored vector. The new model produces vectors in a different geometric space. Cosine similarity between old and new vectors is meaningless.

This means re-embedding the entire corpus: for a 10M-chunk index at $0.02/1M tokens and 500 tokens/chunk average, that is ~$100 and hours of ingestion time. Key the [[Home/AI & ML/LLM/Context Engineering/RAG/Caching|embedding cache]] by model name + version to prevent serving stale vectors.

## Benchmark Leaderboard Overfitting

MTEB aggregates several task families. A model can rank first overall while performing poorly on retrieval because strong classification or semantic-similarity results lift its average. For RAG selection, filter to the `Retrieval` category and then test against a corpus-specific evaluation set.

## Multilingual Embedding Collapse

Models trained primarily on English text cluster non-English content into a smaller region of vector space, reducing separation between distinct concepts. A Spanish query about "seguridad informática" and one about "seguridad alimentaria" may land closer together than they should because the model undertrained on Spanish semantic distinctions.

Mitigation: use models with explicit multilingual training (Cohere `embed-v3`, SBERT multilingual variants), and evaluate recall per language separately.

# Tradeoffs

| Factor | Proprietary API | Open-Source Self-Hosted | Domain-Finetuned |
| --- | --- | --- | --- |
| Cost at scale | Per-token pricing -- scales linearly | Infrastructure cost -- GPU amortized across volume | Training cost upfront -- inference same as base |
| Recall on general text | High -- trained on massive web corpora | Competitive -- top models match proprietary on MTEB | Depends on base model and training data quality |
| Recall on domain text | Can miss internal terminology | Same limitation as proprietary | Potentially higher when domain training improves held-out retrieval |
| Latency | Network round-trip + provider queue | Local inference -- no network hop | Same as self-hosted base model |
| Operational burden | Minimal -- API call | High -- GPU infra and model serving and updates | Highest -- training pipeline plus serving |
| Vendor lock-in | Model changes break vector index | Full control over versioning | Full control |
| Dimensionality control | Some models support MRL truncation | Full control via model choice | Full control |

Start with the simplest model that establishes a credible recall baseline. Fine-tune only after failed queries show that domain semantics, rather than chunk boundaries or retrieval configuration, are the bottleneck. Better embeddings cannot repair bad chunks.

# Questions

> [!QUESTION]- How can Matryoshka dimensionality reduction lower embedding storage costs without significant recall loss?
> The `dimensions` parameter can return a 256- or 512-dimensional Matryoshka vector because each prefix is trained to remain useful. Moving an ANN index from 1536 to 256 dimensions cuts its raw vector storage by about six times and reduces search work. The recall loss is model- and corpus-specific, so compare Recall@k at several sizes. Re-ranking with full vectors requires generating and retaining those full embeddings outside the ANN index, or recomputing them for the candidates; that extra storage or API work belongs in the comparison.

> [!QUESTION]- Why can switching to a higher-scoring embedding model cause recall to drop on existing queries?
> Each model defines its own vector space. Comparing a query from the new model with stored vectors from the old one produces meaningless distances and broken rankings. Build the new corpus index before switching query traffic, and include the model name and version in embedding-cache keys.

> [!QUESTION]- When is domain-finetuning the embedding model justified over improving chunking or retrieval?
> Fine-tuning is justified when failed queries and relevant documents express the same domain concept yet rank far apart. Split logical units point to chunking. Missing filters or ambiguous queries belong elsewhere in the retrieval pipeline. Inspect the top-k results first. If intact, relevant chunks exist but consistently rank low, the embedding model is a credible bottleneck.

# References

- [Embeddings guide — text-embedding-3 models and MRL (OpenAI)](https://platform.openai.com/docs/guides/embeddings) — provider documentation for dimensions, normalization, and model behavior.
- [MTEB leaderboard — filter by Retrieval task (Hugging Face)](https://huggingface.co/spaces/mteb/leaderboard) — benchmark explorer for comparing retrieval results rather than aggregate rank.
- [Pretrained models and MTEB caveats (Sentence Transformers)](https://sbert.net/docs/sentence_transformer/pretrained_models.html) — upstream model catalog with dimensions and intended uses.
- [Matryoshka Representation Learning — original MRL paper (arXiv)](https://arxiv.org/abs/2205.13147) — primary paper describing useful nested vector prefixes.
- [Matryoshka embeddings training with MatryoshkaLoss (SBERT)](https://sbert.net/examples/sentence_transformer/training/matryoshka/README.html) — upstream example of training nested embedding dimensions with Matryoshka loss.
- [Domain adaptation — GPL and adaptive pre-training (SBERT)](https://sbert.net/examples/sentence_transformer/domain_adaptation/README.html) — upstream techniques for adapting embeddings when domain text differs from general training data.
- [Improving retrieval with embedding finetuning — FinanceBench experiment (Databricks)](https://www.databricks.com/blog/improving-retrieval-and-rag-embedding-model-finetuning) — reports the cited FinanceBench recall comparison and its synthetic training procedure.
- [Fine-tuning embeddings for enterprise RAG — Glean lessons (Jason Liu / Glean)](https://jxnl.co/writing/2025/03/06/fine-tuning-embedding-models-for-enterprise-rag-lessons-from-glean/) — practitioner account of evaluation-set construction and hard-negative mining for enterprise retrieval.
- [Introducing Embed v3 — input_type and compression-aware training (Cohere)](https://cohere.com/blog/introducing-embed-v3) — provider description of asymmetric input types and multilingual embedding behavior.
- [Azure OpenAI embeddings — deployment and SDK usage (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/embeddings) — Microsoft guidance for deploying and calling OpenAI embedding models through Azure.
