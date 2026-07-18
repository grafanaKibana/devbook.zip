---
publish: true
created: 2026-07-16T14:07:20.443Z
modified: 2026-07-16T17:34:23.749Z
published: 2026-07-16T17:34:23.749Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Chat systems durably order conversation events, synchronize devices, and treat presence and delivery as separate evidence.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

A chat system is an ordered event store with real-time delivery attached. A WebSocket tells the server where an online device is connected; it does not make the message durable, establish conversation order, or prove that another device displayed it. Store those facts separately.

## Durable Append and Conversation Order

The sender supplies a stable `client_message_id`. The conversation owner validates membership, assigns a monotonically increasing sequence within that conversation, appends the event, and returns the stored ID. A retry with the same client ID returns the existing event instead of creating another message.

```text
conversation_42: 1087  Alice  "ship it"      accepted
conversation_42: 1088  Bob    "deploying"    accepted
```

Ordering per conversation is usually enough. A global sequence would coordinate unrelated chats and become a throughput bottleneck. Partition by conversation ID, but keep one ordering authority for a conversation at a time and fence an old owner after reassignment.

## Delivery and Multi-Device Synchronization

Persist before fan-out. Online devices receive the event through their current gateway connection; offline devices receive a push wake-up and later pull events after their last durable cursor. Track separate evidence:

- `accepted`: the server stored the event;
- `delivered`: a recipient device acknowledged receipt;
- `read`: the user advanced a read cursor;
- `push_submitted`: a push provider accepted a notification request.

None implies the next. A user with a phone and laptop needs per-device delivery cursors but usually one user-level read position. Reconnect with `after_sequence=1084` and replay the gap before switching to live events.

![[Assets/System Design 101/af1396dad150982f48911cf4bdaf15397ea7c2fdb58a0ac0261942bc55929a41.jpg]]

The visual is a useful topology, not a delivery contract. The sequencing store must define duplicate suppression and partition ownership; presence is soft state; push is only an offline wake-up path.

## Presence Is Soft State

Presence expires unless refreshed. A gateway heartbeat can renew `user_7/device_phone -> gateway_3` for 45 seconds. A network pause can make an online user look offline, so presence may guide fan-out but must not decide whether a message exists. Last-seen timestamps also need a privacy policy and coarse visibility controls.

## References

- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455) — IETF framing, connection, ping/pong, and closing semantics for the real-time transport.
- [RFC 8030: Generic Event Delivery Using HTTP Push](https://www.rfc-editor.org/rfc/rfc8030) — IETF model for push subscriptions, TTL, acknowledgement, and delivery limitations.
- [Matrix client-server specification](https://spec.matrix.org/latest/client-server-api/) — open protocol definitions for room event ordering, synchronization tokens, receipts, and device state.
- [ByteByteGo: design a chat application](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-design-a-chat-application-like-whatsapp-facebook-messenger-or-discord.md) — provenance for the gateway, sequencing, persistence, synchronization, presence, and push topology.
