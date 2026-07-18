---
topic:
  - Security
subtopic:
  - Authentication
summary: "How time-based one-time passwords are provisioned, generated, validated, and recovered."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Time-Based One-Time Passwords

TOTP is a possession-factor protocol: an authenticator and a server share a secret, derive the same time-step counter, and use HMAC plus dynamic truncation to produce a short decimal code. The code changes without network access. TOTP improves on a password alone, but it is still phishable and replayable within the server's acceptance window.

Use TOTP where broad authenticator compatibility matters and passkeys are not yet viable. Prefer WebAuthn/passkeys when phishing resistance is the requirement.

## Provisioning

1. After fresh primary authentication, the server generates a random secret for this account and device.
2. It stores the secret encrypted under a separately managed key. The verifier needs the original bytes, so a one-way password hash cannot replace encryption.
3. It returns an `otpauth://` URI over an authenticated TLS session, commonly rendered as a QR code. `otpauth://` is an authenticator-app provisioning convention documented by Google Authenticator, not part of RFC 6238.
4. The authenticator stores the secret. The user enters one generated code so the server can confirm enrollment before enabling the factor.
5. The server generates separate single-use recovery codes, stores only their hashes, and shows the plaintext once.

```text
otpauth://totp/DevBook:alice@example.com
  ?secret=<base32-secret>
  &issuer=DevBook
  &algorithm=SHA1
  &digits=6
  &period=30
```

The QR code contains the shared secret. Treat screenshots, analytics, browser history, support logs, and backup exports as credential-exfiltration paths. Require reauthentication to display or replace it, and invalidate the previous secret when rotation completes.

![[System Design 101/7191a3aa019a55b0fac84365a1c820af7f245dfce5dba89a0f83bd30c489ab37.jpg]]

> [!WARNING] Non-normative source visual
> TOTP does not concatenate a secret and timestamp. It converts time to a moving counter, computes HMAC over the encoded counter, applies dynamic truncation, and reduces the result to the configured number of digits; the verifier accepts only a bounded time-step window.

## Moving factor and code generation

For Unix time `t`, start time `T0`, and step size `X`, TOTP derives the moving factor:

```text
counter = floor((t - T0) / X)
hotp = HMAC(secret, counter encoded as an 8-byte big-endian integer)
offset = low 4 bits of the last HMAC byte
binary = 31-bit integer selected at offset
code = binary mod 10^digits, left-padded with zeroes
```

The common interoperable profile is a 30-second step and six digits. RFC 6238 permits HMAC-SHA-1, SHA-256, or SHA-512; changing algorithm, digit count, or period requires both parties to use the same parameters. SHA-1 here is the HMAC primitive specified by the widespread profile, not a password hash or digital signature.

## Validation

The server never accepts a code merely because it has six digits. It loads the enrolled secret, derives the current time step, evaluates a small configured window, compares candidate codes in constant time, and applies account-level rate limits.

```text
submitted step candidates: current - 1, current, current + 1
for each candidate:
  calculate TOTP with the enrolled secret
  compare without early exit
accept only if:
  one candidate matches
  candidate step is newer than the last accepted step for this authenticator
  account and source have not exceeded attempt limits
```

A ±1 window tolerates modest clock skew but triples the valid code set. With six digits and three accepted windows, a random attempt has at most roughly 3 in 1,000,000 chance before rate limiting. The source claim that an attacker must try all codes within 30 seconds misses distributed guessing and repeated future windows; throttle failures, lock or delay abusive attempts, and alert on bursts.

Store the last accepted time step per authenticator so the same code cannot be replayed during its remaining lifetime. Define concurrency behavior: two simultaneous requests with one code must race through one atomic compare-and-update, leaving at most one accepted. Keep server clocks synchronized and monitor drift rather than widening the window indefinitely.

## Recovery and lifecycle

- Require a recent strong authentication before enrolling, replacing, or removing TOTP.
- Notify the account through an independent channel when a factor changes.
- Hash recovery codes, mark each used code atomically, and rotate the entire set after use or exposure.
- Revoke sessions or require step-up authentication after sensitive recovery, depending on the threat model.
- Support multiple named authenticators when losing one device must not force an insecure help-desk bypass.
- Do not let knowledge-based questions or email-only recovery silently downgrade a high-assurance account.

The shared secret is present at both ends, so a server database/key compromise can clone every affected authenticator. WebAuthn instead stores a public key at the server and produces an origin-bound signature over a fresh challenge. That is why passkeys resist real-time phishing better than TOTP, even though their sync and account-recovery providers introduce different trust decisions.

## Tradeoffs

| Method | Verifier stores | Phishing/replay boundary | Recovery cost | Use when |
| --- | --- | --- | --- | --- |
| SMS OTP | Phone destination and delivery state | Phishable; SIM swap and carrier path add risk | Familiar but tied to phone-number recovery | Legacy compatibility is mandatory |
| TOTP | Decryptable shared secret | Phishable; replayable inside accepted window unless step is recorded | Requires backup codes or additional authenticators | Offline, broadly compatible app factor is needed |
| WebAuthn/passkey | Public key and credential metadata | Origin-bound challenge/response; no reusable server secret | Depends on device, sync, and account recovery model | Phishing resistance or passwordless login matters |

## Questions

> [!QUESTION]- Why can the server not hash a TOTP secret like a password?
> Verification requires the server to compute HMAC with the same secret as the authenticator. Store it encrypted with a separately protected key, restrict decrypt access, and rotate it after suspected exposure.

> [!QUESTION]- Why remember the last accepted time step?
> A code remains mathematically valid for its entire accepted window. Recording the step and updating it atomically turns a valid captured code into a single-use value at that verifier.

## References

- [RFC 6238 — TOTP](https://www.rfc-editor.org/rfc/rfc6238) — time-step derivation, algorithms, validation windows, and test vectors.
- [RFC 4226 — HOTP](https://www.rfc-editor.org/rfc/rfc4226) — HMAC computation and dynamic truncation used by TOTP.
- [Google Authenticator — Key URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format) — the `otpauth://` provisioning URI convention and its issuer, algorithm, digit, and period parameters.
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html) — enrollment, reset, recovery, rate-limit, and factor-selection guidance.
- [ByteByteGo — How Google Authenticator Works](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-google-authenticator-or-other-types-of-2-factor-authenticators-work.md) — source provisioning and validation flow corrected for guessing, storage, replay, and recovery boundaries.
