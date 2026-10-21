---
publish: true
created: 2026-10-21T13:29:32.448Z
modified: 2026-10-21T13:29:32.448Z
published: 2026-10-21T13:29:32.448Z
topic:
  - Security
subtopic:
  - Security
summary: Maps data of any size to a fixed-size, one-way, collision-resistant digest.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Security
qard-topic: Hashing
flashcard_uid: bca46ee1
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
| Password storage | Argon2id / bcrypt / PBKDF2 | Slow + salted raises the cost of each offline guess |

SHA-256 is a common fingerprint when the protocol permits it. HMAC fits a shared-secret trust boundary, while a digital signature supports public verification. Passwords use a salted adaptive password hash, never a fast digest. Secret-derived authentication values are compared in constant time.

# Questions

> [!qard]- What is a cryptographic hash function, and what security properties does it provide?
> A cryptographic hash function maps input of any length to a fixed-length digest, such as 256 bits for SHA-256. It uses no key and has no decryption operation. It is designed so that the digest can represent the data in comparisons and integrity checks:
>
> - **Deterministic:** the same bytes always produce the same digest, so anyone can recompute and compare it.
> - **Preimage resistance:** given a digest, finding any input that produces it is computationally infeasible.
> - **Second-preimage resistance:** given one input, finding a different input with the same digest is infeasible, so a known file cannot be replaced by a different file with a matching digest.
> - **Collision resistance:** finding any two different inputs with the same digest is infeasible. Signatures and attacker-facing file identities rely on this property. An attacker who could produce such a pair could get one input approved and then substitute the other.
>
> These properties do not hide a value drawn from a small or predictable set. Passwords, phone numbers or IDs can be recovered by hashing likely candidates and comparing digests. Once practical collisions are found, as they have been for MD5 and SHA-1, the function no longer suits uses that depend on collision resistance, such as signatures.
>
> Sources: [NIST FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)

<!-- qard-id: d81e9a4d-150d-4e05-81bd-cdfcdd9936a9 -->

> [!qard]- Why is SHA-256 alone unsuitable for password storage?
> SHA-256 is unsuitable because it is designed to be fast. An attacker who steals the stored digests can test password guesses offline at very high speed, and nothing in SHA-256 makes each guess costly. Without a salt, identical passwords also produce identical digests. Precomputed tables, and every digest the attacker cracks, therefore apply to every account with the same password.
>
> Password storage instead uses a purpose-built password-hashing function:
>
> - **Deliberately expensive, adjustable cost:** Argon2id, scrypt or PBKDF2 make each guess slow. Argon2id and scrypt also need substantial memory per guess, which raises the cost of cracking on massively parallel hardware. The cost parameters are tuned to current production hardware and raised over time.
> - **A unique random salt for each stored password:** the salt is stored with the hash, so equal passwords produce different hashes and precomputation cannot be reused across accounts.
>
> These measures raise the cost of every guess. They do not make a weak or common password safe, because it can still be guessed, only more slowly.
>
> Sources: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

<!-- qard-id: cd3d6283-9c8d-4cde-8c47-e86430a606ba -->

> [!qard]- How do a hash, an HMAC, and a digital signature differ?
> All three produce a value that detects changes to a message. They differ in their keys, and therefore in who can create a valid value and who can check it.
>
> | Aspect | Hash, such as SHA-256 | HMAC | Digital signature |
> |---|---|---|---|
> | Key | None. | One secret key shared by everyone who creates or verifies tags. | A private signing key and a matching public verification key. |
> | Who can create a valid value | Anyone, including an attacker who changes the message and recomputes the digest. | Any holder of the shared key. | Only the holder of the private key. |
> | Who can verify | Anyone who has a trusted expected digest. | Only holders of the shared key, who could also have created the tag. | Anyone who has the public key. |
> | What a successful check shows | The data matches the expected digest. This stops deliberate tampering only if the expected digest arrived through an authenticated channel. | The message was not altered and came from some holder of the key, but not from one identifiable holder. | The message was not altered and was signed with that private key. Linking the key to a person or organization depends on a trusted key binding, such as a certificate. |
> | Typical use | Fingerprints, download checks against accidental corruption, and a building block for HMAC and signatures. | Webhook signatures, HS256 JWTs and messages between parties that already share a secret. | Software and certificate signing, signed tokens and messages that many parties must verify. |
>
> A signature does not prove non-repudiation by itself either. That depends on how the private key is held, how a compromise is handled and what audit evidence connects the key to an act.
>
> Sources: [NIST FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final) · [NIST FIPS 198-1: The Keyed-Hash Message Authentication Code (HMAC)](https://csrc.nist.gov/pubs/fips/198-1/final) · [NIST FIPS 186-5: Digital Signature Standard](https://csrc.nist.gov/pubs/fips/186-5/final)

<!-- qard-id: 48cea5c9-021a-4618-bd46-fca11a404418 -->

> [!qard]- What does a salt protect against, and why must it be unique per user?
> A salt protects against attacks that reuse one computation across many stored password hashes. With a unique random salt for each stored password, the same password produces different hashes. As a result, precomputed lookup or rainbow tables do not apply, cracking one hash does not reveal every account with that password, and the stored hashes do not show which accounts share a password.
>
> That protection depends on each salt being unique:
>
> - **Shared salt:** equal passwords again produce equal hashes. Each guess, hashed once with the shared salt, can be checked against every account at once, and a table built for that salt covers the whole database.
> - **Unique salt:** each guess must be hashed separately for each account, so attacking many accounts requires many separate efforts.
>
> The salt is not secret and is stored next to the hash. It does not slow down guessing against one stolen hash, so it does not protect a weak password by itself. That per-guess cost comes from a deliberately slow password-hashing function such as Argon2id.
>
> Sources: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

> [!qard]- What is the difference between hashing, encryption, and encoding?
> Encoding changes how data is represented, encryption hides data from anyone without the key, and hashing produces a fixed-size fingerprint that cannot be turned back into the data. Only encryption both protects a secret and allows authorized recovery.
>
> | Aspect | Encoding, such as Base64 | Encryption, such as AES-GCM | Hashing, such as SHA-256 |
> |---|---|---|---|
> | Purpose | Represents bytes in a form a channel or syntax accepts, such as an HTTP header. | Keeps data confidential. Authenticated encryption also detects tampering. | Produces a fingerprint for comparison and integrity checks, and serves as a building block for HMAC, signatures and password hashing. |
> | Reversal | Anyone who knows the encoding can decode the value. | Only a holder of the decryption key can recover the plaintext. | There is no decryption operation. A guessable input can only be found by hashing candidates and comparing digests. |
> | Secret involved | None. | A key. Whoever can obtain the key can read the data. | None for a plain hash. |
> | Security provided | None. The encoded value is the original data in another form. | Confidentiality against anyone without the key. | Detects changes when the expected digest is trusted. It does not hide inputs from a small or predictable set. |
>
> Choosing the wrong operation causes predictable failures. A Base64-encoded password, as in HTTP Basic authentication, is readable by anyone who sees it. Data that must be read later is lost if it is only hashed.
>
> Sources: [NIST FIPS 180-4: Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final) · [NIST SP 800-57 Part 1 Rev. 5: Recommendation for Key Management](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final) · [RFC 7617: The 'Basic' HTTP Authentication Scheme](https://www.rfc-editor.org/rfc/rfc7617.html)

# References

- [Cryptographic hashing in .NET](https://learn.microsoft.com/dotnet/standard/security/ensuring-data-integrity-with-hash-codes)
- [NIST hash functions](https://csrc.nist.gov/projects/hash-functions)
- [HMAC: Keyed-Hashing for Message Authentication](https://www.rfc-editor.org/rfc/rfc2104)
