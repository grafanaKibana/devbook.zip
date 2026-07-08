---
topic:
  - Security
subtopic:
  - Security
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Hashing

A cryptographic hash function maps data of any size to a fixed-size value (a *digest*) in a way that is **one-way** (you cannot recover the input from the digest) and **collision-resistant** (you can't feasibly find two inputs with the same digest). Hashing is the workhorse behind integrity checks, digital signatures, password storage, deduplication, and content addressing. The defining contrast with [[Encryption]]: encryption is *reversible* with a key; hashing is *deliberately irreversible* and keyless.

## Properties of a Cryptographic Hash

A function like SHA-256 is built to guarantee:

- **Deterministic** — the same input always yields the same digest.
- **One-way (preimage resistance)** — given a digest, you can't find an input that produces it (short of brute force).
- **Collision resistance** — you can't find two different inputs with the same digest.
- **Avalanche effect** — flipping one input bit changes ~half the output bits, so digests reveal nothing about input similarity.

`MD5` and `SHA-1` are **broken** for security use — practical collisions exist — and must not be used for signatures or integrity against an adversary (MD5 lingers only as a non-security checksum). Use the **SHA-2** family (SHA-256/512) or **SHA-3**.

```csharp
// SHA-256 of a byte payload (integrity / fingerprint)
byte[] digest = SHA256.HashData(Encoding.UTF8.GetBytes("hello"));
string hex = Convert.ToHexString(digest);   // 64 hex chars, 256 bits
```

## Hashing vs Encryption vs Encoding

The three are constantly confused; pick by *intent*:

| | Reversible? | Needs a key? | Purpose |
|---|---|---|---|
| **Hashing** | No (one-way) | No | Integrity, fingerprint, password storage |
| **Encryption** | Yes (decrypt) | Yes | Confidentiality |
| **Encoding** (Base64) | Yes (trivially) | No | Transport/representation — **zero** security |

Base64 "looks scrambled" but provides no protection — it's reversible by anyone. If you need secrecy, encrypt; if you need a tamper-evident fingerprint, hash.

## Integrity: Plain Hash vs HMAC vs Signature

To prove data wasn't altered, the mechanism depends on *who you're defending against*:

- **Plain hash** — detects *accidental* corruption (a download checksum). Useless against a deliberate attacker, who can change the data *and* recompute the hash.
- **HMAC (keyed hash)** — combines the message with a **shared secret key**, so only parties holding the key can produce or verify the tag. Proves integrity *and* authenticity between two trusted parties (e.g. signing a [[JWT Bearer|JWT]] with HS256, or webhook signatures).
- **[[Digital Signature]]** — hashes the data then signs the digest with a **private key**; anyone with the public key can verify. Adds **non-repudiation** (only the key holder could have signed it) that HMAC can't, since HMAC's secret is shared.

```csharp
// HMAC-SHA256: integrity + authenticity with a shared key
byte[] tag = HMACSHA256.HashData(key: sharedSecret, source: payload);
// Verify in constant time to avoid timing leaks:
bool ok = CryptographicOperations.FixedTimeEquals(tag, receivedTag);
```

## Password Hashing Is a Special Case

Storing passwords is the most common hashing task — and a plain SHA-256 is the **wrong** tool. General-purpose hashes are designed to be *fast*, so an attacker with a stolen database can try billions of guesses per second. Password hashing needs the opposite: deliberate slowness plus a per-user salt.

- **Salt** — a unique random value per password, stored alongside the hash. Defeats **rainbow tables** (precomputed digest lookups) and ensures two users with the same password get different hashes.
- **Slow / memory-hard KDF** — use a purpose-built algorithm: **Argon2id** (preferred today), **bcrypt**, **scrypt**, or **PBKDF2**. A *work factor* sets how expensive each guess is, tunable upward as hardware improves.
- **Pepper** (optional) — a secret added to all passwords, kept in a [[Secrets Management|secret store]] separate from the database, so a DB-only leak isn't enough.

```csharp
// ASP.NET Core Identity's PasswordHasher uses salted PBKDF2 by default and is fine;
// for new systems Argon2id (e.g. Konscious.Security.Cryptography) is the stronger choice.
// NEVER: store SHA256(password) — far too fast, and unsalted = rainbow-table-able.
```

## Pitfalls

- **Using MD5/SHA-1 for security** — both have practical collisions; only acceptable as non-adversarial checksums.
- **Using a fast hash for passwords** — SHA-256(password) is brute-forceable at billions/sec; use Argon2/bcrypt/PBKDF2 with a salt.
- **No salt / global salt** — enables rainbow tables and reveals duplicate passwords. Salt must be unique per user.
- **Non-constant-time comparison** — comparing hashes/HMACs with `==` or `SequenceEqual` can leak via timing; use `CryptographicOperations.FixedTimeEquals`.
- **Confusing a plain hash with authentication** — a bare hash sent alongside data proves nothing against an attacker; use HMAC or a signature.
- **Hashing to "encrypt"** — hashing is one-way; if you need the value back, you need encryption, not hashing.

## Tradeoffs

| Need | Use | Why |
|---|---|---|
| File/download integrity (accidental) | SHA-256 | Fast, sufficient for non-adversarial checks |
| Integrity + auth (shared secret) | HMAC-SHA256 | Keyed; attacker can't forge without the key |
| Integrity + auth + non-repudiation | Digital signature | Public-key verification, signer can't deny |
| Password storage | Argon2id / bcrypt / PBKDF2 | Slow + salted defeats offline brute force |

**Decision rule**: reach for SHA-256 for fingerprints/integrity, an **HMAC** when a shared secret should gate verification, a **digital signature** when you need public verification and non-repudiation, and a **slow salted KDF (Argon2id)** — never a general-purpose hash — for passwords. Compare secret-derived values in constant time.

## Questions

> [!QUESTION]- Why can't you use SHA-256 directly to store passwords?
> SHA-256 is engineered to be *fast*, which is exactly wrong for passwords: an attacker who steals the hash database can compute billions of guesses per second and crack weak/common passwords quickly, and without a salt they can use precomputed rainbow tables. Password hashing needs a **slow, memory-hard, salted** function (Argon2id, bcrypt, scrypt, PBKDF2) with a tunable work factor so each guess is expensive and every user's hash is unique.

> [!QUESTION]- What's the difference between a hash, an HMAC, and a digital signature?
> A **hash** is keyless and only detects accidental change — an attacker can alter data and recompute it. An **HMAC** mixes in a shared secret key, so it proves integrity *and* authenticity between parties who both hold the key. A **digital signature** hashes then signs with a *private* key, so anyone with the public key can verify, adding **non-repudiation** (the signer can't deny it) that HMAC lacks because its key is shared. Escalating from hash → HMAC → signature trades simplicity for stronger guarantees.

> [!QUESTION]- What does a salt protect against, and why must it be unique per user?
> A salt is a per-password random value stored with the hash. It defeats **rainbow tables** (precomputed digest→password lookups can't be built without knowing each salt) and ensures that two users who pick the same password produce *different* stored hashes, so a cracker can't crack many accounts at once or spot shared passwords. A single global salt would still let one rainbow table target the whole database — uniqueness per user is what forces the attacker to attack each hash individually.

## References

- [Cryptographic hashing in .NET (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/security/ensuring-data-integrity-with-hash-codes) — SHA family and integrity verification.
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — Argon2/bcrypt/PBKDF2 selection, salting, peppering, work factors.
- [NIST SHA-3 / hash standards](https://csrc.nist.gov/projects/hash-functions) — current approved hash algorithms.
- [RFC 2104 — HMAC](https://www.rfc-editor.org/rfc/rfc2104) — the keyed-hash construction.
- [CryptographicOperations.FixedTimeEquals (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.fixedtimeequals) — constant-time comparison to avoid timing attacks.
