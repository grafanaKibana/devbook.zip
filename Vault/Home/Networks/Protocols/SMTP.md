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

# Intro

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

## Relay, MX Lookup, Storage, and Retrieval

The compact path hides several independent acceptance boundaries:

1. Alice's client submits the message to her provider's message-submission agent over authenticated SMTP, normally port 587 with STARTTLS or port 465 with implicit TLS.
2. The submission service validates policy, adds trace headers, stores the message durably, and enqueues recipients before acknowledging success.
3. The sending mail transfer agent queries [[DNS]] for `company.com` MX records. Lower preference values are tried first; each MX hostname is then resolved to addresses.
4. It opens SMTP to the receiving domain, attempts recipients separately, and transfers message content only for accepted recipients.
5. The receiving boundary performs connection, reputation, SPF, DKIM, DMARC, spam, malware, and recipient-policy checks. Some checks happen before SMTP acceptance; others classify or quarantine after durable acceptance.
6. The receiving system commits the message to mailbox storage. Bob's client synchronizes that mailbox using IMAP, or retrieves it using POP3. SMTP does not provide mailbox reading.

![[System Design 101/422fcc82e0fee953f75cac96e0678fdb576821151928df2de6a00a1a5287a356.jpg]]

### Retry, Duplicates, and Bounces

A temporary `4xx` result leaves the message in the sender's durable queue for a later attempt; a permanent `5xx` result ends delivery for that recipient. Timeouts are ambiguous: the receiver may have committed the message before the response was lost, so retry can produce duplicates. SMTP has no global exactly-once transaction. Receivers and downstream processors use message IDs plus their own bounded deduplication, while clients must tolerate repeated delivery.

If delivery ultimately fails, the sending system generates a delivery status notification to the envelope sender. A null reverse path (`MAIL FROM:<>`) on the notification prevents bounce loops. Reject an unauthenticated message during the SMTP transaction when possible; accepting it and later bouncing to a forged sender creates backscatter.

The trust boundary is not "inside Gmail" or any one server box. Submission authentication establishes who may send through an outbound service; SPF authorizes sending infrastructure for the envelope domain; DKIM protects signed message fields; DMARC checks alignment with the visible From domain. The receiving provider still applies local spam and abuse policy after those checks pass.

## Sending Email in .NET

`System.Net.Mail.SmtpClient` remains usable, but Microsoft does not recommend it for new development because it lacks support for many modern protocols and operational patterns. Choose a maintained SMTP client such as MailKit for direct submission, or a managed provider API when bounce, complaint, suppression, and deliverability workflows matter. [[NET Email Sending]] owns the client and operations boundary.

## Email Authentication (SPF, DKIM, DMARC)

SPF authorizes sending infrastructure for an envelope domain, DKIM signs selected message fields, and DMARC evaluates alignment with the visible header From domain. Receiver requirements vary by provider, sender type, and volume; passing all three improves authentication but does not guarantee inbox placement. [[Email Authentication]] covers alignment, rollout, and receiver policy.

## Questions

> [!QUESTION]- Why does SMTP require SPF, DKIM, and DMARC for deliverability?
> SMTP does not authenticate the visible From identity by itself. SPF checks whether the connecting infrastructure is authorized for the envelope domain; DKIM validates signed fields; DMARC requires an aligned SPF or DKIM result for the header From domain and publishes policy/reporting. Exact enforcement varies by receiver and sending volume, and authentication success does not replace reputation or abuse controls.

## References

- [SMTP (RFC 5321)](https://www.rfc-editor.org/rfc/rfc5321) — the current SMTP specification; defines the protocol commands, response codes, and message format.
- [MailKit documentation](https://github.com/jstedfast/MailKit) — maintained .NET SMTP, IMAP, POP3, MIME, TLS, and OAuth2 implementation for direct mail protocols.
- [Email authentication (Cloudflare)](https://www.cloudflare.com/learning/email-security/dmarc-dkim-spf/) — practical explanation of SPF, DKIM, and DMARC with configuration examples.
- [Message Submission (RFC 6409)](https://www.rfc-editor.org/rfc/rfc6409) — separates authenticated client submission from server-to-server SMTP relay.
- [IMAP4rev2 (RFC 9051)](https://www.rfc-editor.org/rfc/rfc9051) — current mailbox synchronization protocol used after SMTP delivery.
- [POP3 (RFC 1939)](https://www.rfc-editor.org/rfc/rfc1939) — retrieval protocol for downloading mailbox messages.
- [ByteByteGo: Design Gmail](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/design-gmail.md) — source system trace bounded here by SMTP acceptance, durable queues, DNS routing, retrieval, and authentication checks.
