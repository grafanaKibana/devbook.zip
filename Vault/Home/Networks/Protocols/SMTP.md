---
topic:
  - Networks
subtopic:
  - Protocols
summary: "The standard TCP protocol for sending email between servers and from clients."
level:
  - "3"
priority: Low
status: Ready to Repeat
publish: true
---

SMTP is the transfer protocol for sending outbound mail from clients and between servers. It is not mailbox retrieval (IMAP/POP3); those are separate protocols.

# Flow and Boundaries

A common path is:

```text
Alice client -> Alice SMTP submission server -> DNS MX lookup -> Bob SMTP server -> Bob mailbox
```

Submission is usually authenticated and policy-enforced. The server enqueues durably before or during remote transfer depending on internal architecture.

SMTP response classes:

- `4xx`: transient; retry semantics may apply
- `5xx`: typically non-retryable for that recipient
- `250`: accepted for submission policy, not guaranteed final delivery

Timeouts are ambiguous: a server can accept a message then drop the response, so duplicate detection must exist.

![[Networks/Networks-SMTP-18120000.jpg]]

# Email Authentication

Email has two sender identities. The SMTP envelope sender (`MAIL FROM`, later exposed as Return-Path) receives bounces; the message's header `From` is what users see. SPF authenticates infrastructure for the envelope identity, DKIM authenticates signed message fields for a signing domain, and DMARC asks whether at least one passing identity aligns with the header From domain.

SMTP authentication is layered:

| Control | Verifies | Does not prove |
|---|---|---|
| SPF | Connecting IP is authorized by the envelope domain's policy | Message integrity or visible From alignment by itself |
| DKIM | Signed headers/body hash validate under the selector/domain public key | The signer is the visible From domain unless alignment holds |
| DMARC | Passing SPF or DKIM aligns with the header From domain | Inbox placement, harmless content, or a trustworthy sender |

Alignment compares organizational domains in relaxed mode and exact domains in strict mode. A third-party sender can pass its own SPF while failing DMARC for `From: billing@example.com` unless the envelope domain aligns or it signs with an aligned `d=example.com` DKIM identity.

```text
MAIL FROM:<bounce@mailer.example.net>   SPF passes for example.net
From: Billing <billing@example.com>     visible domain is example.com
DKIM-Signature: d=example.com; s=mail   aligned DKIM passes
DMARC: pass through DKIM alignment
```

Roll authentication out as an observed migration:

1. Inventory every legitimate sender and bounce domain.
2. Publish the narrowest SPF policy that covers them; avoid exceeding the SPF DNS-lookup limit.
3. Enable DKIM with managed key rotation and an aligned signing domain.
4. Publish DMARC with reporting and `p=none` while validating coverage.
5. Move toward quarantine or reject only after reports show legitimate streams align.
6. Monitor forwarding and mailing-list behavior; DKIM can survive forwarding when signed fields remain intact, while SPF commonly evaluates the forwarder's IP.

Receiver requirements are not universal. Providers publish different requirements for personal mail, bulk senders, and high-volume traffic, and those policies change. Treat the strictest important receiver as a deployment requirement and verify its current primary documentation. Authentication is necessary for many sending programs but still competes with reputation, complaint rate, content, list hygiene, and unsubscribe handling.

# .NET Sending: Direct Protocol vs Provider APIs

`System.Net.Mail.SmtpClient` is usable but legacy; it is not Microsoft-recommended for new systems that need modern reliability.

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

Do not keep passwords in code or configuration files. Prefer short-lived tokens or a secret store, validate the server certificate, and set connect/send timeouts at the application boundary.

## Submission and acceptance contract

An SMTP `250` after DATA means the receiving submission server accepted responsibility under its policy; it does not mean the recipient read the message or that another domain accepted it. HTTP `202 Accepted` only means a provider accepted the request for processing. It proves durable queueing only when that provider's documented contract says so, and it never proves final delivery.

Persist an outbox row in the same transaction as the business state that requires the email. A worker sends it, records the provider/message ID, and retries transient failures with a bounded schedule. Because a timeout can occur after acceptance, retries can duplicate messages; use a stable application notification ID and provider idempotency support where available.

Process delivery events as untrusted, duplicate-prone input. Verify webhook signatures, deduplicate event IDs, and update suppressions for hard bounces, complaints, and unsubscribes before the next send.

Compare approaches:

| Approach | Strong fit | Cost |
|---|---|---|
| Direct SMTP with MailKit | Full protocol control and internal infrastructure | Higher operational burden |
| Managed provider API | Deliverability, suppression, bounces, complaints workflows | Vendor dependency and data residency contract |

Choose from delivery and compliance requirements rather than assuming one path for every production system.

# Operational Notes

- `System.Net.Mail.SmtpClient` can work for simple internal scenarios but misses modern transport-control expectations.
- For high-volume sending, managed platforms often simplify deliverability and event-driven suppression.

# Questions

> [!QUESTION]- Why does SPF/DKIM/DMARC improve delivery but not guarantee it?
> They verify different authenticity and alignment properties, but inbox placement still depends on reputation, engagement, anti-abuse decisions, and content quality.

# References

- [SMTP (RFC 5321)](https://www.rfc-editor.org/rfc/rfc5321) — protocol commands, response model, and delivery contracts.
- [Message Submission (RFC 6409)](https://www.rfc-editor.org/rfc/rfc6409) — authenticated submission boundary.
- [Sender Policy Framework (RFC 7208)](https://www.rfc-editor.org/rfc/rfc7208) — SPF policy and operational limits.
- [DKIM (RFC 6376)](https://www.rfc-editor.org/rfc/rfc6376) — signing and verification model.
- [DMARC (RFC 7489)](https://www.rfc-editor.org/rfc/rfc7489) — alignment and policy.
- [MailKit](https://github.com/jstedfast/MailKit) — maintained SMTP/IMAP/POP3/MIME implementation.
- [Gmail email sender guidelines](https://support.google.com/a/answer/81126) — receiver-specific authentication and bulk-sender requirements that must be rechecked before rollout.
- [SmtpClient remarks](https://learn.microsoft.com/dotnet/api/system.net.mail.smtpclient#remarks) — official statement that `SmtpClient` is usable but not recommended for new development.
