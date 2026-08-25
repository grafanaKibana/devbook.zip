---
publish: true
created: 2026-08-20T20:41:15.634Z
modified: 2026-08-25T13:45:27.882Z
published: 2026-08-25T13:45:27.882Z
topic:
  - Networks
subtopic:
  - Protocols
summary: The standard TCP protocol for sending email between servers and from clients.
level:
  - "3"
priority: Low
status: Ready to Repeat
---

SMTP moves outbound mail into a submission service and relays it between mail servers. IMAP and POP3 solve a different problem: reading messages already stored in a mailbox.

# Flow and Boundaries

A common path is:

```text
Alice client -> Alice SMTP submission server -> DNS MX lookup -> Bob SMTP server -> Bob mailbox
```

Submission normally authenticates the sender and applies local policy. The submission service may queue the message before attempting remote delivery, but durability is a property of that service's contract rather than SMTP acceptance in general.

SMTP response classes:

- `4xx` means the requested action failed temporarily. The sending system can retry under a bounded schedule.
- `5xx` means the request failed permanently in the current form, often for one recipient rather than the whole message.
- `250` means the command succeeded at that SMTP hop. It does not prove final delivery or inbox placement.

A timeout leaves the sender uncertain. The remote server may have accepted the message and lost only the response, so a retry can create a duplicate.

![[Assets/Networks/Networks-SMTP-18120000.jpg|theme-aware]]

# Email Authentication

Email carries separate transport and author identities. The SMTP envelope sender (`MAIL FROM`, commonly recorded in `Return-Path` at final delivery) receives delivery failures. The header `From` identifies the author shown to the reader. SPF evaluates whether the connecting infrastructure is authorized for the envelope identity. DKIM verifies signed message content for a signing domain. DMARC then checks whether a passing SPF or DKIM domain aligns with the header `From` domain.

SMTP authentication is layered:

| Control | Verifies | Does not prove |
|---|---|---|
| SPF | Connecting IP is authorized by the envelope domain's policy | Message integrity or visible From alignment by itself |
| DKIM | Signed headers/body hash validate under the selector/domain public key | The signer is the visible From domain unless alignment holds |
| DMARC | Passing SPF or DKIM aligns with the header From domain | Inbox placement, harmless content, or a trustworthy sender |

Relaxed alignment compares organizational domains. Strict alignment requires an exact domain match. A third-party service can pass SPF for its own bounce domain and still fail DMARC for `From: billing@example.com`. An aligned envelope domain or an aligned `d=example.com` DKIM signature closes that gap.

```text
MAIL FROM:<bounce@mailer.example.net>   SPF passes for example.net
From: Billing <billing@example.com>     visible domain is example.com
DKIM-Signature: d=example.com; s=mail   aligned DKIM passes
DMARC: pass through DKIM alignment
```

Authentication changes should be observable and reversible:

1. Inventory every legitimate sender and bounce domain.
2. Publish the narrowest SPF policy that covers them. Avoid exceeding the SPF DNS-lookup limit.
3. Enable DKIM with managed key rotation and an aligned signing domain.
4. Publish DMARC with reporting and `p=none` while validating coverage.
5. General-purpose domains whose users may send through mailing lists SHOULD NOT publish `p=reject`. RFC 9989 documents the resulting indirect-mail failures. A dedicated transactional subdomain can move toward enforcement only after every legitimate source aligns and reports show the expected impact.
6. Monitor forwarding and mailing-list behavior. DKIM can survive forwarding when signed fields remain intact, while SPF commonly evaluates the forwarder's IP.

Receiver rules differ and change outside the SMTP standard. Gmail, for example, applies extra authentication requirements to high-volume senders and requires one-click unsubscribe for bulk marketing or subscribed messages in that category. Production rollout therefore follows the strictest important receiver's current documentation. Passing authentication still does not guarantee placement. Reputation, complaint rate, and recipient behavior remain inputs to filtering.

# .NET Sending: Direct Protocol Vs Provider APIs

`System.Net.Mail.SmtpClient` remains available, but Microsoft does not recommend it for new development. MailKit exposes modern SMTP authentication and transport controls while preserving direct protocol access.

```csharp
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

var message = new MimeMessage();
message.From.Add(MailboxAddress.Parse("billing@example.com"));
message.To.Add(MailboxAddress.Parse("customer@example.net"));
message.Subject = "Invoice ready";
message.Body = new TextPart("plain") { Text = "Invoice 1842 is ready." };

using var client = new SmtpClient();
await client.ConnectAsync("smtp.example.com", 587, SecureSocketOptions.StartTls, ct);
var oauth2 = new SaslMechanismOAuth2(userName, accessToken);
await client.AuthenticateAsync(oauth2, ct);
await client.SendAsync(message, ct);
await client.DisconnectAsync(true, ct);
```

Credentials belong in a secret store or short-lived token flow. The client must validate the server certificate and enforce connect and send deadlines at the application boundary.

## Submission and Acceptance Contract

An SMTP `250` after DATA means that hop accepted the message under its policy. It does not mean the recipient read it, and it may not mean another domain accepted it. An HTTP provider's `202 Accepted` has the same boundary: processing has started. Durable queueing exists only when the provider documents it.

Persist an outbox row in the transaction that creates the business obligation to send mail. A worker records the provider or message ID and retries transient failures on a bounded schedule. A stable notification ID and provider idempotency support reduce duplicates after ambiguous timeouts.

Process delivery events as untrusted, duplicate-prone input. Verify webhook signatures, deduplicate event IDs, and update suppressions for hard bounces, complaints, and unsubscribes before the next send.

Compare approaches:

| Approach | Strong fit | Cost |
|---|---|---|
| Direct SMTP with MailKit | Full protocol control and internal infrastructure | Higher operational burden |
| Managed provider API | Deliverability, suppression, bounces, complaints workflows | Vendor dependency and data residency contract |

The decision turns on operational ownership. Direct SMTP gives protocol control. A managed provider owns more deliverability machinery and exposes its own delivery contract.

# References

- [Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321)
- [Sender Policy Framework](https://www.rfc-editor.org/rfc/rfc7208)
- [DomainKeys Identified Mail Signatures](https://www.rfc-editor.org/rfc/rfc6376)
- [Domain-based Message Authentication, Reporting, and Conformance](https://www.rfc-editor.org/rfc/rfc9989)
- [MailKit](https://github.com/jstedfast/MailKit)
- [Gmail email sender guidelines](https://support.google.com/a/answer/81126)
