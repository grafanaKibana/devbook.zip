---
publish: true
created: 2026-07-11T21:48:35.037Z
modified: 2026-07-17T05:46:26.705Z
published: 2026-07-17T05:46:26.705Z
topic:
  - Security
subtopic:
  - Security
summary: A compact claims format whose signature, issuer, audience, lifetime, and intended use must be validated before authorization.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# JWT Bearer Authentication

JWT (JSON Web Token) is a compact claims format that can be signed and/or encrypted. In JWT Bearer authentication, a client sends a bearer access token in the `Authorization` header and the API validates it under rules fixed for that token use. Local validation can avoid a per-request token-store lookup, but revocation, reference data, authorization, or key discovery may still require shared state.

## JWT Structure

A compact signed JWT is three base64url-encoded segments separated by dots: `header.payload.signature`. This complete RFC example is safe to decode for study but long expired and must not be accepted as a live credential:

```text
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2UiLCJleHAiOjEzMDA4MTkzODAsImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

Decoding the first two segments yields readable JSON:

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

The signature covers the encoded header and payload. It can establish integrity and authenticity only after the validator pins an allowed algorithm and resolves a trusted verification key for the expected issuer. Base64url provides representation, not confidentiality: anyone holding the token can read these claims. JWE is a separate encrypted representation when a protocol requires confidential claims.

Validation is a gate, not authorization. The API must verify the signature, issuer, audience, expiry and not-before times, and the token type or mutually exclusive validation rules for its use. It must then authorize the requested resource and action. A valid token saying `is_root: true` grants nothing unless the issuer is trusted for that claim and the API's policy deliberately maps it to the operation.

![[Assets/System Design 101/dfbab78d0029e2e6d02f6fe35b26d296a0a7b961256c1c41b1c70736a76f2e68.png]]

## Signing Algorithms

**HS256 (HMAC-SHA256)**: Symmetric — the same secret key creates and verifies the MAC. Every validator can therefore mint tokens. Use it only when that shared trust and key-distribution boundary is deliberate.

**RS256 (RSA-SHA256)**: Asymmetric — the issuer signs with a private key; validators verify with the public key. The public key can be published (JWKS endpoint). Use for multi-service architectures where multiple services validate tokens.

**ES256 (ECDSA-SHA256)**: Asymmetric like RS256 and produces smaller keys and signatures. Choose it when the issuer, validators, libraries, and key-management path all support its exact JOSE representation.

## ASP.NET Core Integration

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

The middleware retrieves the OpenID Connect discovery document for the configured authority, reads its `jwks_uri`, and fetches and caches that issuer's verification keys. Keep the discovery issuer, metadata address, and key set bound to the expected authority: a token's `kid` may select a key only inside that trusted issuer-bound set, and token-controlled `jku` or `x5u` URLs must not introduce another key source.

## Pitfalls

**`alg: none` attack**: Some early JWT libraries accepted tokens with `alg: none` in the header, bypassing signature verification. Fix: always explicitly specify allowed algorithms in `TokenValidationParameters.ValidAlgorithms`. Never accept `none`.

**Algorithm-confusion attack (RS256 → HS256)**: the _other_ famous JWT vuln. The server expects an RS256 (asymmetric) token and verifies with the issuer's **public** key. An attacker forges a token with the header changed to **HS256** (symmetric) and signs it using that _public key as the HMAC secret_ — which is public. A library that picks the verification algorithm from the token's own header will happily verify it. Fix (same root cause as `alg:none`): **pin the expected algorithm server-side** (`ValidAlgorithms = ["RS256"]`); never let the token's header choose how it's verified.

**Long expiry times**: local JWT validation does not consult revocation state, so a stolen 24-hour bearer token may remain useful for 24 hours. Use access-token lifetimes matched to the risk and a separately protected renewal mechanism. High-risk systems can consult revocation or session state, accepting that lookup and availability cost.

**Browser storage without a threat model**: JavaScript-readable storage exposes bearer tokens to successful XSS. HttpOnly cookies prevent direct script reads but are attached automatically, so CSRF defenses and cookie scope become part of the design. A backend-for-frontend can keep access tokens off the browser; choose the pattern against XSS, CSRF, device, and deployment constraints rather than treating one storage location as universally safe.

**Missing audience validation**: Without audience validation, a JWT issued for Service A can be used against Service B. Fix: always validate `aud` claim. Set `ValidateAudience = true` and specify `ValidAudiences`.

## Tradeoffs

| Decision axis | Locally validated JWT | Opaque reference token |
| --- | --- | --- |
| Validation path | Signature and claim checks in each resource server | Introspection or session-store lookup |
| Revocation and claim changes | Stale until expiry unless extra state is consulted | Effective when the backing record changes |
| Leakage | Exposes readable claims and a usable bearer credential | Exposes a usable bearer reference without embedded claims |
| Availability | Depends on cached issuer keys and local policy | Depends on the token service or replicated store |

**Use a locally validated JWT** when independent validation and bounded issuer outages matter, the claim set can remain valid for the token lifetime, and every resource server can enforce the same validation profile.

**Use an opaque token** when central session control, current authorization data, or immediate invalidation matters enough to pay for an online lookup.

## Questions

> [!QUESTION]- What is a JWT token and why is it not encrypted by default?
>
> - JWT is a compact token format: `header.payload.signature` (base64url encoded).
> - Signed (JWS) means the signature proves integrity and authenticity under the selected trusted key; issuer validation binds that key and token to the expected issuer. The payload is still readable by anyone with the token.
> - Encryption (JWE) is a separate standard that wraps the JWT in an encrypted envelope.
> - Tradeoff: signed-only JWTs are simpler and faster to validate; JWE adds encryption overhead and key management complexity.

> [!QUESTION]- Why should JWTs have short expiry times?
>
> - A locally validated bearer token remains usable until expiry unless the resource server also checks revocation or session state.
> - Shorter lifetimes bound that replay window but increase renewal traffic and dependence on the issuer.
> - Refresh tokens or another renewal credential need stronger storage, rotation, replay detection, and revocation than access tokens.
> - Choose the lifetime from the operation's impact and the system's ability to detect and terminate compromise, not a universal minute value.

## References

- [ByteByteGo — Explaining JWT](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/explaining-json-web-token-jwt-to-a-10-year-old-kid.md) — the pinned recovered source and exact adopted visual for the structure explanation.
- [RFC 8725 — JWT Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725) — algorithm verification, issuer and audience validation, explicit typing, and cross-JWT confusion defenses.
- [RFC 7519 — JWT](https://datatracker.ietf.org/doc/html/rfc7519) — the JWT specification; defines structure, claims, and signing
- [jwt.io](https://jwt.io/) — interactive JWT decoder and algorithm reference; useful for debugging tokens
- [Microsoft — JWT Bearer in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/jwt-authn) — official ASP.NET Core JWT authentication guide
- [RFC 7517 — JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517) — the JWKS standard for publishing public keys
