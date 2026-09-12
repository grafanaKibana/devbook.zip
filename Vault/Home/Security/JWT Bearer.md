---
topic:
  - Security
subtopic:
  - Security
summary: "A compact claims format whose signature, issuer, audience, lifetime, and intended use must be validated before authorization."
level:
  - "4"
priority: High
status: Ready to Repeat

publish: true
---

JSON Web Token (JWT) is a claims format carried inside a JSON Web Signature or JSON Web Encryption object. In JWT bearer authentication, a client presents an access token and the resource server validates it under rules fixed for that token kind. Possession is enough to use a bearer token, so transport, storage, logging, and replay boundaries matter as much as signature verification.

Local signature validation can remove a token-database lookup from the request path. It does not make the system stateless. Key discovery, revocation, session control, current authorization data, and telemetry may still depend on shared services.

# JWT Structure

A compact JWS containing a JWT has three base64url-encoded segments separated by dots: protected header, payload, and signature. The complete RFC example below is useful for decoding practice. It expired in 2011 and must never be accepted as a credential.

```text
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2UiLCJleHAiOjEzMDA4MTkzODAsImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

Decoding the first two segments reveals JSON:

```json
{
  "typ": "JWT",
  "alg": "HS256"
}
```

```json
{
  "iss": "joe",
  "exp": 1300819380,
  "http://example.com/is_root": true
}
```

The signature covers the encoded protected header and payload. Integrity becomes meaningful only after the validator accepts an allowed algorithm and resolves a trusted key under the expected issuer's configuration. Base64url is an encoding, not encryption. Anyone holding this token can read its claims. Confidential claims require an appropriate JWE profile or, more often, exclusion from a bearer token altogether.

Validation is a gate before authorization. The resource server verifies the cryptographic protection and applies the token profile's issuer, audience, lifetime, type, and other required claim rules. It then authorizes the requested action against the actual resource. A valid `is_root: true` claim grants nothing unless the trusted issuer is authoritative for that meaning and the resource server's policy maps it to the operation.

![[Security/Security-JWT Bearer-18120000.png|theme-aware]]

# Signing Algorithms

**HS256 (HMAC-SHA-256):** The same symmetric key creates and verifies the MAC. Every validator holding that key can mint indistinguishable tokens. This is safe only when the shared issuance authority is deliberate.

**RS256 (RSA with SHA-256):** The issuer signs with a private key and validators use the public key. Publishing verification keys through a trusted JWKS endpoint separates validation from issuance authority.

**ES256 (ECDSA using P-256 and SHA-256):** This also separates signing and verification and uses smaller keys and signatures than RS256. Every issuer, verifier, hardware boundary, and library must support the JOSE encoding and rotation path selected by the token profile.

# ASP.NET Core Integration

```csharp
// Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://login.microsoftonline.com/{tenantId}/v2.0";
        options.Audience = "api://my-api-client-id";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidAlgorithms = ["RS256"],
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

app.UseAuthentication();
app.UseAuthorization();
```

With an authority configured, the handler obtains OpenID Connect metadata, follows its `jwks_uri`, and caches the issuer's verification keys. That convenience depends on a strict trust chain. The metadata issuer, address, and key set must remain bound to the expected authority. A token's `kid` selects among trusted keys. Token-controlled `jku` or `x5u` values must not create a new key source.

# Pitfalls

**Unsecured or unexpected algorithm:** A validator that accepts `alg: none` or an algorithm outside the token profile loses its cryptographic gate. Allowed algorithms come from server configuration, not the token. They should be pinned to the profile and kept mutually exclusive from other JWT kinds.

**Algorithm confusion:** A vulnerable validator expects RSA signatures but also permits HMAC with the same key material. An attacker can label a forged token as HS256 and use the public RSA key bytes as the HMAC secret. The repair is a validation profile that pins the algorithm and compatible key type. The protected code above does this with `ValidAlgorithms = ["RS256"]`.

**Lifetime mistaken for revocation:** A locally validated token can remain usable until expiry even after the user's state changes. Use a lifetime matched to the operation's risk and protect the renewal credential more strongly. Systems that need immediate invalidation must consult revocation or session state and accept that dependency.

**Browser storage chosen by slogan:** JavaScript-readable storage exposes bearer tokens to successful XSS. `HttpOnly` cookies prevent direct reads but introduce ambient-cookie and CSRF boundaries. A backend-for-frontend can keep access tokens out of browser JavaScript. The choice depends on the application topology and threat model.

**Audience omitted from the validation profile:** A resource server that accepts a token intended for another service creates cross-service replay. Bearer access-token profiles should identify the intended resource, and the server must match that audience rather than accepting any token from a familiar issuer.

# Tradeoffs

| Decision axis | Locally validated JWT | Opaque reference token |
| --- | --- | --- |
| Validation path | Signature and claim checks in each resource server | Introspection or session-store lookup |
| Revocation and claim changes | Stale until expiry unless extra state is consulted | Effective when the backing record changes |
| Leakage | Exposes readable claims and a usable bearer credential | Exposes a usable bearer reference without embedded claims |
| Availability | Depends on cached issuer keys and local policy | Depends on the token service or replicated store |

A locally validated JWT fits when resource servers need independent validation, the claim set may remain stale for the token lifetime, and every server can enforce the same token profile.

An opaque reference fits when central session control or immediate invalidation matters enough to require an online record. Neither representation removes resource authorization.

# References

- [JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519)
- [Configure JWT bearer authentication in ASP.NET Core](https://learn.microsoft.com/aspnet/core/security/authentication/configure-jwt-bearer-authentication)
