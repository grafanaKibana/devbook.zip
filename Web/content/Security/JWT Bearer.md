---
publish: true
created: 2026-07-11T21:48:35.037Z
modified: 2026-07-11T21:48:35.038Z
published: 2026-07-11T21:48:35.038Z
topic:
  - Security
subtopic:
  - Security
summary: A compact, self-contained signed token validated statelessly without a database lookup.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# JWT Bearer Authentication

JWT (JSON Web Token) is a compact, self-contained token format for passing claims between parties. In web APIs, JWT Bearer authentication means the client sends a signed JWT in the `Authorization: Bearer <token>` header, and the server validates the signature and claims without a database lookup. This makes JWTs stateless and horizontally scalable.

## JWT Structure

A JWT is three base64url-encoded segments separated by dots: `header.payload.signature`.

```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

```json
{
  "sub": "user-123",
  "email": "alice@example.com",
  "roles": ["admin"],
  "iat": 1700000000,
  "exp": 1700003600
}
```

The signature is computed over `base64url(header) + '.' + base64url(payload)` using the algorithm specified in the header. **A signed JWT is not encrypted** — anyone who has the token can read the payload. Use JWE (JSON Web Encryption) if the payload must be confidential.

## Signing Algorithms

**HS256 (HMAC-SHA256)**: Symmetric — the same secret key signs and verifies. Simple but requires sharing the secret with every service that validates tokens. Use only when the issuer and validator are the same service.

**RS256 (RSA-SHA256)**: Asymmetric — the issuer signs with a private key; validators verify with the public key. The public key can be published (JWKS endpoint). Use for multi-service architectures where multiple services validate tokens.

**ES256 (ECDSA-SHA256)**: Asymmetric like RS256 but with smaller key sizes and faster verification. Preferred for new systems.

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
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

app.UseAuthentication();
app.UseAuthorization();
```

The middleware automatically fetches the JWKS (public keys) from the authority's `/.well-known/openid-configuration` endpoint and caches them.

## Pitfalls

**`alg: none` attack**: Some early JWT libraries accepted tokens with `alg: none` in the header, bypassing signature verification. Fix: always explicitly specify allowed algorithms in `TokenValidationParameters.ValidAlgorithms`. Never accept `none`.

**Algorithm-confusion attack (RS256 → HS256)**: the _other_ famous JWT vuln. The server expects an RS256 (asymmetric) token and verifies with the issuer's **public** key. An attacker forges a token with the header changed to **HS256** (symmetric) and signs it using that _public key as the HMAC secret_ — which is public. A library that picks the verification algorithm from the token's own header will happily verify it. Fix (same root cause as `alg:none`): **pin the expected algorithm server-side** (`ValidAlgorithms = ["RS256"]`); never let the token's header choose how it's verified.

**Long expiry times**: JWTs cannot be revoked without a token blacklist (which defeats the stateless benefit). A token with a 24-hour expiry that is stolen gives the attacker 24 hours of access. Fix: use short expiry (15-60 minutes) with refresh tokens. Revoke refresh tokens on logout.

**Storing JWTs in localStorage**: localStorage is accessible to JavaScript, making it vulnerable to XSS attacks. Fix: store JWTs in HttpOnly cookies (not accessible to JS). Accept the CSRF tradeoff and mitigate with `SameSite=Strict`.

**Missing audience validation**: Without audience validation, a JWT issued for Service A can be used against Service B. Fix: always validate `aud` claim. Set `ValidateAudience = true` and specify `ValidAudiences`.

## Tradeoffs

| | JWT (Stateless) | Opaque Token (Stateful) |
|---|---|---|
| Revocation | Hard (requires blacklist) | Easy (delete from store) |
| Scalability | Excellent (no DB lookup) | Requires shared token store |
| Payload size | Larger (claims in token) | Small (just a reference) |
| Introspection | Self-contained | Requires token endpoint call |

**Use JWT** when: you have multiple services that need to validate tokens independently, you want stateless horizontal scaling, and you can accept short expiry + refresh token rotation.

**Use opaque tokens** when: you need immediate revocation (e.g., financial transactions, session invalidation on logout), or the token payload would be too large.

## Questions

> [!QUESTION]- What is a JWT token and why is it not encrypted by default?
>
> - JWT is a compact token format: `header.payload.signature` (base64url encoded).
> - Signed (JWS) means the signature proves integrity and issuer, but the payload is readable by anyone with the token.
> - Encryption (JWE) is a separate standard that wraps the JWT in an encrypted envelope.
> - Tradeoff: signed-only JWTs are simpler and faster to validate; JWE adds encryption overhead and key management complexity.

> [!QUESTION]- Why should JWTs have short expiry times?
>
> - JWTs are stateless — the server cannot revoke them without a blacklist (which defeats the stateless benefit).
> - A stolen JWT is valid until it expires. Short expiry (15-60 min) limits the damage window.
> - Refresh tokens (stored server-side) allow issuing new JWTs without re-authentication.
> - Tradeoff: short expiry requires refresh token infrastructure; long expiry is simpler but riskier.

## References

- [RFC 7519 — JWT](https://datatracker.ietf.org/doc/html/rfc7519) — the JWT specification; defines structure, claims, and signing
- [jwt.io](https://jwt.io/) — interactive JWT decoder and algorithm reference; useful for debugging tokens
- [Microsoft — JWT Bearer in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/jwt-authn) — official ASP.NET Core JWT authentication guide
- [RFC 7517 — JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517) — the JWKS standard for publishing public keys
