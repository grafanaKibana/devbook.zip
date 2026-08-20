---
topic:
  - Security
subtopic:
  - Authentication
summary: "The simplest HTTP scheme: Base64-encoded credentials in the Authorization header (RFC 7617)."
level:
  - "4"
priority: High
status: Ready to Repeat

publish: true
---

HTTP Basic authentication sends a reusable user identifier and password in the `Authorization` header. Base64 makes the bytes safe for the header syntax. It provides no confidentiality. RFC 7617 defines the scheme and its protection-space behavior.

# Mechanism

1. A server challenges with `WWW-Authenticate: Basic realm="My API"`.
2. The client sends `Authorization: Basic base64(username:password)` after the challenge or preemptively when reusing credentials for the same protection space.
3. The server decodes the credential, separates the user identifier at the first colon, and verifies the password.
4. Missing or invalid credentials produce `401 Unauthorized` with an applicable challenge.

The optional `charset` parameter appears on the challenge and is advisory. RFC 7617 defines only `UTF-8`. It signals NFC normalization followed by UTF-8 encoding. When the parameter is absent, the legacy default remains deliberately unspecified for compatibility, except that it must map US-ASCII characters to their matching single-byte values. Non-ASCII credentials therefore need an agreed encoding profile rather than an assumed default.

TLS is mandatory because the credential is otherwise exposed to every observer on the path. TLS protects transit to its termination point. Logs, proxies, traces, and the verifier can still disclose the reusable password.

# ASP.NET Core Example

```csharp
// Middleware to validate Basic Auth credentials
app.Use(async (context, next) =>
{
    var authHeader = context.Request.Headers.Authorization.ToString();
    if (!authHeader.StartsWith("Basic "))
    {
        context.Response.StatusCode = 401;
        context.Response.Headers.WWWAuthenticate = "Basic realm=\"My API\"";
        return;
    }
    var credentials = System.Text.Encoding.UTF8.GetString(
        Convert.FromBase64String(authHeader["Basic ".Length..]));
    var parts = credentials.Split(':', 2);
    if (parts[0] != "admin" || parts[1] != "secret")
    {
        context.Response.StatusCode = 401;
        return;
    }
    await next();
});
```

For service-to-service calls, Basic Auth is typically sent via `HttpClient`:

```csharp
// Sending Basic Auth from a client
var credentials = Convert.ToBase64String(
    System.Text.Encoding.UTF8.GetBytes("service-account:secret-password"));
httpClient.DefaultRequestHeaders.Authorization =
    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);

var response = await httpClient.GetAsync("/api/internal/data");
```

These snippets show the wire format, not a production authentication handler. The server sketch assumes valid Base64 and a colon, compares the scheme case-sensitively even though HTTP scheme names are case-insensitive, and embeds a plaintext secret. A real implementation must reject malformed input without crashing the pipeline, handle the negotiated character encoding, verify a stored password hash through a credential-verification library, emit the correct challenge, rate-limit guessing, and keep credentials out of configuration files and logs. ASP.NET Core authentication handlers provide the right pipeline boundary for that work.

# When to Use

- A constrained legacy integration that already requires the scheme.
- A small machine-to-machine boundary with TLS, vaulted credentials, narrow authorization, rotation, and monitoring.
- Temporary development tooling that never reuses production credentials.

Basic is a poor default for interactive login and broad external APIs because every request presents the primary secret. Browser sessions, workload identity, mutual TLS, or OAuth client authentication usually provide a better lifecycle.

# Pitfalls

## Credentials on Every Request

The same password appears on every request in the protection space. A misconfigured TLS hop, proxy, trace, or header log can disclose it.

Use TLS across every hop, redact the `Authorization` header, restrict credential scope, and rotate through a secret manager. Short rotation intervals reduce exposure but do not prevent replay between rotations.

## Coarse Revocation

Basic defines no access-token lifetime or refresh protocol. Revocation means disabling the account or replacing its password, which can interrupt every client sharing that credential.

Give each client a distinct credential so one can be disabled without rotating an entire fleet. Where supported, workload identity, mutual TLS, or OAuth client authentication provides stronger client identity and rotation boundaries.

# Tradeoffs

| Mechanism | Presented secret | Revocation boundary | Fit |
|---|---|---|---|
| Basic | Reusable identifier and password | Account disable or password replacement | Legacy HTTP authentication and small controlled integrations |
| API key | Reusable opaque key | Disable or replace one issued key | Product-specific client identification with per-key lifecycle |
| Bearer access token | Shorter-lived token | Expiry plus issuer/resource-server controls | Delegated API access. Token format may be opaque or JWT |
| Mutual TLS | Client-certificate private-key proof | Certificate issuance, rotation, and revocation | Service identity where both peers can operate a certificate trust model |
| Managed workload identity | Platform-issued credential or attestation | Platform identity assignment and token lifecycle | Service identity without an application-managed long-lived secret |

Basic earns its place when interoperability requires it and its coarse credential lifecycle is acceptable. Network location alone does not make it safe. TLS, per-client credentials, narrow authorization, secret rotation, and redaction are minimum controls.

# Questions

> [!QUESTION]- Why is Basic Auth unsafe over HTTP?
> Base64 is reversible encoding. Without TLS, every observer on the path can recover the reusable password. TLS protects it only to the termination point. The credential remains exposed to the client, verifier, trusted proxies, and any system that records the header.

> [!QUESTION]- When is Basic Auth acceptable in production?
> It can be acceptable for a constrained integration that requires Basic and supports TLS across every hop, a unique vaulted credential, narrow authorization, rotation, rate limiting, and header redaction. A shared password across many clients or an interactive user's primary password creates an unnecessarily large compromise boundary.

# References

- [HTTP Basic Authentication](https://www.rfc-editor.org/rfc/rfc7617)
