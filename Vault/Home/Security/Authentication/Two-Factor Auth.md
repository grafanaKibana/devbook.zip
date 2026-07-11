---
topic:
  - Security
subtopic:
  - Authentication
summary: "Requires two independent factors — something you know plus something you have or are — so a stolen password alone can't authenticate."
level:
  - "3"
priority: High
status: Ready to Repeat

publish: true
---

# Two-Factor Authentication (2FA)

Two-factor authentication (2FA) requires users to prove their identity with two independent factors: something they know (password) and something they have (OTP device, phone) or are (biometrics). Even if a password is stolen, the attacker cannot authenticate without the second factor.

## TOTP (Time-Based One-Time Passwords)

TOTP (RFC 6238) generates a 6-digit code that changes every 30 seconds. The server and authenticator app share a secret key. Both compute `HMAC-SHA1(secret, floor(time/30))` and compare the result.

**Apps**: Google Authenticator, Microsoft Authenticator, Authy.

```csharp
// ASP.NET Core Identity: enable 2FA with TOTP
// In Program.cs:
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = true;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Generate TOTP secret for a user:
var key = await _userManager.GetAuthenticatorKeyAsync(user);
if (string.IsNullOrEmpty(key))
{
    await _userManager.ResetAuthenticatorKeyAsync(user);
    key = await _userManager.GetAuthenticatorKeyAsync(user);
}
// Display key as QR code for the user to scan with their authenticator app
```

## FIDO2 / WebAuthn

FIDO2 (Fast Identity Online) uses public-key cryptography with hardware security keys (YubiKey) or platform authenticators (Windows Hello, Touch ID). The private key never leaves the device. Phishing-resistant — the key is bound to the origin domain.

**When to use**: High-security applications (banking, enterprise admin access). More secure than TOTP but requires hardware or platform support.

> [!NOTE]
> **Passkeys** are the consumer branding of FIDO2/WebAuthn *discoverable credentials* — synced across devices (iCloud Keychain, Google Password Manager) so you sign in with just Face ID/fingerprint and **no password**. Being phishing-resistant by design (bound to the origin), a passkey serves as first *and* second factor at once, which is why the industry is pushing passwordless. Terminology: **2FA** is exactly two factors; **MFA** is two *or more*.

```csharp
// FIDO2 / WebAuthn with Fido2NetLib (server-side assertion verification)
// 1. During registration: store the credential public key per user
// 2. During login: verify the signed assertion

var fido2 = new Fido2(new Fido2Configuration
{
    ServerDomain = "example.com",
    ServerName = "My App",
    Origins = new HashSet<string> { "https://example.com" }
});

// Verify assertion (login step)
var result = await fido2.MakeAssertionAsync(
    clientResponse,          // JSON from navigator.credentials.get()
    options,                  // stored assertion options from session
    storedPublicKey,          // credential public key from registration
    storedSignCount,          // replay attack counter
    isUserHandleOwnerOfCredential);

// result.Status == "ok" means authentication succeeded
// result.Counter must be > storedSignCount (replay protection)
```

## Pitfalls

- **TOTP clock skew**: TOTP codes are time-based. If the server and client clocks differ by more than 30 seconds, valid codes are rejected. Mitigation: accept codes from the previous and next 30-second window (±1 window tolerance).
- **SMS 2FA is phishable**: SMS codes can be intercepted via SIM swapping or SS7 attacks. For high-security applications, use TOTP or FIDO2 instead of SMS.
- **Backup codes stored insecurely**: Backup codes are one-time recovery codes. If stored in plaintext or emailed, they become a single point of failure. Hash them like passwords.

## Tradeoffs

| Method | Phishing Resistance | Hardware Required | Implementation Complexity | Use when |
|--------|-------------------|-----------------|--------------------------|----------|
| SMS OTP | None (SIM swap, SS7) | No | Minimal | Legacy systems; low-security consumer apps where UX matters most |
| TOTP (Google Authenticator) | Low (code can be phished) | Authenticator app | Low | Most applications; good balance of security and UX |
| Push notification (Duo, Okta) | Low (MFA fatigue attacks) | Smartphone | Medium | Enterprise SSO; users are trained to verify context before approving |
| FIDO2 / WebAuthn | High (origin-bound) | Security key or platform authenticator | High | High-assurance scenarios: banking, admin access, NIST AAL3 |

**Decision rule**: default to TOTP for most applications — it is widely supported, requires no hardware, and is significantly more secure than SMS. Use FIDO2 when phishing resistance is a hard requirement (financial services, privileged access). Avoid SMS OTP for new systems; it is the weakest 2FA method and vulnerable to SIM swapping.


## Questions

> [!QUESTION]- Why is FIDO2/WebAuthn more secure than TOTP?
> TOTP codes can be phished — an attacker can trick a user into entering their code on a fake site. FIDO2 keys are bound to the origin domain: the browser only uses the key for the exact domain it was registered on, making phishing impossible. The private key also never leaves the device.

> [!QUESTION]- When should you use TOTP vs FIDO2?
> TOTP is simpler to implement and works on any device with an authenticator app — use it for most applications. FIDO2 is phishing-resistant and required for high-assurance scenarios (banking, admin access, NIST AAL3). The cost is hardware dependency and more complex enrollment flow.


## References

- [NIST SP 800-63B — Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html) — NIST's authoritative guide on authentication assurance levels and MFA requirements
- [Microsoft — Two-factor authentication with ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/2fa) — official guide for implementing 2FA with ASP.NET Core Identity
- [FIDO Alliance — WebAuthn](https://fidoalliance.org/fido2/) — the FIDO2/WebAuthn standard for phishing-resistant authentication
