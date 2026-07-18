---
publish: true
created: 2026-07-11T21:48:29.585Z
modified: 2026-07-18T11:59:15.666Z
published: 2026-07-18T11:59:15.666Z
topic:
  - Security
subtopic:
  - Security
summary: Proves a message's authenticity and integrity without hiding its content.
level:
  - "2"
priority: Medium
status: Ready to Repeat
---

A digital signature proves that a message matches a private signing key (authenticity) and has not been modified since signing (integrity). Unlike encryption, signing does not hide the content. An ASP.NET Core API commonly verifies RS256 or ES256 tokens with a public key from the issuer's JWKS endpoint; that result is meaningful only after the issuer and key source are authenticated. HMAC-protected JWTs use a shared-secret MAC instead, so either secret holder can generate them.

# How It Works

1. The signature algorithm encodes the message, normally through an approved hash and algorithm-specific preparation.
2. The signer applies the private signing operation and emits a signature.
3. The verifier applies the public verification operation to the received message and signature.
4. A successful result proves that the message matches the signature under that public key. Trust in the claimed signer still depends on how the public key was authenticated.

“Encrypt the hash with the private key” is not a portable model. RSA-PSS, ECDSA, and EdDSA have different signing mathematics, and none should be implemented by composing raw encryption and hashing operations.

# Example in .NET

```csharp
using System.Security.Cryptography;
using System.Text;

// Sign a message
using var rsa = RSA.Create(2048);
var publicKey = rsa.ExportRSAPublicKey();

var message = Encoding.UTF8.GetBytes("Transfer $1000 to account 12345");
var signature = rsa.SignData(message, HashAlgorithmName.SHA256, RSASignaturePadding.Pss);

// Verify the signature
using var verifier = RSA.Create();
verifier.ImportRSAPublicKey(publicKey, out _);
bool isValid = verifier.VerifyData(message, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pss);
```

ECDSA P-256 produces smaller signatures than RSA-2048 and is supported by protocols such as JOSE. Use it only when the protocol specifies the curve, hash, and signature encoding and every verifier supports that profile:

```csharp
using var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
var message = System.Text.Encoding.UTF8.GetBytes("Transfer $1000 to account 12345");
var signature = ecdsa.SignData(message, HashAlgorithmName.SHA256);

// Verify
bool isValid = ecdsa.VerifyData(message, signature, HashAlgorithmName.SHA256);
// ECDSA P-256 signature: 64 bytes vs RSA-2048: 256 bytes
```

# Use Cases

- **JWT signing**: The identity provider signs the JWT with its private key; APIs verify with the public key (JWKS endpoint). See [[Security/JWT Bearer|JWT Bearer authentication]].
- **Code signing**: Software publishers sign executables so users can verify the binary has not been tampered with.
- **Document signing**: PDF signatures, contract signing (DocuSign uses digital signatures under the hood).
- **TLS certificates**: after issuance validation, a CA signature attests the binding between a certificate identity, such as a DNS name, and its public key.

# Related Construction: HMAC

HMAC authenticates a message between parties that share one secret. Either party can generate the same MAC, so it does not provide a digital signature's asymmetric attribution. Request-authentication protocols add canonical request bytes, a timestamp, and a nonce with server-side replay state; those protocol details belong to [[Security/Authentication/Authentication|API authentication]]. The signature-specific boundary here is trust: a digital signature separates a private signer from public verifiers, while every HMAC verifier is also able to create a valid tag.

![[Assets/Security/Security-Digital Signature-18120000.png]]

# Pitfalls

## Treating RSA Signing as RSA Encryption

**What goes wrong**: code applies raw RSA operations to a hand-built hash encoding because signing was described as “encrypting with the private key.” Verification then depends on non-standard parsing and may accept malformed encodings.

**Mitigation**: call the platform's signature API with a specified scheme and parameters. Prefer RSA-PSS for a new RSA-based protocol; use PKCS#1 v1.5 signatures only where the protocol requires compatibility. The Bleichenbacher padding oracle concerns PKCS#1 v1.5 **encryption**, not a reason to describe every PKCS#1 v1.5 signature as decryptable ciphertext.

## Trusting Signatures Without Certificate Validation

**What goes wrong**: verifying a signature with a public key proves the message was signed by whoever holds the corresponding private key — but not that the key belongs to who you think it does. Without certificate validation (chain of trust to a trusted CA), an attacker can substitute their own key pair.

**Mitigation**: authenticate the key through the trust model the protocol defines, such as a validated X.509 chain or an issuer-bound JWKS document. In JWT, `kid` is only a selector among keys already obtained for the expected issuer; it does not authenticate the issuer or authorize a new key source. Reject an unknown or ambiguous `kid`, and never let an untrusted `kid`, `jku`, or `x5u` value redirect verification to an arbitrary key.

# Tradeoffs

| Algorithm | Typical public-key size | Signature representation | Use when |
| --- | --- | --- | --- |
| RSA-PSS | 2048–4096 bits | Modulus-sized | Existing RSA infrastructure or protocol support |
| ECDSA P-256 | 256 bits | Usually DER-encoded or fixed-width by protocol | Broad JOSE, TLS, and platform interoperability |
| Ed25519 | 256 bits | 64 bytes | Protocols and libraries with explicit Ed25519 support |

Choose the algorithm the protocol specifies and the complete client set can verify. Algorithm agility means storing an algorithm or key identifier, supporting a controlled migration, and rejecting unapproved algorithms; it does not mean trusting an unverified message to choose its verifier.

# Questions

> [!QUESTION]- Why does signing use the private key to encrypt the hash, not the public key?
> Signing does not generally encrypt a hash. A signature scheme uses the private key to create a value that anyone with the public key can verify for the exact message. The asymmetry makes creation exclusive to the private-key holder while leaving verification public.

> [!QUESTION]- What is the difference between signing and encryption?
> Signing proves authenticity and integrity under a trusted key — it does not hide the content. Encryption hides the content but does not identify the sender. In TLS, the client validates the certificate chain, validity period, hostname, key usage, and configured revocation policy; the handshake proves the server holds the corresponding private key, and the negotiated session keys encrypt traffic.

> [!QUESTION]- How do you choose between ECDSA and RSA?
> Follow the protocol's allowed algorithms and encodings, then check every signer, verifier, HSM, and rotation path. ECDSA P-256 offers shorter keys and signatures; RSA often has broader compatibility with existing infrastructure. Neither should be selected by an untrusted message or treated as a universal default.

# References

- [ByteByteGo — A Cheat Sheet for API Designs](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/a-cheat-sheet-for-api-designs.md) — the pinned HMAC-request source, with its key terminology and replay handling corrected here.
- [RFC 9421 — HTTP Message Signatures](https://datatracker.ietf.org/doc/html/rfc9421) — canonical component coverage, timestamps, expiry, nonce parameters, and replay considerations.
- [NIST FIPS 198-1 — HMAC](https://csrc.nist.gov/pubs/fips/198-1/final) — the keyed-hash message-authentication construction.
- [Microsoft — Cryptographic Signatures](https://learn.microsoft.com/en-us/dotnet/standard/security/cryptographic-signatures) — .NET guide to RSA and ECDSA signing
- [RFC 7515 — JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515) — the standard for signing JWTs
- [NIST FIPS 186-5 — Digital Signature Standard](https://csrc.nist.gov/publications/detail/fips/186/5/final) — the authoritative NIST standard for digital signatures; covers RSA, ECDSA, and EdDSA with key size requirements and algorithm selection guidance.
