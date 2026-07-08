---
publish: true
created: 2026-07-05T10:53:36.505+03:00
modified: 2026-07-05T10:53:37.362+03:00
---

# SMTP

SMTP (Simple Mail Transfer Protocol) is the standard protocol for sending email between mail servers and from email clients to mail servers. It operates over TCP, typically on port 25 (server-to-server), 587 (client submission with STARTTLS), or 465 (SMTPS, implicit TLS). SMTP handles delivery; reading email uses IMAP or POP3.

## How SMTP Works

An email from `alice@example.com` to `bob@company.com` follows this path:

```text
Alice's client → Alice's SMTP server (submission, port 587)
Alice's SMTP server → DNS MX lookup for company.com
Alice's SMTP server → Bob's SMTP server (port 25)
Bob's SMTP server → Bob's mailbox (IMAP/POP3 for retrieval)
```

The SMTP conversation is text-based:

```text
Client: EHLO mail.example.com
Server: 250-mail.company.com Hello
Client: MAIL FROM:<alice@example.com>
Server: 250 OK
Client: RCPT TO:<bob@company.com>
Server: 250 OK
Client: DATA
Server: 354 Start input
Client: Subject: Hello\r\n\r\nHi Bob!\r\n.
Server: 250 Message accepted
Client: QUIT
```

## Sending Email in .NET

For production use, prefer a managed email service (SendGrid, Mailgun, Azure Communication Services) over direct SMTP — they handle deliverability, bounce handling, and spam reputation.

For SMTP directly, use `MailKit` (the recommended .NET library; `System.Net.Mail.SmtpClient` is obsolete):

```csharp
using MailKit.Net.Smtp;
using MimeKit;

var message = new MimeMessage();
message.From.Add(new MailboxAddress("Alice", "alice@example.com"));
message.To.Add(new MailboxAddress("Bob", "bob@company.com"));
message.Subject = "Order Confirmation";
message.Body = new TextPart("plain") { Text = "Your order has been placed." };

using var client = new SmtpClient();
await client.ConnectAsync("smtp.example.com", 587, SecureSocketOptions.StartTls);
await client.AuthenticateAsync("alice@example.com", "password");
await client.SendAsync(message);
await client.DisconnectAsync(quit: true);
```

## Email Authentication (SPF, DKIM, DMARC)

Modern email delivery requires authentication records to avoid spam filters:

- **SPF** (Sender Policy Framework): DNS TXT record listing authorized sending IPs for a domain.
- **DKIM** (DomainKeys Identified Mail): cryptographic signature added to outgoing emails, verified by the recipient's server.
- **DMARC**: policy that tells receiving servers what to do when SPF/DKIM fail (quarantine, reject, or report).

Without these, emails from your domain will be marked as spam or rejected.

> [!IMPORTANT]
> **There are two "From" addresses, and the difference is the heart of email auth.** The **envelope sender** (`MAIL FROM`, also called Return-Path) is used at the SMTP layer for delivery and bounces; the **header From** is what the user sees in their client. SPF checks the _envelope_ sender, DKIM signs the _message_, and **DMARC requires "alignment"** — that the header-From domain matches the SPF/DKIM domain. This is why mail sent through a third party (newsletters, `noreply@` services) can pass SPF yet fail DMARC: the envelope domain is the provider's, not yours. Bounces (NDRs) go to the envelope sender, which is also how mailing lists avoid loops.

## Pitfalls

### Missing SPF/DKIM/DMARC

**What goes wrong**: emails from your domain land in spam or are rejected outright by major providers (Gmail, Outlook).

**Why it happens**: SMTP has no built-in sender authentication. Without SPF, DKIM, and DMARC, receiving servers cannot verify that your server is authorized to send for your domain.

**Mitigation**: configure all three DNS records before sending any production email. Use a managed email service (SendGrid, Mailgun, Azure Communication Services) — they handle authentication setup and maintain sender reputation.

### Using System.Net.Mail.SmtpClient

**What goes wrong**: `SmtpClient` does not support OAuth2, has poor async support, and is marked obsolete in .NET.

**Mitigation**: use MailKit for all new .NET email code. It supports SMTP, IMAP, POP3, OAuth2, and modern TLS.

## Tradeoffs

| Approach | Pros | Cons | Use when |
|---|---|---|---|
| Direct SMTP (MailKit) | Full control, no third-party dependency | You manage deliverability, bounce handling, spam reputation | Internal systems, low volume |
| Managed service (SendGrid, Mailgun) | Deliverability handled, analytics, bounce/unsubscribe management | Cost, vendor dependency | Production transactional email |
| Azure Communication Services | Azure-native, integrates with Azure Monitor | Azure lock-in | Azure-hosted systems |

**Decision rule**: use a managed email service for any production transactional email. Direct SMTP is only appropriate for internal notifications where deliverability to external inboxes is not required.

## Questions

> [!QUESTION]- Why does SMTP require SPF, DKIM, and DMARC for deliverability?
> SMTP has no built-in sender authentication — anyone can claim any From address. SPF restricts which IPs can send for a domain. DKIM adds a cryptographic signature that proves the message was not tampered with. DMARC tells receiving servers what to do when SPF/DKIM fail. Without all three, email from your domain will be marked as spam or rejected by major providers.

## References

- [SMTP (RFC 5321)](https://www.rfc-editor.org/rfc/rfc5321) — the current SMTP specification; defines the protocol commands, response codes, and message format.
- [MailKit documentation](https://github.com/jstedfast/MailKit) — the recommended .NET email library; supports SMTP, IMAP, POP3, MIME, and OAuth2 authentication. `System.Net.Mail.SmtpClient` is marked obsolete.
- [Email authentication (Cloudflare)](https://www.cloudflare.com/learning/email-security/dmarc-dkim-spf/) — practical explanation of SPF, DKIM, and DMARC with configuration examples.
