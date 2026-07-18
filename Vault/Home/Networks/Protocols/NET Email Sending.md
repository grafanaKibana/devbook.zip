---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Sending email from .NET through direct SMTP or provider APIs with durable submission and delivery feedback."
level:
  - "3"
priority: Medium
status: Creation
publish: false
---

# Intro

.NET can submit mail directly over [[SMTP]] or call a managed provider API. The API choice is smaller than the operating contract: durable enqueue before acknowledging the business action, stable message identity, bounded retry, bounce and complaint processing, suppression, and [[Email Authentication|domain authentication]].

## Client Choice

`System.Net.Mail.SmtpClient` is still usable; it is not marked obsolete. Microsoft does not recommend it for new development because it does not support many modern protocols and operational patterns. Use a maintained client such as MailKit when direct SMTP is required.

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

## Submission Contract

An SMTP `250` after DATA means the receiving submission server accepted responsibility under its policy; it does not mean the recipient read the message or that another domain accepted it. HTTP `202 Accepted` only means the provider accepted the request for processing. It proves durable queueing only when that provider's documented contract says so, and it never proves final delivery.

Persist an outbox row in the same transaction as the business state that requires the email. A worker sends it, records the provider/message ID, and retries transient failures with a bounded schedule. Because a timeout can occur after acceptance, retries can duplicate messages; use a stable application notification ID and provider idempotency support where available.

Process delivery events as untrusted, duplicate-prone input. Verify webhook signatures, deduplicate event IDs, and update suppressions for hard bounces, complaints, and unsubscribes before the next send.

## Direct SMTP versus Provider API

| Approach | Strong fit | Cost |
| --- | --- | --- |
| Direct SMTP with MailKit | Controlled relay, internal mail, protocol-level integration | Operate credentials, retry, reputation, bounces, complaints, and suppression |
| Managed provider API | External transactional or bulk email with delivery events | Vendor contract, cost, data residency, API-specific retry and idempotency |

Choose from delivery and compliance requirements rather than assuming one path for every production system.

## References

- [SmtpClient remarks](https://learn.microsoft.com/dotnet/api/system.net.mail.smtpclient#remarks) — official statement that `SmtpClient` is usable but not recommended for new development.
- [MailKit](https://github.com/jstedfast/MailKit) — maintained .NET mail protocols, MIME, TLS, and authentication implementation.
- [Message Submission (RFC 6409)](https://www.rfc-editor.org/rfc/rfc6409) — distinguishes authenticated client submission from server-to-server relay.
