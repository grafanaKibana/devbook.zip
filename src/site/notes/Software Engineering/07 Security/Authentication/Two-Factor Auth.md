---
{"dg-publish":true,"permalink":"/software-engineering/07-security/authentication/two-factor-auth/"}
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

## Pitfalls

- **TOTP clock skew**: TOTP codes are time-based. If the server and client clocks differ by more than 30 seconds, valid codes are rejected. Mitigation: accept codes from the previous and next 30-second window (±1 window tolerance).
- **SMS 2FA is phishable**: SMS codes can be intercepted via SIM swapping or SS7 attacks. For high-security applications, use TOTP or FIDO2 instead of SMS.
- **Backup codes stored insecurely**: Backup codes are one-time recovery codes. If stored in plaintext or emailed, they become a single point of failure. Hash them like passwords.

## Questions

> [!QUESTION]- Why is FIDO2/WebAuthn more secure than TOTP?
> TOTP codes can be phished — an attacker can trick a user into entering their code on a fake site. FIDO2 keys are bound to the origin domain: the browser only uses the key for the exact domain it was registered on, making phishing impossible. The private key also never leaves the device.

> [!QUESTION]- When should you use TOTP vs FIDO2?
> TOTP is simpler to implement and works on any device with an authenticator app — use it for most applications. FIDO2 is phishing-resistant and required for high-assurance scenarios (banking, admin access, NIST AAL3). The cost is hardware dependency and more complex enrollment flow.


## References

- [NIST SP 800-63B — Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html) — NIST's authoritative guide on authentication assurance levels and MFA requirements
- [Microsoft — Two-factor authentication with ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/2fa) — official guide for implementing 2FA with ASP.NET Core Identity
- [FIDO Alliance — WebAuthn](https://fidoalliance.org/fido2/) — the FIDO2/WebAuthn standard for phishing-resistant authentication
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/07 Security/07 Security\|07 Security]]
>
> **Pages**
> - [[Software Engineering/07 Security/Authentication/Basic Auth\|Basic Auth]]
> - [[Software Engineering/07 Security/Authentication/Oauth OIDC (OpenId Connect)\|Oauth OIDC (OpenId Connect)]]
> - [[Software Engineering/07 Security/Authentication/Resource-based Auth\|Resource-based Auth]]
> - [[Software Engineering/07 Security/Authentication/SSO (Single Sign-On)\|SSO (Single Sign-On)]]
<!-- whats-next:end -->
