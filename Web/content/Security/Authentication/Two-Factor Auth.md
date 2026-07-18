---
publish: true
created: 2026-07-16T07:38:11.775Z
modified: 2026-07-18T11:30:13.407Z
published: 2026-07-18T11:30:13.407Z
topic:
  - Security
subtopic:
  - Authentication
summary: How independent factors, TOTP, WebAuthn, and recovery change account-takeover risk.
level:
  - "3"
priority: High
status: Ready to Repeat
---

Two-factor authentication (2FA) requires evidence from exactly two independent factor categories: knowledge, possession, or inherence. MFA means two or more. A password plus a second password is still one factor; a password plus a TOTP authenticator combines knowledge and possession.

The engineering boundary includes enrollment and recovery. A phishing-resistant authenticator does not protect an account whose help desk can remove it after answering weak questions.

# Method tradeoffs

| Method | Proof | Phishing and replay | Recovery boundary | Choose it when |
| --- | --- | --- | --- | --- |
| SMS OTP | Control of a phone-number delivery path | Code is phishable; SIM swap and carrier interception add risk | Phone-number recovery can transfer control | Existing users/devices make a stronger factor unavailable |
| [[Security/Authentication/TOTP\|TOTP]] | Possession of a shared authenticator secret | Code is phishable and valid inside the accepted time window | Backup codes or replacement authenticator must be protected | Broad offline authenticator compatibility matters |
| Push approval | Control of an enrolled app/device | Generic approve/deny prompts enable fatigue attacks | Device enrollment and support reset are critical | Enterprise context/number matching is enforced |
| WebAuthn security key | Private key unlocked on an external authenticator | Origin-bound signature over a fresh challenge | Spare key or controlled reenrollment is needed | High-assurance, portable phishing resistance matters |
| Synced passkey | Discoverable WebAuthn credential available through a platform account | Same origin binding; sync-provider account becomes part of recovery trust | Platform sync and account recovery restore credentials | Consumer passwordless UX across devices matters |

Default to passkeys/WebAuthn when the client population supports them. Keep TOTP as a compatibility fallback when needed, and protect fallback and recovery at least as carefully as primary enrollment. Avoid SMS for new high-value systems.

# TOTP

TOTP derives a short code from a shared secret and a time-step counter. The server accepts only a small clock-skew window, rate-limits guesses, and records the last accepted step to reject replay. See [[Security/Authentication/TOTP|TOTP]] for provisioning, validation, secret storage, and recovery mechanics.

# FIDO2 and WebAuthn

WebAuthn defines the browser/API ceremony between a relying party (RP), client, and authenticator. CTAP defines communication with roaming authenticators such as security keys. A passkey is a WebAuthn discoverable credential: the authenticator can identify an account without the user first typing a username.

## Registration ceremony

```text
RP -> Browser: challenge, rp.id, user.id, credential options
Browser: enforce the caller-origin / RP-ID relationship and collect user consent/verification.
Authenticator: create a credential key pair scoped to rp.id
Authenticator -> Browser: authenticator data + attestation statement
Browser -> RP:
  credential ID
  response.clientDataJSON containing type, challenge, and origin
  response.attestationObject containing fmt, authData (authenticatorData), and attStmt
RP: validate challenge, origin, RP ID hash, flags, algorithm, and credential public key
RP: validate the attestation statement and trust path only when attestation policy requires it
RP: store credential ID, public key, user binding, and metadata
```

The attested credential data inside `authenticatorData` carries the credential ID and credential public key. With `none` attestation, the attestation statement can be empty and no attestation signature is returned; the RP still validates the client data, authenticator data, and public key. Other attestation formats may sign the authenticator data plus the hash of `clientDataJSON`, but the RP verifies that evidence only when its enrollment policy asks for attestation. The private key remains under authenticator control. The RP stores a public key, so a database leak does not directly reveal a reusable authentication secret. Registration must be authorized by a recent trusted session; otherwise an attacker who briefly controls an account can enroll their own credential.

## Authentication ceremony

```text
RP -> Browser: fresh unpredictable challenge + rp.id + allowed credentials or discoverable request
Browser: enforce the caller-origin / RP-ID relationship, build clientDataJSON, and invoke an authenticator for rp.id
Authenticator: verify user presence/verification, build authenticatorData with the RP-ID hash, and sign authenticatorData + SHA-256(clientDataJSON)
Browser -> RP: credential ID, authenticatorData, clientDataJSON, signature, optional user handle
RP: validate clientDataJSON type/challenge/origin, authenticatorData RP-ID hash/flags, signature, and credential/user binding
RP: consume the challenge once and create or elevate a session
```

Origin and RP-ID binding give WebAuthn its phishing resistance: a credential registered for `example.com` will not sign a challenge for `examp1e.com`. The fresh challenge and one-time server state stop replay. User verification such as a device PIN or biometric unlocks the authenticator; the biometric is not sent to the website.

![[Assets/System Design 101/982d589bf15322ffe45e26e3298943717d1e15de9ff55cfe4e30e93bd91ccad4.png]]

# Passkey, sync, and attestation choices

| Choice | Benefit | Cost / trust introduced |
| --- | --- | --- |
| Device-bound credential | Key does not leave one authenticator | Lost device requires another credential or recovery |
| Synced passkey | Works across devices and survives device replacement | Platform account, encrypted sync, and its recovery become part of the trust model |
| Discoverable credential | Username-less account selection | Account-discovery UX and privacy need deliberate design |
| Attestation required | Can restrict enrollment to approved authenticator models in managed environments | Reduces consumer compatibility and can add identifying metadata |
| Attestation not required | Broad compatibility and less device metadata | RP cannot enforce a hardware provenance policy |

Attestation says something about the authenticator at registration; it does not establish the human's legal identity and is not required for ordinary consumer passkeys. Decide it from the relying party's assurance policy, not from a blanket belief that more attestation is always safer.

# Failure and recovery behavior

- Expire and consume WebAuthn challenges once, and bind them to the initiating session and intended ceremony.
- Validate `origin` and RP ID on the server through a maintained WebAuthn library; never trust client-provided account identity without matching the stored credential binding.
- Signature counters can signal some cloned authenticators, but zero or non-increasing counters are valid for some implementations. Treat counter anomalies according to authenticator behavior and risk policy, not as the sole replay defense.
- Require recent strong authentication to add or remove a credential. Notify the user and expose named-device/credential revocation.
- Offer multiple credentials or protected recovery codes before loss occurs. A TOTP/SMS fallback restores the fallback's phishing resistance, not WebAuthn's.
- After high-risk recovery, revoke sessions, rotate recovery material, and apply a delay or additional review to sensitive actions where appropriate.

# Questions

> [!QUESTION]- Why does WebAuthn resist a real-time phishing proxy better than TOTP?
> TOTP is a transferable number that a proxy can relay before it expires. WebAuthn signs data bound to the browser-observed origin and RP ID, so a credential for the real site will not produce a valid assertion for the phishing origin.

> [!QUESTION]- Is a synced passkey the same trust model as a hardware security key?
> No. Both use WebAuthn origin-bound public-key credentials, but a synced passkey relies on a platform account and encrypted synchronization/recovery, while a device-bound security key keeps the private key on one authenticator and needs a separate backup path.

# References

- [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/) — registration/authentication ceremonies, RP binding, discoverable credentials, attestation, and verification rules.
- [FIDO Alliance — Passkeys](https://fidoalliance.org/passkeys/) — passkey terminology, device-bound and synced credential models, and deployment material.
- [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html) — authenticator assurance, phishing resistance, recovery, and lifecycle guidance.
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html) — factor selection, reset, recovery, and bypass controls.
- [Microsoft — Enable QR code generation for TOTP authenticator apps in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-enable-qrcodes) — official ASP.NET Core TOTP enrollment mechanics.
- [ByteByteGo — Is Passkey Shaping a Passwordless Future?](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/is-passkey-shaping-a-passwordless-future.md) — source passkey overview expanded with complete ceremonies, trust choices, and recovery risk.
