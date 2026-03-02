---
topic:
  - Security
subtopic:
  - Security
level:
  - "2"
priority: Medium
status: Creation

dg-publish: true
---

# Digital Signature

A digital signature proves that a message or document was created by a specific party (authenticity) and has not been modified since signing (integrity). Unlike encryption, signing does not hide the content — it proves who created it and that it is unchanged.

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

## Use Cases

- **JWT signing**: The identity provider signs the JWT with its private key; APIs verify with the public key (JWKS endpoint). See [[Software Engineering/07 Security/JWT Bearer|JWT Bearer]].
- **Code signing**: Software publishers sign executables so users can verify the binary has not been tampered with.
- **Document signing**: PDF signatures, contract signing (DocuSign uses digital signatures under the hood).
- **TLS certificates**: Certificate authorities sign server certificates to prove domain ownership.

## References

- [Microsoft — Cryptographic Signatures](https://learn.microsoft.com/en-us/dotnet/standard/security/cryptographic-signatures) — .NET guide to RSA and ECDSA signing
- [RFC 7515 — JSON Web Signature (JWS)](https://datatracker.ietf.org/doc/html/rfc7515) — the standard for signing JWTs
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering|Software Engineering]]
>
> **Topics**
> - [[Software Engineering/07 Security/Authentication/Authentication|Authentication]]
>
> **Pages**
> - [[Software Engineering/07 Security/Block-chain|Block-chain]]
> - [[Software Engineering/07 Security/Encryption|Encryption]]
> - [[Software Engineering/07 Security/JWT Bearer|JWT Bearer]]
> - [[Software Engineering/07 Security/OWASP|OWASP]]
<!-- whats-next:end -->
