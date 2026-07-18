---
publish: true
created: 2026-07-16T14:07:20.847Z
modified: 2026-07-16T14:07:20.847Z
published: 2026-07-16T14:07:20.847Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Notification systems turn one durable intent into policy-controlled channel attempts with bounded retries and provider evidence.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Notification System

A notification system owns a durable communication intent, not a promise that a person saw a message. Email, SMS, mobile push, and in-app delivery expose different provider receipts and failure states. Normalize the intent, then preserve channel-specific evidence.

## Intent, Policy, and Fan-Out

Store `notification_id`, recipient, event type, locale, template version, data, priority, expiry, and deduplication key. Resolve consent, quiet hours, suppression lists, and channel preferences before creating channel attempts. Re-check policy when a scheduled notification becomes eligible because consent may have changed after enqueue.

```text
notification_73 ORDER_SHIPPED user_9 expires=18:00Z
  email attempt_1  provider_accepted
  push  attempt_2  token_unregistered
  inapp attempt_3  stored
```

One queue per channel or priority isolates slow SMS delivery from password-reset email. Workers use a stable provider idempotency key where supported, cap exponential backoff by the intent expiry, and move permanent failures to an owned dead-letter workflow.

![[Assets/System Design 101/97264dc591aef8addc6e2966867ee6da1d3b5a9f6c0793a278843fab044e5313.png]]

The visual maps the main boundaries. It does not define deduplication, consent timing, retry limits, or what a provider acknowledgement proves.

## Push Tokens and Receipts

Treat a device token as a rotating routing address scoped to an app installation, not a user identity. Keep multiple active tokens per user, remove tokens only from documented terminal responses, and never place provider credentials in a client application. TTL controls whether stale pushes remain useful; collapse identifiers let a provider replace obsolete updates, not deduplicate business operations.

Provider acceptance means the provider accepted the request. It does not prove device delivery, display, or user action. Product analytics must distinguish those states and minimize tracking data.

## Priority Fan-Out Case Study

![[Assets/System Design 101/45d7eec93eada432ea175e69f3bb1b41d90486031c35afa0916c43842cde54de.png]]

Netflix described an event-management layer feeding priority queues and processing clusters, then provider and device-specific adapters. The topology is useful when urgent security or account events must not wait behind bulk recommendations. It does not establish exactly-once delivery or current product internals; each adapter still needs TTL, retry, receipt, and deduplication rules.

The older source visual for device push remains rejected because it exposes obsolete Instance ID terminology and suggests unsafe credential placement.

## References

- [Firebase Cloud Messaging message lifecycle](https://firebase.google.com/docs/cloud-messaging/fcm-architecture) — official FCM transport roles, token routing, and message lifecycle boundaries.
- [Apple Push Notification service provider API](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server) — official token-based provider requests, device tokens, responses, and error handling.
- [Rapid event notification system at Netflix](https://netflixtechblog.com/rapid-event-notification-system-at-netflix-6deb1d2b57d1) — primary Netflix account of priority queues, processing clusters, and outbound adapters.
- [ByteByteGo: typical push notification system](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-a-typical-push-notification-system-work.md) — provenance for intent intake, policy resolution, channel routing, and analytics boundaries.
- [ByteByteGo: notifications to phones and PCs](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-are-notifications-pushed-to-our-phones-or-pcs.md) — provenance for provider routing; its obsolete visual is intentionally not used.
- [ByteByteGo: Netflix push messaging](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-netflix-scale-push-messaging-for-millions-of-devices.md) — provenance for the primary-verified priority fan-out case study.
