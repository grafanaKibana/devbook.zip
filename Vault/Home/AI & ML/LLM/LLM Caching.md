---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Reuses prompt computation or completed answers; matching rules, freshness, permissions, and measured savings determine which cache is useful."
level:
  - "2"
priority: High
status: Creation
publish: true
---

LLM caching reuses either **prompt computation** or a **completed answer**. Prompt caching saves repeated input processing while still generating a fresh answer. Response caching returns a stored answer and skips generation entirely.

| Cache | What is reused | What qualifies as a hit | Work remaining |
| --- | --- | --- | --- |
| Prompt/prefix | Computed state for an input prefix | An identical, eligible prefix with compatible model and cache scope | Process the uncached suffix and generate an answer |
| Exact response | A completed answer | Matching inputs that affect answer validity, including permissions and freshness | Return the stored answer |
| Semantic response | A completed answer | A sufficiently similar query within compatible context, with checks against false hits | Embed and compare the query, validate reuse, then return the answer |

“Provider caching” commonly refers to provider-managed prompt caching; it describes who operates the cache. “Semantic caching” describes how candidate matches are found. [[Home/AI & ML/LLM/Context Engineering/RAG/RAG Caching|RAG caching]] describes where caches sit in a retrieval pipeline, including embedding and retrieval results as well as answers.

# Prompt Caching

Prompt caching lets an LLM reuse work already done for an identical prompt prefix. Repeated instructions, tool definitions, reference material, and conversation history can cost less and reach the first output token sooner when their computed state is still available.

The match is an **exact prompt prefix**. Similar wording, the same document in a different position, or an unchanged paragraph after a changing timestamp does not imply a hit. The model still receives the full logical context and generates a fresh answer. Cached input still occupies the context window.

## How It Works

A transformer handles a request in two broad stages:

- **Prefill:** process the input and compute attention keys and values, commonly called the **KV cache**.
- **Decode:** generate output tokens while attending to that state and extending it.

KV state normally avoids recomputing earlier tokens within a generation. Prompt caching allows eligible state to survive for reuse across requests. On a cold request, the service computes and stores a prefix. On a later hit, it reuses that prefix's state, processes the uncached suffix, and starts a new generation. A hit therefore reduces repeated prefill work; it does not remove output generation or guarantee identical answers.

```text
First call: [stable instructions | shared material] [question A]
            compute and cache prefix                process suffix → generate

Later call: [stable instructions | shared material] [question B]
            reuse matching prefix                   process suffix → generate
```

A token's state depends on preceding context. Changing an early token prevents reuse of the old state after that point, even if the remaining text matches. Tool definitions, message boundaries, images, output schemas, and model settings may also affect the provider's rendered input. Comparing only the visible system-prompt string can miss the actual difference.

A **cache breakpoint** identifies the end of a prefix eligible for storage or lookup. A long common beginning is useful only if the provider previously stored a compatible prefix and can find it again. Cache writes establish that state; cache reads demonstrate reuse.

## Improving Cache Reuse

### Stable Content Before Changing Content

A reusable prefix follows change frequency: durable instructions and [[Home/AI & ML/LLM/Harness Engineering/Tooling/Tool Design|tool schemas]], then shared documents or examples, then the changing request. Actual field ordering remains subject to the provider's request format.

```text
[stable tools and instructions]
[shared reference material]       ← reusable cache point
[request-specific retrieval]
[live facts, timestamps, filters]
[current question]
```

A timestamp inside the shared-material block makes that whole marked prefix different on every call. Moving it to a separate block after the cache point preserves the reusable part. Omitting an assembly timestamp is better when it conveys nothing needed for the answer; source-update times remain useful when freshness affects correctness.

For [[Home/AI & ML/LLM/Context Engineering/RAG/RAG|RAG]], a fixed handbook can belong in the shared prefix. Query-specific retrieved chunks usually belong later. Reordering or retaining irrelevant evidence solely to improve hits can degrade the answer.

### Deterministic Prompt Construction

Equivalent application data can serialize differently. Stable document ordering, tool ordering, JSON rendering, separators, and whitespace prevent accidental differences. Request IDs, environment snapshots, and live status should not be regenerated inside an otherwise stable section.

Non-sensitive hashes of prompt sections, template versions, and tool-schema versions help locate the first application-side change. They are diagnostic evidence, not proof that the provider rendered identical input. Gateways and SDKs can add, reorder, or drop content and cache controls, so the outgoing request path matters.

### History and Compaction

Appending new messages preserves an existing prefix. Rewriting an earlier answer, inserting a new instruction near the front, or regenerating old tool results can invalidate later reuse. OpenAI's July 2026 engineering post describes an append-only harness with deterministic tool ordering for this reason.

History still needs a size policy. [[Home/AI & ML/LLM/Context Engineering/Context Engineering|Context engineering]] may require compaction to restore relevance or fit the window. That creates a new prefix and usually a cold period. A shorter, more useful context can outperform a larger cached one.

Compression has the same tension. A July 2026 preprint on cache-aware compression found that changing compressed context for each query could erase savings, while preserving a reusable compressed prefix helped in its tested workloads. Its results are workload-specific; compression and caching need to be evaluated together.

### Reusable Cache Sections

A cache point after stable instructions and another after a shared document can preserve the earlier section when the document changes, where the provider supports those boundaries. A point after a per-request suffix may instead charge for repeated writes that no later request reads.

Cache size and cache value differ. Padding a short prompt to reach an eligibility threshold, retaining unused tools, or caching one-off documents can increase cost. Useful repeated material determines the prefix; a target hit percentage does not determine what the model should see.

### Retention and Traffic

A retained entry only helps if another compatible request arrives while it is available. Occasional independent requests and dense agent loops have different reuse opportunities. Longer retention is worthwhile when expected reads justify its cost.

A routing or accounting key cannot repair changed content. Randomizing it per call can destroy intended grouping; treating it as a command to load a previous prompt is also incorrect. Switching provider, organization, processing region, or relevant model configuration can prevent reuse despite matching application text.

Concurrent cold requests may arrive before the first write is available. Anthropic documents that reuse becomes available after the first response begins. When a shared burst justifies warm-up, one initial request can establish the prefix before fan-out; warm-up itself has a cost.

## Where Caching Fails

| Symptom | Likely cause | Diagnostic or correction |
| --- | --- | --- |
| No reads and no writes | Prefix below the minimum, unsupported model/path, or missing cache controls | Model and hosting-route eligibility determine whether the prefix can be stored. |
| Writes on every call, few reads | Changing content before the selected point; volatile suffix repeatedly written | Section hashes and request structure reveal drift; a point before the first variable section preserves the stable prefix. |
| Only a small prefix hits | Later instructions, retrieved documents, tools, or settings differ | The earliest difference limits reuse; a nonzero read count can conceal a miss on the expensive shared material. |
| Repeat succeeds, append fails | Old message was edited rather than extended with a new message, or a previous cache point is no longer discoverable | Message/block boundaries can differ despite matching text; an eligible earlier point may preserve reuse. |
| Hits disappear after a pause | Retention expired | Request intervals show whether the entry expired and whether longer retention could pay. |
| Serial calls hit, parallel cold calls miss | Fan-out outran cache creation | First-response timing versus dependent-request start times reveals a warm-up race. |
| Application text matches but requests miss | Configuration drift, gateway transformation, different cache scope, or routing | Fixed model/route/settings isolate content changes; provider comparison diagnostics can expose hidden differences. |
| Hits drop after tool changes or compaction | A deliberate earlier-prefix change | The new prefix needs a fresh write; correctness and context quality justify some cold starts. |
| Coverage rises but cost or latency worsens | Padding, low-value writes, longer prompts, or a bottleneck outside prefill | Total billed cost, first-token latency, completion time, and answer quality determine whether the change helped. |

[OpenAI's cache diagnostics](https://developers.openai.com/api/docs/guides/prompt-caching/diagnostics) and [Anthropic's cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics) can help classify a mismatch between requests where supported. Diagnostics explain a comparison; reported cache-read usage establishes what was actually reused.

# Response Caching

A response cache stores the final answer in the application or an intermediary. A hit bypasses the model call, so it can save both input and output cost. The stored answer remains useful only while its inputs and permissions still justify returning it.

## Exact Matching

An exact response key covers the inputs that affect the answer: system instructions and prompt-template version, user query, relevant conversation history, selected evidence, generation model and settings, output schema, and any live or tool-derived facts. A request for a fresh variation also changes whether reuse is appropriate. Identical inputs permit reuse of an accepted answer; they do not imply that another model call would generate identical text.

For protected data, tenant and authorization context belong in the cache's scope or key. Rechecking access on a read prevents a previously authorized answer from surviving a permission revocation. Matching query text alone is insufficient when two callers have different permissions or when “what about next year?” refers to different conversation histories.

Exact caching works well for repeated FAQ-style requests with stable context. Prompt, evidence, model, or permission changes require invalidation or a new key. A TTL limits how long an entry survives, but does not prove it is still correct; known changes that affect correctness require invalidation even before expiry.

## Semantic Matching

Semantic response caching stores a query embedding alongside its answer. A new query is embedded and compared with cached queries; sufficiently close entries become candidates for reuse. Tenant, permissions, context, model, and freshness constraints still apply. Similarity is a candidate-selection rule, not a substitute for these checks.

Semantic similarity is a weak correctness test. “What is the largest lake in Africa?” and “What is the second largest lake in Africa?” are close in meaning but require different answers. Negation, dates, quantities, and entity changes can create the same problem. A loose threshold produces false hits; a tight one can remove most of the benefit. No universal similarity threshold guarantees that two questions share an answer.

A narrow domain with repeated paraphrases and a low cost of occasional mistakes offers the clearest opportunity. Thresholds need calibration against held-out queries from the actual domain, including similar questions that require different answers. Where a wrong reused answer is unacceptable, similarity alone is insufficient to authorize reuse; an additional reliable validity check or a cache miss is necessary.

False-hit rate belongs alongside hit rate. A cache that frequently answers from storage can still make the system worse if nearby questions receive the wrong answer. Changes to the embedding model or similarity metric require rebuilding or versioning the semantic index and re-evaluating its threshold.

# Combining and Measuring Caches

An application can check a response cache first. On a miss, it calls the model with a stable prompt prefix, which may then receive a provider prompt-cache hit. A response hit avoids that provider call entirely. In RAG, checking responses after retrieval makes the selected evidence available for matching; checking before retrieval can save more work but requires another reliable way to establish evidence freshness and authorization.

The layers need separate measurements:

- **Response cache:** eligible requests, hit rate, lookup latency, invalidations, stale answers, and semantic false hits. Embedding and similarity-search cost counts against semantic-cache savings.
- **Prompt cache:** reported cached-input tokens, cache writes and reads, uncached input, and the provider's actual billing rules. A small matching prefix can register a hit while leaving most input uncached.
- **Whole request:** billed cost, time to first token or complete cached answer, total completion time, and answer quality, measured across representative traffic.

Provider prompt-cache usage covers only requests that reach the provider. A successful response cache changes that traffic mix, so its gains cannot be inferred from provider hit percentages alone. Likewise, a higher prompt-cache hit rate does not justify longer irrelevant prompts or writes that are never reused.

# References

- [Prompt caching — OpenAI](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Prompt caching — Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [How GPT-5.6 fuses frontier intelligence with frontier efficiency — OpenAI, July 29, 2026](https://openai.com/index/gpt-5-6-frontier-intelligence-efficiency/)
- [Prompt caching across providers — Vercel, August 12, 2026](https://vercel.com/i/prompt-caching-across-providers)
- [GPT prompt caching: how to improve cache hit rates — Plori Engineering, updated August 25, 2026](https://plori.ai/blog/gpt-prompt-cache-hit-guide)
- [Cache-Aware Prompt Compression: A Two-Tier Cost Model for LLM API Caching — Yan Song, July 17, 2026](https://arxiv.org/abs/2607.15516)
- [Semantic caching — RedisVL](https://redis.io/docs/latest/develop/ai/redisvl/concepts/extensions/)
- [Semantic cache with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/gen-ai/semantic-cache)
