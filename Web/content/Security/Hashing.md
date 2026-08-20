---
publish: true
created: 2026-08-20T20:41:15.669Z
modified: 2026-08-20T20:41:15.670Z
published: 2026-08-20T20:41:15.670Z
topic:
  - Security
subtopic:
  - Security
summary: Maps data of any size to a fixed-size, one-way, collision-resistant digest.
level:
  - "4"
priority: High
status: Ready to Repeat
---

A cryptographic hash maps an arbitrary-length byte string to a fixed-length digest. A secure general-purpose hash is designed to resist finding an input for a chosen digest and finding two inputs with the same digest. There is no decryption key. Inputs from a small or predictable domain can still be guessed and hashed, which is why a digest is not a way to hide passwords or identifiers.

Hash functions support fingerprints, signatures, content addressing, HMAC, and password-hashing constructions. [[Encryption]] solves a different problem: authorized key holders must be able to recover the plaintext.

# Properties of a Cryptographic Hash

A function such as SHA-256 is designed to provide:

- **Determinism:** the same byte sequence yields the same digest.
- **Preimage resistance:** a digest does not give a practical shortcut to an input that produces it.
- **Second-preimage resistance:** given one input, finding a different input with the same digest should be infeasible.
- **Collision resistance:** finding any two different inputs with one digest should be infeasible.

Good hash designs also diffuse small input changes across the output, but an avalanche observation is not a proof of these resistance properties. MD5 and SHA-1 have practical collision attacks and do not belong in new collision-dependent designs such as signatures or attacker-facing file identities. Current designs normally use an approved SHA-2 or SHA-3 profile chosen by the surrounding protocol.

```csharp
// SHA-256 of a byte payload (integrity / fingerprint)
byte[] digest = SHA256.HashData(Encoding.UTF8.GetBytes("hello"));
string hex = Convert.ToHexString(digest);   // 64 hex chars, 256 bits
```

# Hashing Vs Encryption Vs Encoding

The operation follows the required property:

| | Reversible? | Needs a key? | Purpose |
|---|---|---|---|
| **Hashing** | No (one-way) | No | Integrity, fingerprint, password storage |
| **Encryption** | Yes (decrypt) | Yes | Confidentiality |
| **Encoding** (Base64) | Yes (trivially) | No | Transport/representation — **zero** security |

Base64 changes representation and provides no secrecy. Encryption protects confidentiality. A hash supplies a fingerprint, but that fingerprint detects adversarial tampering only when the expected digest arrives through an authenticated channel.

# Integrity: Plain Hash Vs HMAC Vs Signature

Integrity depends on who can replace the expected value:

- **Plain hash:** detects accidental corruption when the expected digest is trusted. An attacker who can replace both file and digest can recompute it.
- **HMAC:** combines the message with a shared secret. Holders can produce and verify the tag, so it authenticates membership in that shared-key boundary rather than one specific sender. HS256 [[JWT Bearer|JWT]] tokens and many webhook schemes use this model.
- **[[Digital Signature]]:** a private signer creates a signature that public-key holders can verify. This separates signing from verification, though identity and non-repudiation still depend on key provenance and operational evidence.

```csharp
// HMAC-SHA256: integrity + authenticity with a shared key
byte[] tag = HMACSHA256.HashData(key: sharedSecret, source: payload);
// Verify in constant time to avoid timing leaks:
bool ok = CryptographicOperations.FixedTimeEquals(tag, receivedTag);
```

# Password Hashing Is a Special Case

A plain SHA-256 digest is the wrong password verifier. General-purpose hashes are intentionally fast, so an attacker with a copied database can test guesses cheaply and offline. Password hashing uses an adaptive, preferably memory-hard construction plus a unique random salt for each stored credential.

- **Salt:** a random value stored with one password verifier. It prevents precomputation across the database and hides which accounts share a password.
- **Adaptive password hash:** Argon2id is the normal choice where available. Scrypt and correctly configured PBKDF2 serve other platform or compliance constraints. Parameters are measured on production hardware and upgraded over time. Bcrypt remains mainly for compatible legacy deployments.
- **Pepper:** optional secret material held outside the password database in a [[Secrets Management|secret store]]. It adds a second compromise boundary, but rotation normally requires knowledge of the password or a post-hash construction designed for rotation.

```csharp
// ASP.NET Core Identity's PasswordHasher uses salted PBKDF2 by default and is fine;
// for new systems Argon2id (e.g. Konscious.Security.Cryptography) is the stronger choice.
// NEVER: store SHA256(password) — far too fast, and unsalted = rainbow-table-able.
```

The comment names one .NET Argon2 library as an example, not a repository recommendation. Package maintenance, platform support, and the deployed parameter set still require independent review.

# Pitfalls

- **Collision-broken algorithms:** MD5 and SHA-1 cannot protect collision-sensitive artifacts from an adversary.
- **Fast password digests:** SHA-256 makes offline guessing cheap. A password-specific construction and measured parameters are required.
- **Reused salt:** one salt across many credentials restores cross-account precomputation and reveals equality. Each stored credential needs its own salt.
- **Variable-time comparison:** secret-derived tags use `CryptographicOperations.FixedTimeEquals`. Ordinary public file digests do not always carry the same timing boundary.
- **Unauthenticated expected hash:** a digest delivered beside a compromised file can be replaced with it. The expected value needs a signature, MAC, or trusted channel.
- **Lost original value:** hashing has no recovery operation. Data that must be read later belongs behind encryption or tokenization.

# Tradeoffs

| Need | Use | Why |
|---|---|---|
| File/download integrity (accidental) | SHA-256 | Fast, sufficient for non-adversarial checks |
| Integrity + auth (shared secret) | HMAC-SHA256 | Keyed. Attacker can't forge without the key |
| Integrity + public verification | Digital signature | Only the private-key holder signs. Identity and evidentiary meaning come from the trust system |
| Password storage | Argon2id / bcrypt / PBKDF2 | Slow + salted defeats offline brute force |

SHA-256 is a common fingerprint when the protocol permits it. HMAC fits a shared-secret trust boundary, while a digital signature supports public verification. Passwords use a salted adaptive password hash, never a fast digest. Secret-derived authentication values are compared in constant time.

# Questions

> [!QUESTION]- Why is SHA-256 alone unsuitable for password storage?
> SHA-256 is fast and gives an offline attacker a cheap guess test. Password verifiers need a unique salt and an adaptive password-hashing function whose CPU and memory costs are tuned for the deployment and raised as hardware improves.

> [!QUESTION]- How do a hash, an HMAC, and a digital signature differ?
> A hash is keyless. Adversarial integrity depends on authenticating the expected digest. HMAC authenticates within a shared-secret group, where every verifier can also create tags. A digital signature gives one private-key holder the signing capability while allowing public verification, provided the verification key is trusted.

> [!QUESTION]- What does a salt protect against, and why must it be unique per user?
> A salt prevents one precomputed table or one computed guess from being reused across many stored verifiers. It is public and stored with the verifier. Each credential needs a distinct random salt so equal passwords do not produce equal stored values.

# References

- [Cryptographic hashing in .NET](https://learn.microsoft.com/dotnet/standard/security/ensuring-data-integrity-with-hash-codes)
- [NIST hash functions](https://csrc.nist.gov/projects/hash-functions)
- [HMAC: Keyed-Hashing for Message Authentication](https://www.rfc-editor.org/rfc/rfc2104)
