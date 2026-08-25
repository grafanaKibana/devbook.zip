---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Five system designs compared through their ordering, state ownership, recovery, and scaling constraints."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

Start a system design with the fact the system cannot afford to lose. Chat must preserve conversation order. Collaborative editing must converge. A notification service needs an honest record of each policy decision and delivery attempt. Search must identify the content and serving decisions behind a result while indexes keep changing. Trading must admit and match orders in one deterministic sequence.

Queues, caches, and replicas can support those guarantees, but none of them defines the guarantee. That boundary comes first.

Use the same frame for each system:

| System | Ordering boundary | Durable authority | Recoverable edge |
| --- | --- | --- | --- |
| Chat | One sequence per conversation | Appended conversation events and device cursors | Connection and presence state |
| Collaborative editing | OT revision order or CRDT causal order | Revision history or CRDT state, plus recovery snapshots | Cursors, selections, and presence |
| Notifications | One intent expanded into channel attempts | Intent, policy decision, and attempt evidence | Provider routing and transient delivery |
| Search | Versioned ingestion and index publication | Canonical documents and index versions | Query caches and ranking experiments |
| Trading | One sequenced input stream per book partition | Input journal, checkpoints, and execution log | Market data, reporting, and analytics |

# Chat: Conversation Order and Device Cursors

A chat system is an ordered event store with a live delivery path attached. A WebSocket says where a device is connected. It says nothing about whether a message is durable, where it belongs in a conversation, or whether anyone displayed it.

The sender supplies a stable `client_message_id`. The conversation owner checks membership, assigns the next sequence number for that conversation, appends the event, and returns the stored ID. A retry with the same client ID returns the existing event.

```text
conversation_42: 1087  Alice  "ship it"      accepted
conversation_42: 1088  Bob    "deploying"    accepted
```

Ordering belongs to a conversation, not the entire service. A global sequence would coordinate unrelated chats and turn one counter into a bottleneck. Partition by conversation ID, let one owner assign its sequence numbers, and fence the previous owner when the partition moves.

# Delivery and Multi-Device Synchronization

Persist before fan-out. Online devices receive the event through their gateway. Offline devices receive a push wake-up and later pull after their last durable cursor. Keep the evidence separate:

- `accepted`: the server stored the event.
- `delivered`: one recipient device acknowledged receipt.
- `read`: the user advanced a read cursor.
- `push_submitted`: a push provider accepted a notification request.

A phone and laptop advance delivery independently, so each device needs its own cursor. The read position usually belongs to the user. On reconnect, a device requests `after_sequence=1084`, replays the missing events, and then rejoins the live stream.

![[Software Architecture/Software Architecture-System Design Examples-18120000-2.jpg|theme-aware]]

The topology leaves two hard questions open: who owns the partition, and where duplicates are suppressed. Presence stays outside that durable path. A heartbeat may renew `user_7/device_phone -> gateway_3` for 45 seconds, yet a short network pause can still make an online user appear offline. Presence can guide fan-out. Message existence cannot depend on it. Last-seen data also needs an explicit privacy policy.

# Collaborative Editing: Convergence Before Transport

Collaborative editors must converge concurrent changes while preserving intent. WebSockets make the exchange fast. The operation model decides whether every replica reaches the same document.

| Question | Centralized operational transformation | Sequence CRDT |
| --- | --- | --- |
| Ordering | Server establishes revisions and transforms stale operations | Operations carry identities or positions merged by CRDT rules |
| Offline work | Queued operations rebase on reconnect | Independently created operations merge with causal metadata |
| Metadata | Transformation history or sufficient revisions | Design-specific state or operation metadata. Some sequences retain identifiers or tombstones |
| Main risk | Incorrect transforms break convergence or intent | State growth, delivery assumptions, or difficult garbage collection |

Centralized OT fits an online service that already owns revision order and supports a bounded set of editing operations. A CRDT earns its cost when offline or peer-to-peer work is an actual requirement. The storage and transport cost depends on the design: state-based CRDTs exchange mergeable state, while operation-based CRDTs distribute operations under specific delivery assumptions. Some sequence CRDTs retain stable element identities or tombstones and eventually need compaction. Both choices still need permissions and recovery snapshots. Durable operation history is required only when the chosen protocol or recovery model depends on it.

Suppose revision 20 contains `cat`. Alice inserts `s` at position 0 while Bob deletes `t`, and both edits refer to revision 20. Applying the two integer offsets directly can target the wrong character. An OT server transforms the later operation against the accepted one. A sequence CRDT resolves the change through stable element identities. The service then broadcasts the canonical operations.

In an operation-submission design, each submission carries `document_id`, `actor_id`, `operation_id`, a causal base, and the payload. A unique `(document_id, operation_id)` constraint makes reconnect retries safe. Snapshots keep recovery bounded. Retain the history suffix required by supported clients. A client older than that suffix must rebootstrap from a snapshot before its pending edits are merged.

Presence, cursor position, and selection are ephemeral collaboration signals. Keep them outside durable document history, and enforce authorization again when a client reconnects.

# Notifications: Durable Intent and Policy

A notification service records an intent to communicate and the evidence collected while trying. It cannot promise that a person saw the message. Email, SMS, mobile push, and in-app delivery all expose different receipts and failure states.

Store `notification_id`, recipient, event type, locale, template version, data, priority, expiry, and a deduplication key. Resolve consent, quiet hours, suppression lists, and channel preferences before creating attempts. Check policy again when scheduled work becomes eligible. Consent may have changed while the intent waited.

```text
notification_73 ORDER_SHIPPED user_9 expires=18:00Z
  email attempt_1  provider_accepted
  push  attempt_2  token_unregistered
  inapp attempt_3  stored
```

# Intent, Policy, and Fan-Out

Separate queues by channel or priority when a slow provider could delay urgent work. Workers reuse a stable provider idempotency key where the provider supports one. Retry delays stop at the intent expiry, and permanent failures enter a dead-letter workflow with a named owner.

![[Software Architecture/Software Architecture-System Design Examples-18120000-1.png|theme-aware]]

A device token is a rotating route to one app installation. It is not the user's identity. Keep multiple tokens per user, remove one only after a documented terminal response, and never place provider credentials in a client. TTL answers whether a delayed push is still useful. Collapse identifiers replace obsolete provider messages. Deduplication of the business intent happens earlier.

Provider acceptance closes one state: the provider took the request. Device delivery, display, and user action remain separate evidence. Analytics must keep those states distinct and collect as little tracking data as the product can justify.

# Priority Fan-Out Case Study

![[Software Architecture/Software Architecture-System Design Examples-18120000.png|theme-aware]]

Netflix described an event-management layer feeding priority queues and processing clusters, with provider-specific adapters at the edge. That separation keeps a security or account event from waiting behind bulk recommendations. The diagram does not establish exactly-once delivery or document current product internals. Each adapter still needs explicit TTL, retry, receipt, and deduplication rules.

# Search: Versioned Acquisition and Retrieval

A search system separates acquisition from query serving. Crawling or ingestion finds content. Processing turns it into canonical documents and index terms. Serving retrieves candidates and ranks them. Freshness complicates traceability, while recall, latency, and index cost keep pulling on the same design.

# Crawl and Index Pipeline

A crawl frontier stores normalized URLs together with retry state and host-level pacing. Fetchers enforce access policy, content limits, and per-host budgets. Canonicalization removes fragments and folds known equivalents. A canonical tag is only evidence, though. It is not permission to discard content. Keep the raw fetch hash and chosen canonical ID so a duplicate decision can be explained later.

Document processing extracts text, language, fields, links, and security labels. An inverted index maps a term to postings:

```text
retry -> [(doc_7, title, 1), (doc_12, body, 4)]
```

Sharding by document ID usually spreads writes well. A query fans out to the relevant shards, and the coordinator merges each shard's local candidates into a distributed top-k. Replicas add read capacity and availability. During an index rollout, every response still needs to name the index version it actually used.

![[Software Architecture/Software Architecture-System Design Examples-18120000-5.png|theme-aware]]

At query time, normalize the query, apply versioned spelling or synonym rules, retrieve candidates, enforce access filters, and score the survivors. Record enough versioned context to explain the decision: index, query rules, ranking or model, features, authorization policy, and request scope. This is a traceability invariant, not a promise of byte-for-byte reproduction. A safe cache key binds every input that can change eligibility or ranking. Leaving one out can serve results across a policy boundary.

Measure retrieval separately from ranking. Recall asks whether relevant documents reached the candidate set. NDCG measures their order. Clicks carry position and presentation bias, so they cannot replace offline labels or controlled experiments.

Incremental indexing reduces freshness delay at the cost of small segments and constant merge work. Batch rebuilds are easy to reproduce and stale by construction. Many systems serve an immutable base index beside a small fresh tier, then compact the two on a slower cadence.

# Trading: Deterministic Admission and Matching

An exchange matching path makes one deterministic decision about order sequence. Risk checks, matching, execution IDs, and the authoritative book follow a strict protocol. Market data and reporting can consume the resulting execution stream asynchronously, as can analytics and surveillance.

# Order Lifecycle and Deterministic Sequencing

An accepted order carries the participant, instrument, side, type, price, quantity, client ID, and a stable client-order ID. Syntax and pre-trade limits are checked before sequencing. The sequencer assigns the next input number for one instrument partition, and the matching engine processes that stream without concurrent mutation of the same book.

```text
501 BUY  100 XYZ @ 42.10
502 SELL  40 XYZ @ 42.00  -> execution_9001, 40 @ 42.10
503 CANCEL order_501      -> remaining 60 removed
```

For a fixed input journal, engine version, and configuration, replay must reconstruct the same book and executions. Checkpoints shorten recovery, while the execution log records the decisions emitted by the live engine. Admission is idempotent: a reconnect retry with the same participant and client-order ID cannot create a second order.

![[Software Architecture/Software Architecture-System Design Examples-18120000-3.png|theme-aware]]

The visual separates the critical order path from market-data and reporting flows. Broker examples and component placement are illustrative. The venue protocol and operating rules define the actual participants and controls.

# Critical-Path Budget

Every network hop, serialization boundary, lock, and cache miss spends latency and adds jitter. A single-threaded matching loop can beat a shared concurrent book because it removes lock arbitration and fixes the mutation order. Collocated processes and memory-mapped transport cut transfer cost when one failure domain is acceptable.

![[Software Architecture/Software Architecture-System Design Examples-18120000-4.jpg|theme-aware]]

One physical host concentrates the availability and recovery risk. The durable artifacts are the input journal, replicated checkpoints or snapshots, and the execution log. Deterministic replay proves that a fixed journal, engine version, and configuration can reconstruct state. It does not prove operational recovery. Failover drills and recovery-under-load tests provide that evidence, backed by disciplined clocks and enough spare capacity. Blocking reporting or database writes stay off the matching loop, and acknowledgement never runs ahead of the durability guarantee the venue publishes.

# References

- [Matrix client-server specification](https://spec.matrix.org/latest/client-server-api/)
- [A comprehensive study of CRDTs](https://inria.hal.science/inria-00555588)
- [Firebase Cloud Messaging architecture](https://firebase.google.com/docs/cloud-messaging/fcm-architecture)
- [Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/)
- [Nasdaq TotalView-ITCH specification](https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/NQTVITCHSpecification.pdf)
- [FIX Trading Community standards](https://www.fixtrading.org/standards/)
