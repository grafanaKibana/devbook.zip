---
topic:
  - Security
subtopic:
  - Security
summary: "Proves a message was created by a specific party (authenticity) and unchanged since signing (integrity), without hiding content."
level:
  - "2"
priority: Medium
status: Ready to Repeat

publish: true
---

# Digital Signature

A digital signature proves that a message or document was created by a specific party (authenticity) and has not been modified since signing (integrity). Unlike encryption, signing does not hide the content — it proves who created it and that it is unchanged. Every JWT your ASP.NET Core API validates uses a digital signature: the identity provider signs the token with its private key (RS256 or ES256), and the API verifies the signature using the public key from the JWKS endpoint — a failed signature check means the token was forged or tampered with and the request is rejected with a 401.

## How It Works

1. The signer computes a hash of the message (e.g., SHA-256)
2. The signer encrypts the hash with their **private key** — this is the signature
3. The verifier decrypts the signature with the signer's **public key** to recover the hash
4. The verifier independently computes the hash of the received message
5. If the hashes match, the signature is valid — the message is authentic and unmodified

## Example in .NET

```csharp
using System.Security.Cryptography;
using System.Text;

// Sign a message
using var rsa = RSA.Create(2048);
var privateKey = rsa.ExportRSAPrivateKey();
var publicKey = rsa.ExportRSAPublicKey();

var message = Encoding.UTF8.GetBytes("Transfer $1000 to account 12345");
var signature = rsa.SignData(message, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

// Verify the signature
using var verifier = RSA.Create();
verifier.ImportRSAPublicKey(publicKey, out _);
bool isValid = verifier.VerifyData(message, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
```

ECDSA (the modern alternative) produces smaller signatures and is faster:

```csharp
// ECDSA signing (preferred for new systems)
using var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
var message = System.Text.Encoding.UTF8.GetBytes("Transfer $1000 to account 12345");
var signature = ecdsa.SignData(message, HashAlgorithmName.SHA256);

// Verify
bool isValid = ecdsa.VerifyData(message, signature, HashAlgorithmName.SHA256);
// ECDSA P-256 signature: 64 bytes vs RSA-2048: 256 bytes
```

## Use Cases

- **JWT signing**: The identity provider signs the JWT with its private key; APIs verify with the public key (JWKS endpoint). See [[JWT Bearer]].
- **Code signing**: Software publishers sign executables so users can verify the binary has not been tampered with.
- **Document signing**: PDF signatures, contract signing (DocuSign uses digital signatures under the hood).
- **TLS certificates**: Certificate authorities sign server certificates to prove domain ownership.

## Pitfalls

### Using RSA with PKCS#1 Padding (Vulnerable to Bleichenbacher Attack)

**What goes wrong**: RSA with PKCS#1 v1.5 padding is vulnerable to padding oracle attacks (Bleichenbacher's attack, CVE-1999-1230 and variants). An attacker can exploit timing differences in error responses to decrypt ciphertexts or forge signatures. In 2018, the ROBOT attack (Return Of Bleichenbacher's Oracle Threat) demonstrated that PKCS#1 v1.5 vulnerabilities persisted in major TLS implementations including Facebook, Citrix, and Cisco — affecting an estimated 2.8% of the Alexa Top Million sites.

**Mitigation**: use RSA-PSS padding for signatures (`RSASignaturePadding.Pss` in .NET) or switch to ECDSA. Never use PKCS#1 v1.5 for new systems.

### Trusting Signatures Without Certificate Validation

**What goes wrong**: verifying a signature with a public key proves the message was signed by whoever holds the corresponding private key — but not that the key belongs to who you think it does. Without certificate validation (chain of trust to a trusted CA), an attacker can substitute their own key pair.

**Mitigation**: in production systems, use X.509 certificates signed by a trusted CA. For JWT, validate the `kid` (key ID) against the issuer's JWKS endpoint, not against a hardcoded key.

## Tradeoffs

| Algorithm | Key size | Signature size | Speed | Use when |
|---|---|---|---|---|
| RSA-PSS | 2048–4096 bits | 256–512 bytes | Slower | Legacy compatibility, wide support |
| ECDSA (P-256) | 256 bits | 64 bytes | Faster | New systems, JWT (ES256), TLS certificates |
| Ed25519 | 256 bits | 64 bytes | Fastest | High-performance signing, SSH keys |

**Decision rule**: use ECDSA (P-256 / ES256) for new systems. It provides equivalent security to RSA-3072 with a 256-bit key, produces smaller signatures, and is faster. Use RSA only when the client or protocol requires it.


## Questions

> [!QUESTION]- Why does signing use the private key to encrypt the hash, not the public key?
> The private key is secret — only the signer can produce a valid signature. Anyone with the public key can verify it, but only the private key holder can create it. Reversing this would let anyone forge signatures.

> [!QUESTION]- What is the difference between signing and encryption?
> Signing proves authenticity and integrity — it does not hide the content. Encryption hides the content but does not prove who sent it. TLS uses both: the server certificate is signed (proves identity), and the session data is encrypted (provides confidentiality).

> [!QUESTION]- Why is ECDSA preferred over RSA for new systems?
> ECDSA produces shorter signatures (256-bit key gives equivalent security to 3072-bit RSA) and is faster to compute. RSA is still widely used for compatibility, but ECDSA is the modern default for JWT signing (ES256) and TLS certificates.


## References

- [Microsoft — Cryptographic Signatures](https://learn.microsoft.com/en-us/dotnet/standard/security/cryptographic-signatures) — .NET guide to RSA and ECDSA signing
- [RFC 7515 — JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515) — the standard for signing JWTs
- [NIST FIPS 186-5 — Digital Signature Standard](https://csrc.nist.gov/publications/detail/fips/186/5/final) — the authoritative NIST standard for digital signatures; covers RSA, ECDSA, and EdDSA with key size requirements and algorithm selection guidance.
