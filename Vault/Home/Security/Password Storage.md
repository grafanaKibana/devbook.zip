---
topic:
  - Security
subtopic:
  - Security
summary: "Stores password verifiers with a slow, salted password KDF so a database leak does not reveal plaintext credentials."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

A service needs to verify a password, not recover it. The stored record should make each offline guess expensive after a database leak and prevent equal passwords from sharing one verifier. Plaintext, reversible encryption, and fast general-purpose hashes fail that boundary.

# Store a Self-Describing Verifier

OWASP currently recommends Argon2id with a minimum configuration of `m=19 MiB`, `t=2`, and `p=1`. That is a floor, not a universal production setting. Benchmark the library on the authentication tier, choose the highest cost the service can sustain under bounded concurrency, and record the parameters with each verifier. Scrypt is the next choice when Argon2id is unavailable. PBKDF2-HMAC-SHA-256 fits environments that require a validated FIPS implementation. Bcrypt is mainly a compatibility choice for existing systems and has a 72-byte input limit in most implementations.

Store one record per password:

```text
$argon2id$v=19$m=19456,t=2,p=1$<unique-salt>$<derived-output>
```

The algorithm, version, cost parameters, and salt are public verifier metadata. Keeping them with the derived output makes the record self-describing and allows later migration. A maintained password-hashing library should generate the salt, encode the record, and verify it. A hand-built `hash(password + salt)` construction lacks the work and memory controls of a password KDF.

# Verification and Migration

1. Parse the stored algorithm, parameters, salt, and expected output.
2. Apply the same KDF to the candidate password.
3. Compare the outputs with the library's constant-time verifier.
4. On a successful login, rehash when the algorithm or cost is below current policy.

Rehash-on-login makes migration incremental. An account using an older algorithm can move after a successful verification, when plaintext is briefly available in memory. Accounts that do not return need an expiry or reset policy. Otherwise the oldest verifier remains indefinitely.

An optional pepper adds a secret key outside the password table. It can make a database-only theft insufficient for testing guesses, but it introduces storage, availability, and rotation work. A compromised pepper usually cannot be replaced for existing records without the user's password or a forced reset. It does not repair a weak KDF.

# Failure and Breach Paths

- Rate-limit online verification independently of the KDF. Expensive hashing raises offline cost. It does not stop credential stuffing against the live endpoint.
- Bound concurrent KDF work so an attacker cannot turn the intended memory cost into service exhaustion.
- Keep passwords and candidate bytes out of logs, traces, crash reports, and exception messages. Verifier records deserve the same access controls as the password table.
- After a verifier leak, preserve evidence and assess the cracking window from measured KDF cost and password quality. Reset credentials and sessions according to that risk, rotate a compromised pepper, and follow the applicable notification process.

A stolen verifier table gives an attacker an offline test with no service-side rate limit. Measured KDF cost, password quality, and any separately protected pepper determine the remaining work factor.

# Questions

> [!QUESTION]- What protection does a pepper add, and what does it cost?
> A pepper kept outside the password table can prevent a database-only thief from testing guesses. It creates another high-value secret and a rotation problem: replacing it for an existing verifier normally requires the user's password or a reset. It cannot compensate for a fast KDF.

# References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications](https://www.rfc-editor.org/rfc/rfc9106)
- [NIST SP 800-63B-4: Password Verifiers](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#passwordver)
