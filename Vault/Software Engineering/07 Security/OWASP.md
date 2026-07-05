---
topic:
  - Security
subtopic:
  - Security
level:
  - "4"
priority: High
status: Ready to Repeat

publish: true
---

# OWASP Top 10

OWASP (Open Worldwide Application Security Project) is a non-profit that publishes the most widely used web application security standard: the OWASP Top 10. Updated every 3-4 years, it ranks the most critical security risks based on real-world vulnerability data. For .NET engineers, the Top 10 is the baseline security checklist for any web application.

## OWASP Top 10 (2021)

### A01: Broken Access Control
**What**: Users can access resources or perform actions they are not authorized for. Most common vulnerability in 2021 (94% of tested apps).
**Example**: A user changes `?userId=123` to `?userId=456` in a URL and accesses another user's data.
**Mitigation**: Enforce authorization server-side on every request. Use ASP.NET Core policy-based authorization. Deny by default — explicitly grant access, never rely on obscurity.

```csharp
// ASP.NET Core: resource-based authorization
var authResult = await _authorizationService.AuthorizeAsync(User, resource, "OwnerPolicy");
if (!authResult.Succeeded) return Forbid();
```

### A02: Cryptographic Failures
**What**: Sensitive data exposed due to weak or missing encryption. Formerly called "Sensitive Data Exposure".
**Example**: Passwords stored as MD5 hashes, HTTP instead of HTTPS, weak TLS cipher suites.
**Mitigation**: Use bcrypt/Argon2 for passwords (never MD5/SHA1). Enforce HTTPS everywhere. Use AES-256-GCM for data at rest. See [[Software Engineering/07 Security/Encryption|Encryption]].

### A03: Injection
**What**: Untrusted data sent to an interpreter as part of a command or query. SQL injection, LDAP injection, OS command injection.
**Example**: `SELECT * FROM users WHERE name = '` + userInput + `'` — attacker inputs `' OR '1'='1`.
**Mitigation**: Use parameterized queries (EF Core, Dapper with parameters). Never concatenate user input into SQL. Use ORMs. Validate and sanitize all input. See [[Software Engineering/07 Security/Web Vulnerabilities|Web Vulnerabilities]] for SQLi, XSS, and CSRF in depth.

```csharp
// Safe: parameterized query with Dapper
var user = await conn.QueryFirstOrDefaultAsync<User>(
    "SELECT * FROM Users WHERE Email = @Email",
    new { Email = userEmail });
```

### A04: Insecure Design
**What**: Architectural flaws that cannot be fixed by correct implementation. Missing threat modeling, no rate limiting, no fraud controls.
**Example**: A password reset flow that allows brute-forcing the reset token because there is no rate limit or token expiry.
**Mitigation**: Threat model during design. Apply rate limiting (see [[Software Engineering/05 Architecture/Patterns/Resilience Patterns/Rate Limiting|Rate Limiting]]). Use secure design patterns.

### A05: Security Misconfiguration
**What**: Default credentials, unnecessary features enabled, verbose error messages, missing security headers.
**Example**: A production app with `app.UseDeveloperExceptionPage()` enabled, exposing stack traces to users.
**Mitigation**: Disable developer exception pages in production. Set security headers (CSP, HSTS, X-Frame-Options). Remove default accounts. Audit cloud storage permissions.

```csharp
// ASP.NET Core: only use developer exception page in development
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}
```

### A06: Vulnerable and Outdated Components
**What**: Using libraries, frameworks, or OS components with known vulnerabilities.
**Example**: A NuGet package with a known RCE vulnerability that has not been updated.
**Mitigation**: Use `dotnet list package --vulnerable` to scan for vulnerable packages. Enable Dependabot. Keep dependencies updated. Remove unused packages.

### A07: Identification and Authentication Failures
**What**: Weak authentication mechanisms, credential stuffing, missing MFA, insecure session management.
**Example**: No account lockout after failed login attempts, allowing brute-force attacks.
**Mitigation**: Use ASP.NET Core Identity with lockout enabled. Enforce MFA for sensitive operations. Use secure session cookies (HttpOnly, Secure, SameSite=Strict).

### A08: Software and Data Integrity Failures
**What**: Code and infrastructure that does not protect against integrity violations. Insecure deserialization, CI/CD pipeline attacks.
**Example**: A CI/CD pipeline that pulls dependencies from untrusted sources without verifying checksums.
**Mitigation**: Verify NuGet package signatures. Pin dependency versions. Use trusted package sources. Validate deserialized data.

### A09: Security Logging and Monitoring Failures
**What**: Insufficient logging and monitoring, allowing attacks to go undetected.
**Example**: A successful SQL injection attack that is not logged, allowing the attacker to exfiltrate data over days.
**Mitigation**: Log all authentication events (success and failure), authorization failures, and input validation failures. Use structured logging (Serilog, Application Insights). Set up alerts for anomalous patterns.

### A10: Server-Side Request Forgery (SSRF)
**What**: The server makes HTTP requests to attacker-controlled URLs, potentially accessing internal services.
**Example**: An image upload feature that fetches images by URL — attacker provides `http://169.254.169.254/latest/meta-data/` (AWS metadata endpoint).
**Mitigation**: Validate and allowlist URLs before making server-side requests. Block requests to private IP ranges. Use network-level controls (VPC security groups).

## Pitfalls

### Checklist Security (False Sense of Compliance)

**What goes wrong**: a team works through the OWASP Top 10 as a checklist, marks each item 'done,' and considers the application secure. The Top 10 is a minimum baseline, not a comprehensive security program.

**Why it matters**: the Top 10 covers the most common vulnerabilities, not all vulnerabilities. Application-specific logic flaws, business logic bypasses, and supply chain attacks are not covered.

**Mitigation**: use the Top 10 as a starting point. Add threat modeling, penetration testing, and security code review. Treat security as a continuous process, not a one-time audit.

### Stale Dependency Scanning

**What goes wrong**: `dotnet list package --vulnerable` is run once during setup and never again. New CVEs are published daily; a package that was safe last month may be vulnerable today.

**Mitigation**: automate dependency scanning in CI (GitHub Dependabot, OWASP Dependency-Check). Set up alerts for new CVEs in your dependency tree. Pin dependency versions and review updates regularly.

## Tradeoffs

**Security scanning depth vs CI speed**

| Approach | Coverage | CI Impact | When to use |
|----------|----------|-----------|-------------|
| SAST (static analysis) | Code patterns, known vulnerabilities | Low (seconds) | Every PR |
| DAST (dynamic analysis) | Runtime vulnerabilities, auth bypasses | High (minutes) | Nightly or pre-release |
| Penetration testing | Business logic, chained vulnerabilities | Very high (days) | Quarterly or pre-launch |
| Dependency scanning | Known CVEs in dependencies | Low (seconds) | Every PR |

**Decision rule**: run SAST and dependency scanning on every PR (fast, automated). Run DAST nightly against a staging environment. Schedule penetration testing quarterly or before major releases. Do not skip DAST because it is slow — it catches vulnerabilities that static analysis cannot.


## Questions

> [!QUESTION]- Which OWASP Top 10 item is most commonly found in production .NET apps?
> - A01 (Broken Access Control) is the most prevalent — 94% of tested apps had at least one instance.
> - Common .NET manifestation: missing `[Authorize]` attributes, IDOR (insecure direct object references) where IDs are not validated against the current user.
> - A05 (Security Misconfiguration) is also common: developer exception pages in production, missing security headers.
> - Tradeoff: fixing access control requires understanding the authorization model, not just adding attributes — resource-based authorization is more work but more correct.

> [!QUESTION]- How do you prevent SQL injection in a .NET application?
> - Use parameterized queries always — EF Core and Dapper with parameters are safe by default.
> - Never concatenate user input into SQL strings, even for dynamic ORDER BY or table names.
> - For dynamic SQL, use allowlists (validate column names against a known set) rather than sanitization.
> - Enable SQL Server's Query Store to detect unusual query patterns.
> - Tradeoff: ORMs prevent injection but can generate inefficient queries — use raw parameterized SQL for performance-critical paths.

## References

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/) — the authoritative OWASP Top 10 list with detailed descriptions, examples, and prevention guidance
- [OWASP .NET Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DotNet_Security_Cheat_Sheet.html) — .NET-specific mitigations for each OWASP category
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) — comprehensive guide for testing web application security
- [Microsoft — ASP.NET Core Security](https://learn.microsoft.com/en-us/aspnet/core/security/) — official ASP.NET Core security documentation covering authentication, authorization, and data protection
