---
topic:
  - Security
subtopic:
  - Security
summary: "Proves a message's authenticity and integrity without hiding its content."
level:
  - "2"
priority: Medium
status: Ready to Repeat

publish: true
---

A digital signature binds a message to possession of a private signing key and detects changes made after signing. It does not hide the message or identify a person by itself. Identity comes from the trust system that binds the verification key to a signer.

An ASP.NET Core API may verify an RS256 or ES256 token with a public key obtained from an issuer's JWKS document. That signature matters only after the expected issuer and key source are authenticated. An HMAC-protected JWT uses a shared-secret MAC instead, so every verifier holding the secret can also create a valid token.

# How It Works

1. The signature algorithm processes the message using its specified hash or internal message preparation.
2. The signer applies the private signing operation and emits a signature.
3. The verifier applies the public verification operation to the received message and signature.
4. A successful result shows that the signature is valid for that exact message under the supplied public key. The claimed signer remains unproven until that key is authenticated.

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

ECDSA P-256 produces smaller signatures than RSA-2048 and is supported by protocols such as JOSE. Interoperability still depends on the curve, hash, and signature encoding chosen by the protocol:

```csharp
using var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
var message = System.Text.Encoding.UTF8.GetBytes("Transfer $1000 to account 12345");
var signature = ecdsa.SignData(message, HashAlgorithmName.SHA256);

// Verify
bool isValid = ecdsa.VerifyData(message, signature, HashAlgorithmName.SHA256);
// ECDSA P-256 signature: 64 bytes vs RSA-2048: 256 bytes
```

# Use Cases

- **JWT signing:** an issuer signs a JWS and resource servers verify it with an authenticated issuer key. See [[Home/Security/JWT Bearer|JWT Bearer authentication]].
- **Code signing:** a release process signs an artifact or manifest so verifiers can bind bytes to a trusted publisher key.
- **Document signing:** a signature covers defined document bytes and validation metadata. Long-term evidence also needs timestamps, certificate status, and archival policy.
- **TLS certificates:** after issuance validation, a CA signature attests a binding between certificate identity claims and a public key.

# Related Construction: HMAC

HMAC authenticates a message within a group that shares one secret. Every verifier can generate the same MAC, so it cannot distinguish which secret holder created a tag. A digital signature separates the private signing capability from public verification.

Request-authentication protocols also define canonical request bytes and freshness data such as timestamps or nonces. Those rules belong to [[Home/Security/Authentication/Authentication|API authentication]]. Signing arbitrary bytes without them does not stop replay.

![[Security/Security-Digital Signature-18120000.png|theme-aware]]

# Pitfalls

## Treating RSA Signing as RSA Encryption

Code applies raw RSA operations to a hand-built hash encoding because signing was described as “encrypting with the private key.” Verification then depends on non-standard parsing and may accept malformed encodings.

The platform signature API must receive the complete scheme and parameters. RSA-PSS fits a new RSA-based protocol. PKCS#1 v1.5 signatures remain for protocols that require compatibility. Bleichenbacher's padding oracle concerns PKCS#1 v1.5 encryption and does not turn a signature into decryptable ciphertext.

## Trusting Signatures Without Certificate Validation

Signature verification succeeds under an attacker-supplied public key. The mathematics are valid, but the application authenticated the wrong signer.

Authenticate the key through the protocol's trust model, such as a validated X.509 chain or issuer-bound JWKS document. In JWT, `kid` selects among keys already trusted for the expected issuer. It does not authenticate a new issuer or key source. Unknown or ambiguous identifiers fail closed, and untrusted `jku` or `x5u` values never redirect verification to arbitrary keys.

# Tradeoffs

| Algorithm | Typical public-key size | Signature representation | Use when |
| --- | --- | --- | --- |
| RSA-PSS | 2048–4096 bits | Modulus-sized | Existing RSA infrastructure or protocol support |
| ECDSA P-256 | 256 bits | Usually DER-encoded or fixed-width by protocol | Broad JOSE, TLS, and platform interoperability |
| Ed25519 | 256 bits | 64 bytes | Protocols and libraries with explicit Ed25519 support |

Choose the algorithm the protocol specifies and the complete client set can verify. Algorithm agility means storing an algorithm or key identifier, supporting a controlled migration, and rejecting unapproved algorithms. It does not mean trusting an unverified message to choose its verifier.

# References

- [NIST FIPS 186-5: Digital Signature Standard](https://csrc.nist.gov/pubs/fips/186-5/final)
- [Cryptographic signatures in .NET](https://learn.microsoft.com/dotnet/standard/security/cryptographic-signatures)
- [JSON Web Signature](https://www.rfc-editor.org/rfc/rfc7515)
