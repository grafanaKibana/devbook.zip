---
{"dg-publish":true,"permalink":"/software-engineering/07-security/encryption/","dg-note-properties":{"topic":["Security"],"subtopic":["Security"],"level":["4"],"priority":"High","status":"Creation"}}
---


# Encryption

Encryption transforms readable data (plaintext) into unreadable ciphertext using a key. Only parties with the correct key can decrypt it. Encryption protects data confidentiality — it does not guarantee integrity or authenticity (use signing for that). In .NET, encryption is provided by `System.Security.Cryptography`.

## Symmetric Encryption

The same key encrypts and decrypts. Fast. Suitable for large data volumes. The key distribution problem: how do you securely share the key?

**AES-256-GCM** is the standard choice. GCM (Galois/Counter Mode) provides both encryption and authentication (AEAD — Authenticated Encryption with Associated Data). It detects tampering without a separate HMAC.

```csharp
using System.Security.Cryptography;

// Encrypt with AES-256-GCM
var key = new byte[32]; // 256-bit key
RandomNumberGenerator.Fill(key);
var nonce = new byte[12]; // 96-bit nonce (never reuse with same key)
RandomNumberGenerator.Fill(nonce);
var tag = new byte[16]; // 128-bit authentication tag

var plaintext = System.Text.Encoding.UTF8.GetBytes("sensitive data");
var ciphertext = new byte[plaintext.Length];

using var aes = new AesGcm(key, 16);
aes.Encrypt(nonce, plaintext, ciphertext, tag);
// Store: nonce + tag + ciphertext (all needed for decryption)
```

**Pitfall — ECB mode**: AES-ECB encrypts each block independently, producing identical ciphertext for identical plaintext blocks. This leaks patterns (the "ECB penguin" problem). Never use ECB. Use GCM or CBC with HMAC.

## Asymmetric Encryption

Two mathematically linked keys: a public key (encrypt) and a private key (decrypt). Slower than symmetric. Used for key exchange and digital signatures, not bulk data encryption.

**RSA**: The classic asymmetric algorithm. Use RSA-OAEP for encryption (not PKCS#1 v1.5, which is vulnerable to padding oracle attacks). Key size: 2048-bit minimum, 4096-bit for long-lived keys.

```csharp
using var rsa = RSA.Create(2048);
var publicKey = rsa.ExportRSAPublicKey();
var privateKey = rsa.ExportRSAPrivateKey();

// Encrypt with public key
var encrypted = rsa.Encrypt(plaintext, RSAEncryptionPadding.OaepSHA256);
// Decrypt with private key
var decrypted = rsa.Decrypt(encrypted, RSAEncryptionPadding.OaepSHA256);
```

## TLS — Encryption in Transit

TLS (Transport Layer Security) combines asymmetric and symmetric encryption:
1. **Handshake**: Client and server use asymmetric crypto (RSA or ECDH) to agree on a shared symmetric key
2. **Data transfer**: All subsequent data is encrypted with the symmetric key (AES-GCM)

In .NET, TLS is handled automatically by `HttpClient` and ASP.NET Core. Enforce HTTPS with `app.UseHttpsRedirection()` and `app.UseHsts()`.

## Pitfalls

**Nonce reuse with AES-GCM**: Reusing a nonce with the same key in GCM mode completely breaks confidentiality and authentication. Always generate a fresh random nonce for each encryption operation.

**Key management**: The hardest part of encryption is not the algorithm — it is key storage and rotation. Never hardcode keys. Use Azure Key Vault, AWS KMS, or .NET Data Protection API for key management.

**Rolling your own crypto**: Do not implement cryptographic algorithms yourself. Use `System.Security.Cryptography` or a well-audited library (libsodium via NSec). Custom implementations almost always have subtle vulnerabilities.

## Tradeoffs

| | Symmetric (AES-GCM) | Asymmetric (RSA) |
|---|---|---|
| Speed | Fast (hardware-accelerated) | Slow (10-100× slower) |
| Key distribution | Hard (must share secret key) | Easy (public key is public) |
| Use case | Bulk data encryption | Key exchange, signatures |
| Key size | 256 bits | 2048-4096 bits |

**Hybrid encryption** (used in TLS, PGP): Use asymmetric crypto to exchange a symmetric key, then use the symmetric key for bulk data. Best of both worlds.

## Questions

> [!QUESTION]- When should you use symmetric vs asymmetric encryption?
> Use symmetric (AES-256-GCM) for bulk data encryption — it is 10-100x faster than asymmetric. Use asymmetric (RSA, ECDH) for key exchange and digital signatures, not for encrypting data directly. In practice, use hybrid encryption: asymmetric to exchange a symmetric key, then symmetric for the data. This is exactly what TLS does.

> [!QUESTION]- What is envelope encryption and when is it used?
> Envelope encryption uses two keys: a Data Encryption Key (DEK) encrypts the data; a Key Encryption Key (KEK) encrypts the DEK. The encrypted DEK is stored alongside the ciphertext. The KEK lives in a key management service (Azure Key Vault, AWS KMS) and never leaves it. This pattern is used in cloud storage (Azure Blob Storage, S3 server-side encryption) and allows key rotation without re-encrypting all data — you only re-encrypt the DEK.

## References

- [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines) — authoritative cryptographic standards; covers AES, RSA, ECDSA, and key management guidelines
- [Microsoft — Cryptography in .NET](https://learn.microsoft.com/en-us/dotnet/standard/security/cryptography-model) — .NET cryptography model; covers `System.Security.Cryptography` classes and best practices
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html) — practical guidance on algorithm selection, key management, and common mistakes
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering\|Software Engineering]]
>
> **Topics**
> - [[Software Engineering/07 Security/Authentication/Authentication\|Authentication]]
>
> **Pages**
> - [[Software Engineering/07 Security/Block-chain\|Block-chain]]
> - [[Software Engineering/07 Security/Digital Signature\|Digital Signature]]
> - [[Software Engineering/07 Security/JWT Bearer\|JWT Bearer]]
> - [[Software Engineering/07 Security/OWASP\|OWASP]]
<!-- whats-next:end -->
