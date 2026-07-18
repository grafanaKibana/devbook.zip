---
publish: true
created: 2026-07-16T14:07:20.633Z
modified: 2026-07-16T17:34:23.417Z
published: 2026-07-16T17:34:23.417Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Collaborative editors converge concurrent operations through an explicit OT or CRDT model, durable history, and resumable synchronization.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

A collaborative editor must make concurrent edits converge without losing user intent. WebSockets reduce delivery latency, but convergence comes from the operation model. Store document operations durably, identify their causal base, and make retries idempotent.

## OT and CRDT Choose Different Costs

| Question | Centralized operational transformation | Sequence CRDT |
| --- | --- | --- |
| Ordering | Server establishes a revision order and transforms stale operations | Operations carry identities or positions that merge under the CRDT rules |
| Offline work | Requires rebasing queued operations when reconnecting | Can merge independently created operations when causal metadata is retained |
| Metadata | Transformation history or sufficient revisions | Per-element identifiers, tombstones, or compaction metadata |
| Main risk | Incorrect transform functions break convergence or intent | Metadata growth and complex garbage collection |

Use centralized OT when one online service owns ordering and the editing primitives are bounded. Use a CRDT when offline or peer-to-peer editing is a real requirement and the product can pay the metadata and compaction cost. Neither label removes the need for permissions, snapshots, or durability.

## Operation Log and Snapshot

Suppose revision 20 contains `cat`. Alice inserts `s` at position 0 while Bob deletes `t`, both based on revision 20. The server must not apply two raw integer offsets blindly. It transforms the second operation against the accepted first operation, or resolves both through the CRDT's stable element identities, then broadcasts the canonical operations.

Each submission carries `document_id`, `actor_id`, `operation_id`, causal base, and payload. A unique `(document_id, operation_id)` fence makes reconnect retries safe. Periodic snapshots bound replay time, but retain the operation range needed by clients whose last acknowledged revision predates the snapshot.

Transport and storage do not guarantee convergence; the chosen OT or CRDT algorithm defines how concurrent operations combine.

Presence, cursor position, and selection are ephemeral collaboration signals. Keep them outside the durable document history and enforce document authorization again when a client reconnects.

## References

- [Jupiter collaboration system paper](https://doi.org/10.1145/289444.289469) — primary operational-transformation design for low-bandwidth, high-latency collaborative editing.
- [A comprehensive study of CRDTs](https://inria.hal.science/inria-00555588) — primary CRDT model, convergence properties, and operation/state-based designs.
- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455) — transport framing and connection behavior used by interactive synchronization channels.
- [ByteByteGo: design Google Docs](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-to-design-google-docs.md) — provenance for the client, WebSocket, queue, operation-service, cache, and storage topology.
