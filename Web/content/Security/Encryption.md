---
publish: true
created: 2026-08-20T20:41:15.668Z
modified: 2026-08-20T20:41:15.669Z
published: 2026-08-20T20:41:15.669Z
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

Encryption transforms plaintext into ciphertext under a key. The security boundary is the set of workloads and people able to obtain that key. Encryption alone targets confidentiality. Authenticated encryption also detects changes to ciphertext and authenticated metadata, but it does not attach a public identity to the sender. That requires a [[Security/Digital Signature|digital signature]] or a protocol with an authenticated peer.

# Symmetric, Public-Key, and Hybrid Cryptography

“Symmetric versus asymmetric” is not a security ranking. The mechanisms solve different operations, and a secure protocol normally composes them.

| Mechanism | Security property | Key relationship | Normal role | Critical failure |
| --- | --- | --- | --- | --- |
| AEAD, such as AES-GCM | Confidentiality plus integrity for plaintext and authenticated metadata | Sender and receiver share one secret key | Bulk records, streams, and envelope-encrypted data | Reusing a nonce with the same key can expose plaintext and enable forgery |
| Public-key encryption, such as RSA-OAEP | Confidentiality to the private-key holder | Encrypt with public key. Decrypt with private key | Small key material or protocol-specific payloads | Encrypting large data directly or using legacy padding |
| Digital signature, such as RSA-PSS, ECDSA, or Ed25519 | Integrity and authenticity under a public key | Sign with private key. Verify with public key | Software, tokens, certificates, and protocol messages | Trusting an unauthenticated public key or unapproved algorithm |
| Authenticated key agreement, such as signed ECDHE | Establishes a fresh shared secret and authenticates the exchange | Each side contributes ephemeral key material | Modern transport handshakes | Omitting peer authentication or transcript binding |

Authenticated-encryption APIs are the normal primitive for bulk data. With AES-GCM, the nonce and tag travel with the ciphertext and need not be secret. The nonce must be unique for each encryption under one key, and plaintext must not be released until tag verification succeeds.

```csharp
var key = RandomNumberGenerator.GetBytes(32);
var nonce = RandomNumberGenerator.GetBytes(12);
var plaintext = "tenant=42;balance=100"u8.ToArray();
var ciphertext = new byte[plaintext.Length];
var tag = new byte[16];

using var aes = new AesGcm(key, tag.Length);
aes.Encrypt(nonce, plaintext, ciphertext, tag);
```

The example generates a random 96-bit GCM nonce. Random nonces remain safe only within a bounded per-key invocation budget because collisions become more likely as use grows. High-volume systems normally let a reviewed protocol or cryptographic library own nonce construction and rekeying.

Hybrid or envelope encryption uses a random data-encryption key for the payload and protects that key with a key-encryption key or recipient public key. The payload stays on the symmetric path, while recipient changes and key rotation operate on small wrapped keys. Public-key cryptography does not remove key management: public keys still need authentication, private keys need protection, and retained ciphertext needs access to the matching old key version.

Algorithm agility means versioned ciphertext metadata, a controlled allow-list, and a tested migration path. Untrusted ciphertext may identify its version. It must not select any primitive installed on the machine.

# Hashing Is Not Encryption

Encryption is reversible with a decryption key. A cryptographic hash has no decryption operation, while Base64 is reversible without a secret. Confidentiality calls for encryption. Transport representation calls for encoding. Integrity needs an authenticated construction such as AEAD, HMAC, or a signature when an attacker can modify both data and metadata. Password verifiers need a purpose-built salted password-hashing scheme. [[Security/Password Storage|Password Storage]] explains how to select and migrate password hashes.

For integrity between parties sharing a secret, HMAC is the direct construction. A [[Security/Digital Signature|digital signature]] supports public verification and can contribute to attribution. It does not create non-repudiation alone: identity binding, key custody, compromise handling, timestamps, and audit evidence still connect the key to the claimed act. See [[Security/Hashing|Hashing]] for hash functions and HMAC.

# Encoding, Encryption, and Tokenization

| Operation | Purpose | Reversible by | Secret dependency | Breach boundary |
| --- | --- | --- | --- | --- |
| Encoding | Represent bytes for transport or syntax | Anyone who knows the encoding | None | The encoded value is the original data in another representation |
| Encryption | Hide plaintext and detect tampering when AEAD is used | A holder of the decryption key | Managed cryptographic key | Any workload with the key can recover the data |
| Tokenization | Replace a sensitive value with a surrogate | The token vault or authorized detokenization service | Vault mapping and service credentials | Consumers outside the vault can operate without the original value |

Base64 changes representation, encryption protects data only from workloads without the key, and tokenization keeps consumers outside the detokenization boundary. Token-vault availability, authorization, and audit become part of the design. [[Security/Sensitive Data|Sensitive Data]] shows how that boundary changes compliance scope.

# TLS — Encryption in Transit

TLS combines authenticated key agreement with symmetric record protection. In the normal certificate-based TLS 1.3 handshake on the public web, an ephemeral (EC)DHE exchange establishes fresh traffic secrets, the server authenticates the handshake transcript with a certificate signature, and an AEAD cipher protects application records. TLS 1.3 also defines PSK-only modes that omit certificate authentication and can omit (EC)DHE. Their peer authentication and forward-secrecy properties depend on the selected PSK mode. The protocol does not send an AES session key encrypted by the certificate's RSA key.

In .NET, `HttpClient` negotiates TLS for HTTPS endpoints. An ASP.NET Core deployment configures its HTTPS listener in Kestrel or terminates TLS at a trusted reverse proxy. `UseHttpsRedirection()` can redirect HTTP requests, while `UseHsts()` tells supporting browsers to prefer HTTPS on future visits; neither middleware creates the TLS listener.

# Pitfalls

**Nonce reuse with AES-GCM:** repeating a nonce under the same key reuses the counter-mode keystream and can enable authentication forgeries. Nonce allocation and the per-key invocation limit need one owner.

**Key management:** compromise usually enters through key access, backup, rotation, or accidental logging rather than AES itself. Keys belong in a managed key service or a platform facility such as .NET Data Protection, with explicit access and retention policy.

**Custom constructions:** individual primitives do not supply a secure protocol. Maintained platform APIs or reviewed libraries carry encoding, nonce, tag, and validation behavior that ad hoc combinations often miss.

# Tradeoffs

- For stored application data, use envelope encryption with an AEAD data key and a managed key-encryption key. This adds wrapped-key metadata and a key-service dependency in exchange for scoped rotation.
- For transport, use a current TLS implementation. Choosing raw RSA, ECDH, and AES calls does not recreate the protocol's certificate validation, transcript authentication, downgrade protection, or key schedule.
- For public verification, use a signature. For two parties that already share a secret, HMAC is simpler but either party can generate a valid tag.
- For deterministic lookup, encryption is usually the wrong primitive: equality leakage and nonce constraints require a design specific to the field and threat model.

# Questions

> [!QUESTION]- How are symmetric and asymmetric cryptography used together in a real system?
> Symmetric authenticated encryption handles bulk data because it is efficient and protects both confidentiality and integrity. Public-key encryption is limited to the small payloads and protocols it was designed for. Signatures provide public verification, while authenticated key agreement establishes a fresh shared secret. Protocols such as TLS and envelope encryption combine these roles instead of choosing one family for the whole job.

# References

- [TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [NIST Cryptographic Standards and Guidelines](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)
- [Cryptography in .NET](https://learn.microsoft.com/dotnet/standard/security/cryptography-model)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
