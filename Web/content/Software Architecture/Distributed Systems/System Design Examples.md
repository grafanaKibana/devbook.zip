---
publish: true
created: 2026-07-18T08:24:10.022Z
modified: 2026-07-18T11:59:15.671Z
published: 2026-07-18T11:59:15.671Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Five system designs compared through their ordering, state ownership, recovery, and scaling constraints.
level:
  - "4"
priority: High
status: Ready to Repeat
---

System design starts with the invariant that cannot be repaired after the fact. Chat needs per-conversation order, collaborative editing needs convergence, notifications need policy-controlled attempts, search needs reproducible retrieval under freshness pressure, and trading needs deterministic admission and matching. Generic queues, caches, and replicas help only after those boundaries are explicit.

Use the same frame for each system:

| System | Ordering boundary | Durable authority | Recoverable edge |
| --- | --- | --- | --- |
| Chat | One sequence per conversation | Appended conversation events and device cursors | Connection and presence state |
| Collaborative editing | OT revision order or CRDT causal order | Operation log plus snapshots | Cursors, selections, and presence |
| Notifications | One intent expanded into channel attempts | Intent, policy decision, and attempt evidence | Provider routing and transient delivery |
| Search | Versioned ingestion and index publication | Canonical documents and index versions | Query caches and ranking experiments |
| Trading | One sequenced input stream per book partition | Input journal, order book, and executions | Market data, reporting, and analytics |

# Chat: Conversation Order and Device Cursors

A chat system is an ordered event store with real-time delivery attached. A WebSocket tells the server where a device is connected; it does not make a message durable, establish conversation order, or prove display.

The sender supplies a stable `client_message_id`. The conversation owner validates membership, assigns a monotonically increasing sequence within that conversation, appends the event, and returns the stored ID. A retry with the same client ID returns the event already stored.

```text
conversation_42: 1087  Alice  "ship it"      accepted
conversation_42: 1088  Bob    "deploying"    accepted
```

Per-conversation order is usually sufficient. A global sequence coordinates unrelated chats and becomes a bottleneck. Partition by conversation ID, keep one ordering authority for a conversation at a time, and fence an old owner after reassignment.

# Delivery and Multi-Device Synchronization

Persist before fan-out. Online devices receive the event through their gateway; offline devices receive a push wake-up and later pull after their last durable cursor. Keep the evidence separate:

- `accepted`: the server stored the event;
- `delivered`: one recipient device acknowledged receipt;
- `read`: the user advanced a read cursor;
- `push_submitted`: a push provider accepted a notification request.

A user with a phone and laptop needs per-device delivery cursors but usually one user-level read position. On reconnect, request `after_sequence=1084`, replay the gap, then switch to live events.

![[Assets/Software Architecture/Software Architecture-System Design Examples-18120000-2.jpg]]

The topology does not define duplicate suppression or partition ownership. Presence remains soft state: a heartbeat can renew `user_7/device_phone -> gateway_3` for 45 seconds, but a network pause can make an online user look offline. Presence can guide fan-out; it cannot decide whether a message exists. Last-seen data also needs a privacy policy.

# Collaborative Editing: Convergence Before Transport

Collaborative editors must converge concurrent edits without losing user intent. WebSockets reduce latency, but the operation model creates convergence.

| Question | Centralized operational transformation | Sequence CRDT |
| --- | --- | --- |
| Ordering | Server establishes revisions and transforms stale operations | Operations carry identities or positions merged by CRDT rules |
| Offline work | Queued operations rebase on reconnect | Independently created operations merge with causal metadata |
| Metadata | Transformation history or sufficient revisions | Element identifiers, tombstones, and compaction metadata |
| Main risk | Incorrect transforms break convergence or intent | Metadata growth and difficult garbage collection |

Use centralized OT when one online service owns ordering and editing primitives are bounded. Use a CRDT when offline or peer-to-peer editing is a real requirement and the product can pay the metadata and compaction cost. Neither choice removes permissions, snapshots, or durability.

Suppose revision 20 contains `cat`. Alice inserts `s` at position 0 while Bob deletes `t`, both based on revision 20. Applying two raw integer offsets loses intent. The server transforms the second operation against the accepted first, or the CRDT resolves both through stable element identities, then broadcasts canonical operations.

Each submission carries `document_id`, `actor_id`, `operation_id`, causal base, and payload. A unique `(document_id, operation_id)` fence makes reconnect retries safe. Snapshots bound replay time, but the service retains the operation range needed by clients whose acknowledged revision predates the snapshot.

Presence, cursor position, and selection are ephemeral collaboration signals. Keep them outside durable document history, and enforce authorization again when a client reconnects.

# Notifications: Durable Intent and Policy

A notification system owns a durable communication intent, not a promise that a person saw a message. Email, SMS, mobile push, and in-app delivery expose different receipts and failures.

Store `notification_id`, recipient, event type, locale, template version, data, priority, expiry, and deduplication key. Resolve consent, quiet hours, suppression lists, and channel preferences before creating attempts. Re-check policy when a scheduled intent becomes eligible because consent may have changed after enqueue.

```text
notification_73 ORDER_SHIPPED user_9 expires=18:00Z
  email attempt_1  provider_accepted
  push  attempt_2  token_unregistered
  inapp attempt_3  stored
```

# Intent, Policy, and Fan-Out

Separate queues by channel or priority when one slow provider would block urgent work. Workers use stable provider idempotency keys where supported, cap exponential backoff by the intent expiry, and move permanent failures into an owned dead-letter workflow.

![[Assets/Software Architecture/Software Architecture-System Design Examples-18120000-1.png]]

Treat a device token as a rotating route scoped to one app installation, not a user identity. Keep multiple tokens per user, remove tokens only after documented terminal responses, and keep provider credentials out of clients. TTL decides whether stale pushes remain useful; collapse identifiers replace obsolete provider messages, not duplicate business intents.

Provider acceptance proves only that the provider accepted the request. It does not prove device delivery, display, or user action. Analytics must distinguish these states and minimize tracking data.

# Priority Fan-Out Case Study

![[Assets/Software Architecture/Software Architecture-System Design Examples-18120000.png]]

Netflix described an event-management layer feeding priority queues and processing clusters, followed by provider-specific adapters. The separation is useful when security or account events must not wait behind bulk recommendations. It does not establish exactly-once delivery or current product internals; every adapter still needs TTL, retry, receipt, and deduplication rules.

# Search: Versioned Acquisition and Retrieval

A search system separates acquisition from query serving. Crawling or ingestion discovers content; processing creates canonical documents and index terms; serving retrieves candidates and ranks them. Freshness, recall, latency, and index cost pull the design in different directions.

# Crawl and Index Pipeline

A crawl frontier stores normalized URLs with host-level politeness and retry state. Fetchers obey access policy, content limits, and per-host budgets. Canonicalization removes fragments and normalizes known equivalents, but a canonical tag is evidence rather than permission to discard content. Keep the raw fetch hash and chosen canonical ID so duplicate decisions remain auditable.

Document processing extracts text, language, fields, links, and security labels. An inverted index maps a term to postings:

```text
retry -> [(doc_7, title, 1), (doc_12, body, 4)]
```

Shard by document ID for balanced writes, query every relevant shard, and merge the local top candidates into a distributed top-k. Replicas add read capacity and availability; they do not remove the need to bind a response to a consistent index version during rollout.

![[Assets/Software Architecture/Software Architecture-System Design Examples-18120000-5.png]]

At query time, normalize the query, apply versioned spelling or synonym rules, retrieve candidates, enforce access filters, score, and return the index version. Cache only after tenant, locale, permissions, query rules, and index version are part of the key; otherwise cached results cross policy boundaries.

Evaluate retrieval separately from ranking. Recall asks whether relevant documents reached the candidate set; NDCG evaluates order. Clicks are biased by position and presentation, so offline labels and controlled experiments remain necessary.

Incremental indexing lowers freshness delay but creates small segments and merge work. Batch rebuilds are reproducible but stale. A common design combines an immutable base index with a small fresh tier, then compacts.

# Trading: Deterministic Admission and Matching

An exchange matching path must make one deterministic decision about order sequence. Risk checks, matching, execution IDs, and the authoritative book belong to a strict protocol. Market data, reporting, analytics, and surveillance consume the execution stream asynchronously.

# Order Lifecycle and Deterministic Sequencing

An accepted order carries participant, instrument, side, type, price, quantity, client ID, and a stable client-order ID. Validate syntax and pre-trade limits before the sequencer. The sequencer assigns a monotonically increasing input sequence for one instrument partition, and the matching engine processes that sequence without concurrent mutation of the same book.

```text
501 BUY  100 XYZ @ 42.10
502 SELL  40 XYZ @ 42.00  -> execution_9001, 40 @ 42.10
503 CANCEL order_501      -> remaining 60 removed
```

Replay the same input journal into the same engine version and configuration to reproduce the book and executions. Admission remains idempotent: a reconnect retry with the same participant and client-order ID cannot create a second order.

![[Assets/Software Architecture/Software Architecture-System Design Examples-18120000-3.png]]

The visual separates the critical order path from market-data and reporting flows. Broker examples and component placement are illustrative; the venue protocol and operating rules define the actual participants and controls.

# Critical-Path Budget

Every network hop, serialization boundary, lock, and cache miss spends latency and adds jitter. A single-threaded matching loop can outperform a shared concurrent book because it removes lock arbitration and makes order deterministic. Collocated processes and memory-mapped transport reduce transfer cost when one failure domain is acceptable.

![[Assets/Software Architecture/Software Architecture-System Design Examples-18120000-4.jpg]]

This topology is not universal. One physical host raises availability and recovery stakes. Durable input journaling, replicated recovery state, tested failover, clock discipline, capacity headroom, and deterministic replay remain necessary. Keep blocking reporting and database writes off the matching loop, but never acknowledge beyond the durability guarantee the venue publishes.

# References

## Primary sources

- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455) — framing, connection, ping/pong, and closing semantics used by chat and collaborative-editing channels.
- [RFC 8030: Generic Event Delivery Using HTTP Push](https://www.rfc-editor.org/rfc/rfc8030) — push subscriptions, TTL, acknowledgement, and delivery limitations.
- [Matrix client-server specification](https://spec.matrix.org/latest/client-server-api/) — room event ordering, synchronization tokens, receipts, and device state.
- [Jupiter collaboration system paper](https://doi.org/10.1145/289444.289469) — operational transformation for low-bandwidth, high-latency collaboration.
- [A comprehensive study of CRDTs](https://inria.hal.science/inria-00555588) — CRDT convergence properties and operation/state-based designs.
- [Firebase Cloud Messaging lifecycle](https://firebase.google.com/docs/cloud-messaging/fcm-architecture) — transport roles, token routing, and message lifecycle boundaries.
- [Apple Push Notification service provider API](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server) — provider requests, device tokens, responses, and errors.
- [Rapid event notification system at Netflix](https://netflixtechblog.com/rapid-event-notification-system-at-netflix-6deb1d2b57d1) — priority queues, processing clusters, and outbound adapters.
- [Google Search Central crawling documentation](https://developers.google.com/search/docs/crawling-indexing/overview) — discovery, fetching, rendering, indexing, and canonicalization boundaries.
- [Apache Lucene index file formats](https://lucene.apache.org/core/9_12_0/core/org/apache/lucene/codecs/lucene912/package-summary.html) — segment, postings, stored-field, and index metadata structures.
- [Introduction to Information Retrieval](https://nlp.stanford.edu/IR-book/) — inverted indexes, scoring, evaluation, and distributed retrieval.
- [Nasdaq TotalView-ITCH specification](https://www.nasdaqtrader.com/content/technicalsupport/specifications/dataproducts/NQTVITCHSpecification.pdf) — sequenced market-data messages and order-book events.
- [FIX Trading Community standards](https://www.fixtrading.org/standards/) — order, execution, session, and market-data protocols.
- [The LMAX Disruptor](https://lmax-exchange.github.io/disruptor/disruptor.html) — sequenced single-writer event processing and latency tradeoffs.

## Provenance

- [ByteByteGo: design a chat application](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-design-a-chat-application-like-whatsapp-facebook-messenger-or-discord.md) — gateway, sequencing, persistence, synchronization, presence, and push topology.
- [ByteByteGo: design Google Docs](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-to-design-google-docs.md) — client, WebSocket, queue, operation service, cache, and storage topology.
- [ByteByteGo: typical push notification system](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-a-typical-push-notification-system-work.md) — intent intake, policy resolution, channel routing, and analytics boundaries.
- [ByteByteGo: notifications to phones and PCs](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-are-notifications-pushed-to-our-phones-or-pcs.md) — provider routing evidence; its obsolete visual remains excluded.
- [ByteByteGo: Netflix push messaging](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-netflix-scale-push-messaging-for-millions-of-devices.md) — priority fan-out case-study provenance.
- [ByteByteGo: how search engines work](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-search-engines-work.md) — crawl, index, query, ranking, and feedback topology.
- [ByteByteGo: design a stock exchange](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/design-stock-exchange.md) — sequencer, matching, market-data, and reporting split.
- [ByteByteGo: low-latency stock exchange](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/low-latency-stock-exchange.md) — collocated application loop and memory-mapped transport case.
