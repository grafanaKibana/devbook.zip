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

# Password Storage

A service does not need the original password after enrollment. It needs a verifier that can confirm a later attempt while making each offline guess expensive after a database leak. Store the output of a password-specific key derivation function (KDF), not plaintext, reversible ciphertext, or a fast hash such as SHA-256.

## Store a Self-Describing Verifier

Use Argon2id for new systems. Start from the current OWASP floor—at the referenced revision, `m=19 MiB`, `t=2`, `p=1`—then benchmark a higher cost that the authentication tier can sustain. Use scrypt when Argon2id is unavailable. Use PBKDF2-HMAC-SHA-256 when a validated FIPS implementation is a constraint. Bcrypt belongs mainly in compatible legacy systems because of its input limit and weaker resistance to parallel hardware.

Store one record per password:

```text
$argon2id$v=19$m=19456,t=2,p=1$<unique-salt>$<derived-output>
```

The algorithm, version, parameters, and salt are not secrets. Keeping them with the derived output lets verification reproduce the KDF and lets a future login identify an old cost that needs upgrading. Let a mature library generate the random salt and encode the record; a hand-built `hash(password + salt)` construction is not a password KDF.

## Verification and Migration

1. Parse the stored algorithm, parameters, salt, and expected output.
2. Apply the same KDF to the candidate password.
3. Compare the outputs with the library's constant-time verifier.
4. On a successful login, rehash when the algorithm or cost is below current policy.

This makes migration incremental. An account still using PBKDF2 can move to Argon2id at its next successful login without keeping plaintext or forcing every user through one synchronized reset. Keep a deadline and reset path for accounts that never return.

An optional pepper is a separate, shared secret applied in addition to per-user salts. Keep it in a secrets manager or HSM, never in the password table. A pepper can make a database-only theft harder, but rotation normally requires the user's password or a forced reset. It does not repair a weak KDF.

## Failure and Breach Paths

- Rate-limit online verification independently of the KDF. A slow hash raises offline cost; it does not stop distributed credential stuffing.
- Bound concurrent KDF work so an attacker cannot turn expensive verification into memory exhaustion.
- Do not log passwords, candidate bytes, salts plus derived output together in diagnostic events, or KDF exceptions containing input.
- If password verifiers leak, preserve evidence, invalidate exposed sessions where appropriate, raise the KDF policy, reset credentials according to the assessed cracking window, rotate a compromised pepper, and notify affected users under the applicable incident process.

The breach boundary is concrete: a stolen table gives the attacker a verifier for unlimited offline guesses. The KDF's measured cost, the users' password quality, and any separately protected pepper determine how quickly those guesses become accounts.

## References

- [ByteByteGo — Storing Passwords Safely](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-to-store-passwords-in-the-database.md) — the pinned source; its plain salted-hash visual is intentionally not reused because it omits a password KDF.
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — current algorithm order, minimum work factors, salt, pepper, and migration guidance.
- [RFC 9106 — Argon2](https://datatracker.ietf.org/doc/html/rfc9106) — the Argon2 algorithm and recommended parameter profiles.
- [NIST SP 800-63B-4 — Password Verifiers](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#passwordver) — verifier requirements for salted password hashing, rate limiting, and protected storage.
