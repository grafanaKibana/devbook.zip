---
publish: true
created: 2026-07-11T21:48:33.493Z
modified: 2026-07-17T05:46:26.501Z
published: 2026-07-17T05:46:26.501Z
topic:
  - Security
subtopic:
  - Security
summary: Uses keys and authenticated cryptographic primitives to protect confidentiality and detect tampering.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Encryption

Encryption transforms readable data (plaintext) into ciphertext using a key. Only parties with the decryption key should recover it. Encryption by itself targets confidentiality; modern authenticated encryption also detects ciphertext or authenticated-metadata tampering. It does not attribute a message to a public identity—the job of a [[Security/Digital Signature|digital signature]]. In .NET, these operations live under `System.Security.Cryptography`.

## Symmetric, Public-Key, and Hybrid Cryptography

“Symmetric versus asymmetric” is not a security ranking. The mechanisms solve different operations, and a secure protocol normally composes them.

| Mechanism | Security property | Key relationship | Normal role | Critical failure |
| --- | --- | --- | --- | --- |
| AEAD, such as AES-GCM | Confidentiality plus integrity for plaintext and authenticated metadata | Sender and receiver share one secret key | Bulk records, streams, and envelope-encrypted data | Reusing a nonce with the same key can expose plaintext and enable forgery |
| Public-key encryption, such as RSA-OAEP | Confidentiality to the private-key holder | Encrypt with public key; decrypt with private key | Small key material or protocol-specific payloads | Encrypting large data directly or using legacy padding |
| Digital signature, such as RSA-PSS, ECDSA, or Ed25519 | Integrity and authenticity under a public key | Sign with private key; verify with public key | Software, tokens, certificates, and protocol messages | Trusting an unauthenticated public key or unapproved algorithm |
| Authenticated key agreement, such as signed ECDHE | Establishes a fresh shared secret and authenticates the exchange | Each side contributes ephemeral key material | Modern transport handshakes | Omitting peer authentication or transcript binding |

Use an authenticated-encryption API for bulk data. With AES-GCM, store the nonce and authentication tag with the ciphertext; they are not secrets. The nonce must be unique for every encryption under a given key.

```csharp
var key = RandomNumberGenerator.GetBytes(32);
var nonce = RandomNumberGenerator.GetBytes(12);
var plaintext = "tenant=42;balance=100"u8.ToArray();
var ciphertext = new byte[plaintext.Length];
var tag = new byte[16];

using var aes = new AesGcm(key, tag.Length);
aes.Encrypt(nonce, plaintext, ciphertext, tag);
```

Hybrid or envelope encryption uses a random data-encryption key for the payload and protects that key with a key-encryption key or recipient public key. The payload stays on the fast symmetric path, while recipients and rotation operate on small wrapped keys. Public-key cryptography does not remove key management: the system still has to authenticate public keys, protect private keys, and preserve old decryption keys for retained ciphertext. Algorithm agility requires versioned ciphertext metadata, an approved-algorithm policy, and a tested migration path; it must not let untrusted input select any installed primitive.

## Hashing Is Not Encryption

Encryption is reversible with a decryption key; a cryptographic hash is one-way, and encoding such as Base64 is reversible without any secret. Pick by intent: confidentiality → encryption; integrity or fingerprinting → hashing; transport representation → encoding. Password verifiers need a purpose-built, salted password-hashing scheme rather than encryption or a fast general-purpose hash; [[Security/Password Storage|Password Storage]] covers the algorithms and migration policy.

For integrity between parties sharing a secret, use an **HMAC** (keyed hash). A [[Security/Digital Signature|digital signature]] can support attribution, but cryptography alone does not provide non-repudiation: the system also needs authenticated identity, evidenced key custody, compromise and revocation handling, trustworthy timestamps and audit records, and legal or operational procedures that connect the signing key to the claimed act. See [[Security/Hashing|Hashing]] for hash functions and HMAC.

## Encoding, Encryption, and Tokenization

| Operation | Purpose | Reversible by | Secret dependency | Breach boundary |
| --- | --- | --- | --- | --- |
| Encoding | Represent bytes for transport or syntax | Anyone who knows the encoding | None | The encoded value is the original data in another representation |
| Encryption | Hide plaintext and detect tampering when AEAD is used | A holder of the decryption key | Managed cryptographic key | Any workload with the key can recover the data |
| Tokenization | Replace a sensitive value with a surrogate | The token vault or authorized detokenization service | Vault mapping and service credentials | Consumers outside the vault can operate without the original value |

Base64 changes representation, encryption protects data only from workloads without the key, and tokenization keeps consumers outside the detokenization boundary. Token-vault availability, authorization, and audit become part of the design; [[Security/Sensitive Data|Sensitive Data]] covers the resulting scope decision.

## TLS — Encryption in Transit

TLS combines authenticated key agreement with symmetric record protection. In the normal certificate-based TLS 1.3 handshake on the public web, an ephemeral (EC)DHE exchange establishes fresh traffic secrets, the server authenticates the handshake transcript with a certificate signature, and an AEAD cipher protects application records. TLS 1.3 also defines PSK-only modes that omit certificate authentication and can omit (EC)DHE; their peer authentication and forward-secrecy properties depend on the selected PSK mode. The protocol does not send an AES session key encrypted by the certificate's RSA key.

In .NET, TLS is handled automatically by `HttpClient` and ASP.NET Core. Enforce HTTPS with `app.UseHttpsRedirection()` and `app.UseHsts()`.

## Pitfalls

**Nonce reuse with AES-GCM**: Reusing a nonce with the same key in GCM mode completely breaks confidentiality and authentication. Always generate a fresh random nonce for each encryption operation.

**Key management**: The hardest part of encryption is not the algorithm — it is key storage and rotation. Never hardcode keys. Use Azure Key Vault, AWS KMS, or .NET Data Protection API for key management.

**Rolling your own crypto**: Do not implement cryptographic algorithms yourself. Use `System.Security.Cryptography` or a well-audited library (libsodium via NSec). Custom implementations almost always have subtle vulnerabilities.

## Tradeoffs

- For stored application data, use envelope encryption with an AEAD data key and a managed key-encryption key. This adds wrapped-key metadata and a key-service dependency in exchange for scoped rotation.
- For transport, use a current TLS implementation. Choosing raw RSA, ECDH, and AES calls does not recreate the protocol's certificate validation, transcript authentication, downgrade protection, or key schedule.
- For public verification, use a signature. For two parties that already share a secret, HMAC is simpler but either party can generate a valid tag.
- For deterministic lookup, encryption is usually the wrong primitive: equality leakage and nonce constraints require a design specific to the field and threat model.

## Questions

> [!QUESTION]- When should you use symmetric vs asymmetric encryption?
> Use symmetric authenticated encryption for bulk data. Use a public-key encryption scheme only for the small payload and protocol it was designed for, a signature scheme for public verification, and authenticated key agreement to establish fresh shared secrets. Real systems compose these through protocols such as TLS or envelope encryption rather than choosing one family for the whole job.

> [!QUESTION]- What is envelope encryption and when is it used?
> Envelope encryption uses two keys: a Data Encryption Key (DEK) encrypts the data; a Key Encryption Key (KEK) encrypts the DEK. The encrypted DEK is stored alongside the ciphertext. The KEK lives in a key management service (Azure Key Vault, AWS KMS) and never leaves it. This pattern is used in cloud storage (Azure Blob Storage, S3 server-side encryption) and allows key rotation without re-encrypting all data — you only re-encrypt the DEK.

## References

- [ByteByteGo — Symmetric vs Asymmetric Encryption](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/symmetric-encryption-vs-asymmetric-encryption.md) — the pinned comparison source, corrected here to separate primitives from protocols and remove the security ranking.
- [ByteByteGo — Encoding vs Encryption vs Tokenization](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/encoding-vs-encryption-vs-tokenization.md) — the pinned decision source; its misleading encoding visual is intentionally not reused.
- [RFC 8446 — TLS 1.3](https://datatracker.ietf.org/doc/html/rfc8446) — the authenticated handshake and AEAD record protocol.
- [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines) — authoritative cryptographic standards; covers AES, RSA, ECDSA, and key management guidelines
- [Microsoft — Cryptography in .NET](https://learn.microsoft.com/en-us/dotnet/standard/security/cryptography-model) — .NET cryptography model; covers `System.Security.Cryptography` classes and best practices
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html) — practical guidance on algorithm selection, key management, and common mistakes
