---
publish: true
created: 2026-08-20T20:41:15.667Z
modified: 2026-08-20T20:41:15.667Z
published: 2026-08-20T20:41:15.667Z
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

Two-factor authentication (2FA) requires evidence from two distinct factor categories: knowledge, possession, or inherence. MFA covers two or more factors. Two passwords remain one factor category. A password plus a TOTP authenticator combines knowledge with possession.

Enrollment and recovery belong to the same security boundary as login. A phishing-resistant authenticator cannot protect an account when weak help-desk questions are enough to remove it.

# Method Tradeoffs

| Method | Proof | Phishing and replay | Recovery boundary | Choose it when |
| --- | --- | --- | --- | --- |
| SMS OTP | Control of a phone-number delivery path | Code is phishable. SIM swap and carrier interception add risk | Phone-number recovery can transfer control | Existing users/devices make a stronger factor unavailable |
| [[Security/Authentication/TOTP\|TOTP]] | Possession of a shared authenticator secret | Code is phishable and valid inside the accepted time window | Backup codes or replacement authenticator must be protected | Broad offline authenticator compatibility matters |
| Push approval | Control of an enrolled app/device | Generic approve/deny prompts enable fatigue attacks | Device enrollment and support reset are critical | Enterprise context/number matching is enforced |
| WebAuthn security key | Private key unlocked on an external authenticator | Origin-bound signature over a fresh challenge | Spare key or controlled reenrollment is needed | High-assurance, portable phishing resistance matters |
| Synced passkey | Discoverable WebAuthn credential available through a platform account | Same origin binding. Sync-provider account becomes part of recovery trust | Platform sync and account recovery restore credentials | Consumer passwordless UX across devices matters |

Passkeys and WebAuthn are the default when the client population supports them. TOTP remains a compatibility fallback. Recovery and fallback paths need the same scrutiny as primary enrollment, and SMS is a poor choice for new high-value systems.

# TOTP

TOTP derives a short code from a shared secret and a time-step counter. The server accepts only a small clock-skew window, rate-limits guesses, and records the last accepted step to reject replay. See [[Security/Authentication/TOTP|TOTP]] for provisioning, validation, secret storage, and recovery mechanics.

# FIDO2 and WebAuthn

WebAuthn defines the ceremony among a relying party (RP), client, and authenticator. CTAP covers communication with roaming authenticators such as security keys. A passkey is a discoverable WebAuthn credential, so the authenticator can identify an account before a username is entered.

A WebAuthn credential is not automatically multi-factor. The assertion signature proves control of the credential, while user presence such as touching a key shows interaction and authentication intent. Multi-factor use also requires a local activation factor such as a PIN or biometric, a request for user verification, and server validation of the resulting UV flag. Without verified UV, the credential is treated as a single-factor cryptographic authenticator.

## Registration Ceremony

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

Attested credential data inside `authenticatorData` carries the credential ID and public key. With `none` attestation, the statement can be empty and no attestation signature is returned. The RP still validates client data, authenticator data, and the credential key. Other formats may sign authenticator data plus the hash of `clientDataJSON`. That evidence is verified only when enrollment policy requires attestation.

The private key remains under authenticator control, while the RP stores its public counterpart. A database leak therefore does not directly expose a reusable authentication secret. Registration still needs a recent trusted session, because brief account control is otherwise enough to enroll an attacker's credential.

## Authentication Ceremony

```text
RP -> Browser: fresh unpredictable challenge + rp.id + allowed credentials or discoverable request
Browser: enforce the caller-origin / RP-ID relationship, build clientDataJSON, and invoke an authenticator for rp.id
Authenticator: verify user presence/verification, build authenticatorData with the RP-ID hash, and sign authenticatorData + SHA-256(clientDataJSON)
Browser -> RP: credential ID, authenticatorData, clientDataJSON, signature, optional user handle
RP: validate clientDataJSON type/challenge/origin, authenticatorData RP-ID hash/flags, signature, and credential/user binding
RP: consume the challenge once and create or elevate a session
```

Origin and RP-ID binding provide phishing resistance: a credential registered for `example.com` will not sign for `examp1e.com`. A fresh challenge and one-time server state stop replay. A device PIN or biometric can activate the authenticator and set user verification. Biometric data stays local to the authenticator or device.

![[Assets/Security/Security-Two-Factor Auth-18120000.png]]

# Passkey, Sync, and Attestation Choices

| Choice | Benefit | Cost / trust introduced |
| --- | --- | --- |
| Device-bound credential | Key does not leave one authenticator | Lost device requires another credential or recovery |
| Synced passkey | Works across devices and survives device replacement | Platform account, encrypted sync, and its recovery become part of the trust model |
| Discoverable credential | Username-less account selection | Account-discovery UX and privacy need deliberate design |
| Attestation required | Can restrict enrollment to approved authenticator models in managed environments | Reduces consumer compatibility and can add identifying metadata |
| Attestation not required | Broad compatibility and less device metadata | RP cannot enforce a hardware provenance policy |

Attestation describes the authenticator at registration. It does not establish a person's legal identity and is unnecessary for ordinary consumer passkeys. The relying party's assurance policy decides whether hardware provenance is worth the compatibility and privacy cost.

# Failure and Recovery Behavior

- Expire and consume WebAuthn challenges once, and bind them to the initiating session and intended ceremony.
- Validate `origin` and RP ID on the server through a maintained WebAuthn library. Never trust client-provided account identity without matching the stored credential binding.
- Signature counters can signal some cloned authenticators, but zero or non-increasing counters are valid for some implementations. Treat counter anomalies according to authenticator behavior and risk policy, not as the sole replay defense.
- Require recent strong authentication to add or remove a credential. Notify the user and expose named-device/credential revocation.
- Offer multiple credentials or protected recovery codes before loss occurs. A TOTP/SMS fallback restores the fallback's phishing resistance, not WebAuthn's.
- After high-risk recovery, revoke sessions, rotate recovery material, and apply a delay or additional review to sensitive actions where appropriate.

# References

- [Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/)
- [Passkeys](https://fidoalliance.org/passkeys/)
- [NIST SP 800-63B-4: Authentication and Authenticator Management](https://pages.nist.gov/800-63-4/sp800-63b.html)
