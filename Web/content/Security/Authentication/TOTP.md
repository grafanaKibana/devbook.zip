---
publish: true
created: 2026-08-20T20:41:15.666Z
modified: 2026-08-25T13:45:27.876Z
published: 2026-08-25T13:45:27.876Z
topic:
  - Security
subtopic:
  - Authentication
summary: How time-based one-time passwords are provisioned, generated, validated, and recovered.
level:
  - "3"
priority: High
status: Ready to Repeat
---

TOTP is a possession-factor protocol built on a secret shared by an authenticator and a verifier. Both derive the same time-step counter, compute HMAC, and truncate the result into a short decimal code. No network connection is needed to generate it. The code strengthens password-only login while remaining phishable and replayable inside the verifier's acceptance window.

TOTP fits systems that need broad offline authenticator compatibility. WebAuthn and passkeys are the stronger choice when phishing resistance matters.

# Provisioning

1. After fresh primary authentication, the server generates a random secret for this account and device.
2. It stores the secret encrypted under a separately managed key. Verification needs the original bytes, so a one-way password hash cannot replace encryption.
3. It returns an `otpauth://` URI over an authenticated TLS session, commonly rendered as a QR code. `otpauth://` is an authenticator-app provisioning convention documented by Google Authenticator, not part of RFC 6238.
4. The authenticator stores the secret. The user enters one generated code so the server can confirm enrollment before enabling the factor.
5. The server generates high-entropy, single-use recovery codes, stores only their hashes, and shows the plaintext once.

```text
otpauth://totp/DevBook:alice@example.com
  ?secret=<base32-secret>
  &issuer=DevBook
  &algorithm=SHA1
  &digits=6
  &period=30
```

The QR code contains the shared secret. Screenshots, analytics, logs, and backup exports can therefore clone the authenticator. Display and replacement require recent authentication, and rotation invalidates the previous secret once the new factor is confirmed.

![[Assets/Security/Security-TOTP-18120000.jpg|theme-aware]]

> [!WARNING] Diagram caveat
> TOTP does not concatenate a secret and timestamp. It converts time to a moving counter, computes HMAC over the encoded counter, applies dynamic truncation, and reduces the result to the configured number of digits. The verifier accepts only a bounded time-step window.

# Moving Factor and Code Generation

For Unix time `t`, start time `T0`, and step size `X`, TOTP derives the moving factor:

```text
counter = floor((t - T0) / X)
hotp = HMAC(secret, counter encoded as an 8-byte big-endian integer)
offset = low 4 bits of the last HMAC byte
binary = 31-bit integer selected at offset
code = binary mod 10^digits, left-padded with zeroes
```

The common interoperable profile uses a 30-second step and six digits. RFC 6238 permits HMAC-SHA-1, SHA-256, or SHA-512. Algorithm, digit count, and period are shared protocol parameters, so changing one side alone breaks verification. SHA-1 here is the HMAC primitive used by the widespread profile. It is neither a password hash nor a digital signature.

# Validation

A six-digit shape proves nothing by itself. The verifier loads the enrolled secret, derives the current time step, evaluates a small configured window, compares candidates with a constant-time routine, and applies account-level rate limits.

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

A ±1 window tolerates modest clock skew and triples the valid code set. With six digits and three accepted steps, one random attempt succeeds with probability no greater than about 3 in 1,000,000 before rate limiting. Attackers can distribute guesses and try again in later windows, so the verifier throttles per account and source, delays or blocks abuse, and alerts on bursts.

The verifier stores the last accepted time step for each authenticator. Two simultaneous submissions of one code must pass through a single atomic compare-and-update, leaving at most one accepted. Server clocks stay synchronized and monitored. Widening the window is not a substitute for fixing drift.

# Recovery and Lifecycle

- Require a recent strong authentication before enrolling, replacing, or removing TOTP.
- Notify the account through an independent channel when a factor changes.
- Hash recovery codes, mark each used code atomically, and rotate the entire set after use or exposure.
- Revoke sessions or require step-up authentication after sensitive recovery, depending on the threat model.
- Support multiple named authenticators when losing one device must not force an insecure help-desk bypass.
- Do not let knowledge-based questions or email-only recovery silently downgrade a high-assurance account.

The shared secret is present at both ends, so a server database/key compromise can clone every affected authenticator. WebAuthn instead stores a public key at the server and produces an origin-bound signature over a fresh challenge. That is why passkeys resist real-time phishing better than TOTP, even though their sync and account-recovery providers introduce different trust decisions.

# Tradeoffs

| Method | Verifier stores | Phishing/replay boundary | Recovery cost | Use when |
| --- | --- | --- | --- | --- |
| SMS OTP | Phone destination and delivery state | Phishable. SIM swap and carrier path add risk | Familiar but tied to phone-number recovery | Legacy compatibility is mandatory |
| TOTP | Decryptable shared secret | Phishable. Replayable inside accepted window unless step is recorded | Requires backup codes or additional authenticators | Offline, broadly compatible app factor is needed |
| WebAuthn/passkey | Public key and credential metadata | Origin-bound challenge/response. No reusable server secret | Depends on device, sync, and account recovery model | Phishing resistance or passwordless login matters |

# References

- [TOTP: Time-Based One-Time Password Algorithm](https://www.rfc-editor.org/rfc/rfc6238)
- [Google Authenticator Key URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
