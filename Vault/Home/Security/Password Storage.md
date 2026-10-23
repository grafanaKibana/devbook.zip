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
qard-deck: "Security"
qard-topic: "Password Storage"
flashcard_uid: "e2367753"
---

A service needs to verify a password, not recover it. The stored record should make each offline guess expensive after a database leak and prevent equal passwords from sharing one verifier. Plaintext, reversible encryption, and fast general-purpose hashes fail that boundary.

# Store a Self-Describing Verifier

OWASP currently recommends Argon2id with a minimum configuration of `m=19 MiB`, `t=2`, and `p=1`. That is a floor, not a universal production setting. The production setting comes from benchmarking the library on the authentication tier: it is the highest cost the service can sustain under bounded concurrency, and its parameters are recorded with each verifier. Scrypt is the next choice when Argon2id is unavailable. PBKDF2-HMAC-SHA-256 fits environments that require a validated FIPS implementation. Bcrypt is mainly a compatibility choice for existing systems and has a 72-byte input limit in most implementations.

Each password has one stored record:

```text
$argon2id$v=19$m=19456,t=2,p=1$<unique-salt>$<derived-output>
```

The algorithm, version, cost parameters, and salt are public verifier metadata. Keeping them with the derived output makes the record self-describing and allows later migration. A maintained password-hashing library should generate the salt, encode the record, and verify it. A hand-built `hash(password + salt)` construction lacks the work and memory controls of a password KDF.

# Verification and Migration

1. The verifier parses the stored algorithm, parameters, salt, and expected output.
2. It applies the same KDF to the candidate password.
3. The library's constant-time verifier compares the outputs.
4. After a successful login, the service rehashes the password when the algorithm or cost is below current policy.

Rehash-on-login makes migration incremental. An account using an older algorithm can move after a successful verification, when plaintext is briefly available in memory. Accounts that do not return need an expiry or reset policy. Otherwise the oldest verifier remains indefinitely.

An optional pepper adds a secret key outside the password table. It can make a database-only theft insufficient for testing guesses, but it introduces storage, availability, and rotation work. A compromised pepper usually cannot be replaced for existing records without the user's password or a forced reset. It does not repair a weak KDF.

# Failure and Breach Paths

- Online verification is rate-limited independently of the KDF. Expensive hashing raises offline cost. It does not stop credential stuffing against the live endpoint.
- Concurrent KDF work is bounded so an attacker cannot turn the intended memory cost into service exhaustion.
- Passwords and candidate bytes stay out of logs, traces, crash reports, and exception messages. Verifier records deserve the same access controls as the password table.
- After a verifier leak, the response preserves evidence and assesses the cracking window from measured KDF cost and password quality. Credentials and sessions are reset according to that risk, a compromised pepper is rotated, and the applicable notification process is followed.

A stolen verifier table gives an attacker an offline test with no service-side rate limit. Measured KDF cost, password quality, and any separately protected pepper determine the remaining work factor.

# Questions

> [!qard]- How should a service store and verify user passwords?
> A service stores each password as a verifier produced by a slow, salted password-hashing function. It never stores plaintext, reversibly encrypted text or a fast general-purpose hash. The service only needs to check a password, not recover it, and the function's deliberate cost makes each guess against a stolen table expensive.
> 
> **Storing:** OWASP currently recommends Argon2id with at least 19 MiB of memory, 2 iterations and a parallelism of 1. That configuration is a floor, and the cost is raised as far as the authentication servers can sustain. When Argon2id is unavailable, scrypt is the next option, and PBKDF2 fits systems that require FIPS-140 compliance. A maintained library generates a unique random salt for every password. It encodes the algorithm, its cost parameters, the salt and the derived output in one record:
> 
> ```text
> $argon2id$v=19$m=19456,t=2,p=1$<salt>$<output>
> ```
> 
> **Verifying a login:**
> 
> 1. The algorithm, parameters and salt are read from the stored record.
> 2. The same function runs on the submitted password with those stored settings.
> 3. The library's constant-time verification routine compares the result with the stored output.
> 4. After a successful match, the password is rehashed with current settings if the record uses an older algorithm or a lower cost.
> 
> Because each record carries its own settings, old and new records can be verified side by side, and accounts move to stronger settings as their users sign in. Accounts that never sign in again keep the old verifier, so an expiry or forced-reset policy is needed for them.
> 
> [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

<!-- qard-id: ca2e1f98-cc85-4972-913e-da79d30894eb -->
> [!qard]- In password storage, what protection does a pepper add, and what does it cost?
> A pepper is a secret key that is applied in addition to each password's salt. It is shared by all password records and stored outside the database. It protects against theft of the database alone: without the key, a stolen verifier cannot be tested against guessed passwords. In exchange, the system must protect and keep available one more critical secret, and rotation becomes harder. The pepper also does not replace a slow password-hashing function.
> 
> **How it protects:** a salt is stored next to its verifier, so a thief who copies the table has everything needed to hash a guess and compare the result. A pepper is kept elsewhere, such as in a secrets vault or an HSM, and serves as the key for an extra step after password hashing. OWASP describes hashing the password as usual and then applying HMAC to the result, with the pepper as the key. NIST describes that extra secret-key step as either a keyed hash or an encryption operation. Without the key, a thief cannot compute the stored value for any guess.
> 
> **What it costs:**
> 
> - **A critical secret:** every login needs the pepper. If it leaks along with the table, for example when the application host is compromised, the extra protection is gone. If it is lost, no existing verifier can be checked, and every user must reset their password.
> - **Harder rotation:** how existing records move to a new pepper depends on the construction. With a one-way keyed hash such as HMAC, a record can be rebuilt only from the password: at the user's next successful login or through a reset. With reversible encryption, stored values can instead be decrypted with the old key, while it is still available, and re-encrypted under the new key. Re-encryption changes only the records currently stored. A copy of the table already stolen together with the compromised key remains open to offline guessing.
> - **No substitute for the hashing function:** once the pepper leaks, only the cost of the salted password-hashing function slows offline guessing. A fast hash combined with a pepper therefore remains weak.
> 
> [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) · [NIST SP 800-63B-4: Password verifiers](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#passwordver)

# References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications](https://www.rfc-editor.org/rfc/rfc9106)
- [NIST SP 800-63B-4: Password Verifiers](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/#passwordver)
