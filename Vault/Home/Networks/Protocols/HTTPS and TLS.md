---
topic:
  - Networks
subtopic:
  - Protocols
summary: "How TLS authenticates an HTTPS peer, establishes traffic keys, and constrains replay and downgrade."
level:
  - "3"
priority: High
status: Creation
publish: false
---

# Intro

HTTPS is [[HTTP]] carried through TLS. TLS authenticates the server certificate, establishes symmetric traffic keys, and protects HTTP bytes from undetected modification or passive reading. It does not authenticate the application user, make the origin trustworthy, or prevent an authorized endpoint from logging plaintext.

## TLS 1.3 Handshake

```text
ClientHello: versions, key share, cipher suites, SNI, ALPN
ServerHello: selected version, key share, cipher suite
[encrypted] EncryptedExtensions, Certificate, CertificateVerify, Finished
[encrypted] client Finished
application data
```

The ClientHello and ServerHello remain visible because they negotiate the shared secret and protocol. After ServerHello, handshake traffic keys protect the server certificate and most remaining handshake metadata. An observer can still infer endpoints, timing, sizes, and any unencrypted ClientHello fields; encrypted client hello is a separate deployment capability.

The client validates the certificate chain to a trusted root, the requested hostname against the leaf certificate's subject alternative names, the validity interval, and applicable revocation or policy signals. A successful handshake proves control of the certificate's private key under the client's trust policy, not ownership of a business identity.

## Resumption and 0-RTT

TLS 1.3 resumption can send early application data before the server has completed the new handshake. An attacker can replay captured 0-RTT data to another accepting server instance. The server must reject early data or restrict it to operations whose replay is harmless under the complete application contract.

HTTP method idempotency alone is insufficient. A repeated `GET` can consume a one-time token, emit an audit event, or trigger billing even though GET is defined as safe. Keep authentication, purchases, state transitions, and one-time links out of 0-RTT unless the application has explicit anti-replay state.

## HSTS and the First Visit

`Strict-Transport-Security` tells a browser that has received the header over valid HTTPS to rewrite future HTTP attempts to HTTPS for the stated `max-age`. `includeSubDomains` extends the policy, so enable it only when every covered host supports HTTPS.

HSTS cannot protect the first visit before the browser knows the policy. Browser preload lists close that gap for accepted domains, but preload is a long-lived operational commitment with removal delay. Redirect HTTP to HTTPS, send HSTS only over HTTPS, and treat preload readiness as a separate rollout gate.

## Interception Boundary

An enterprise or debugging proxy can inspect HTTPS only when the client trusts a CA controlled by that proxy. The proxy terminates one TLS connection and creates a second connection to the origin; the two connections have different traffic keys. Hostname validation succeeds because the proxy issues a matching leaf certificate from the installed root.

Treat trust-store modification as privileged configuration. Certificate pinning can narrow trust for controlled clients, but it increases rotation and recovery risk and is not a general browser defense.

## References

- [TLS 1.3 (RFC 8446)](https://www.rfc-editor.org/rfc/rfc8446) — defines handshake visibility, key establishment, certificate authentication, resumption, and early-data replay risk.
- [HTTP Strict Transport Security (RFC 6797)](https://www.rfc-editor.org/rfc/rfc6797) — defines learned HSTS policy and its bootstrap limitation.
- [Chromium HSTS preload submission](https://hstspreload.org/) — documents browser preload requirements, consequences, and removal process.
