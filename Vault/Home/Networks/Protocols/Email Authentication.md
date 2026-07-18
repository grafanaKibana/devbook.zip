---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Authenticating email domains with SPF, DKIM, and DMARC alignment without confusing authentication with deliverability."
level:
  - "3"
priority: Medium
status: Creation
publish: false
---

# Intro

Email has two sender identities. The SMTP envelope sender (`MAIL FROM`, later exposed as Return-Path) receives bounces; the message's header `From` is what users see. SPF authenticates infrastructure for the envelope identity, DKIM authenticates signed message fields for a signing domain, and DMARC asks whether at least one passing identity aligns with the header From domain.

## Mechanism

| Control | Verifies | Does not prove |
| --- | --- | --- |
| SPF | Connecting IP is authorized by the envelope domain's policy | Message content integrity or visible From alignment by itself |
| DKIM | Signed headers/body hash validate under the selector/domain public key | The signer is the visible From domain unless alignment holds |
| DMARC | Passing SPF or DKIM aligns with the header From domain | Inbox placement, harmless content, or a trustworthy sender |

Alignment compares organizational domains in relaxed mode and exact domains in strict mode. A third-party sender can pass its own SPF while failing DMARC for `From: billing@example.com` unless the envelope domain aligns or it signs with an aligned `d=example.com` DKIM identity.

```text
MAIL FROM:<bounce@mailer.example.net>   SPF passes for example.net
From: Billing <billing@example.com>     visible domain is example.com
DKIM-Signature: d=example.com; s=mail   aligned DKIM passes
DMARC: pass through DKIM alignment
```

## Rollout

1. Inventory every legitimate sender and bounce domain.
2. Publish the narrowest SPF policy that covers them; avoid exceeding the SPF DNS-lookup limit.
3. Enable DKIM with managed key rotation and an aligned signing domain.
4. Publish DMARC with reporting and `p=none` while validating coverage.
5. Move toward quarantine or reject only after reports show legitimate streams align.
6. Monitor forwarding and mailing-list behavior; DKIM can survive forwarding when signed fields remain intact, while SPF commonly evaluates the forwarder's IP.

Receiver requirements are not universal. Providers publish different requirements for personal mail, bulk senders, and high-volume traffic, and those policies change. Treat the strictest important receiver as a deployment requirement and verify its current primary documentation. Authentication is necessary for many sending programs but still competes with reputation, complaint rate, content, list hygiene, and unsubscribe handling.

## References

- [Sender Policy Framework (RFC 7208)](https://www.rfc-editor.org/rfc/rfc7208) — defines envelope identity authorization, DNS lookup limits, and SPF result semantics.
- [DomainKeys Identified Mail Signatures (RFC 6376)](https://www.rfc-editor.org/rfc/rfc6376) — defines DKIM signing, selectors, canonicalization, and verification.
- [DMARC (RFC 7489)](https://www.rfc-editor.org/rfc/rfc7489) — defines identifier alignment, policy, and aggregate/forensic reporting.
- [Gmail email sender guidelines](https://support.google.com/a/answer/81126) — current receiver-specific authentication and bulk-sender requirements; verify before rollout because provider policy can change.
