---
publish: true
created: 2026-07-11T21:48:23.931Z
modified: 2026-07-16T08:59:28.828Z
published: 2026-07-16T08:59:28.828Z
topic:
  - Security
subtopic:
  - Security
summary: The non-profit behind the OWASP Top 10 web security risk checklist.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# OWASP Top 10

OWASP (Open Worldwide Application Security Project) publishes the OWASP Top 10, an awareness document for common web-application risk classes. It is a baseline for threat modeling and verification, not proof that an application is secure. The current released list is the 2025 edition.

## OWASP Top 10 (2025)

### A01: Broken Access Control

The system accepts an operation the caller is not allowed to perform. A signed-in user changes `/invoices/42` to `/invoices/43` and reads another tenant's data because the endpoint checked identity but not ownership. Authorize every resource and action server-side, deny by default, and test nearby denied cases.

```csharp
var decision = await authorizationService.AuthorizeAsync(
    User,
    invoice,
    "CanReadInvoice");

if (!decision.Succeeded)
    return Forbid();
```

### A02: Security Misconfiguration

Unsafe defaults, unnecessary services, permissive cloud policies, missing headers, or detailed production errors expose a path the application did not intend. Build hardened configuration into deployment, compare it continuously with policy, and fail closed when required settings are absent.

### A03: Software Supply Chain Failures

A compromised package, build action, registry, or signing identity reaches production through a trusted delivery path. Maintain an inventory, restrict and pin build inputs, verify provenance where available, isolate CI credentials, and practice replacing a compromised dependency without disabling the evidence trail.

### A04: Cryptographic Failures

Sensitive data is exposed because protection is absent or the primitive, parameters, nonce, key, or trust model is wrong. Plain SHA-256 password hashes and a reused AES-GCM nonce are different failures with the same root: cryptography was applied outside its required construction. Use approved libraries, [[Password Storage]], [[Encryption]], and managed key lifecycles.

### A05: Injection

Untrusted data changes the syntax of a SQL, shell, template, LDAP, or another interpreter command. A query built by concatenating an email address lets input become SQL. Keep code and data separate with parameterized APIs, allowlist identifiers that cannot be parameters, and constrain any interpreter the process can reach.

```csharp
var user = await connection.QueryFirstOrDefaultAsync<User>(
    "SELECT * FROM Users WHERE Email = @Email",
    new { Email = userEmail });
```

### A06: Insecure Design

The intended workflow lacks a control, so correct implementation still produces an exploitable system. A password-reset token with no expiry, attempt budget, or account binding is not repaired by clean code. Threat-model abuse cases and make rate, value, state transition, and recovery invariants explicit before implementation.

### A07: Authentication Failures

Credential, session, recovery, or authenticator handling lets an attacker assume another identity. Defend against credential stuffing, protect session and renewal tokens, require phishing-resistant authentication where the risk warrants it, and make account recovery at least as strong as normal sign-in.

### A08: Software or Data Integrity Failures

The system trusts code, serialized state, updates, or business data without establishing its origin and integrity. Verify signed artifacts and update metadata, constrain deserialization to expected types and schemas, and keep the verification key outside the channel that delivers the payload.

### A09: Security Logging and Alerting Failures

The system cannot reconstruct or detect an attack because decision events are absent, unsafe, or never turned into alerts. Record authentication, authorization, administrative, and sensitive-data events with safe metadata. Test that a real abuse sequence triggers a routed alert; collecting logs alone is not detection.

### A10: Mishandling of Exceptional Conditions

Unexpected states, timeouts, resource exhaustion, partial failure, or exception paths leave the system open or inconsistent. A payment handler that commits an order after its authorization service times out fails open. Define failure semantics, bound resources, make retries idempotent, and test recovery from faults at every external boundary.

## API Threats and Controls

An API checklist is useful only when each control names the threat it prevents and the signal that reveals failure. Apply authorization at the object, property, and function levels; a valid token does not prove that the caller may read object `42` or set its `isAdmin` property.

| Threat | Preventive control | Detective control |
| --- | --- | --- |
| Traffic interception or modification | TLS on every external and service boundary; authenticated upstreams | Certificate and handshake failures; unexpected plaintext listeners |
| Stolen or replayed credentials | Appropriate authentication, short-lived scoped tokens, issuer/audience validation, replay controls where the protocol supports them | Token reuse from new devices or regions; authentication anomalies |
| Object or property access bypass | Load the exact resource, authorize every operation, bind writable schemas, deny unknown fields | Denied cross-tenant identifiers; writes to protected fields |
| Injection and malformed input | Typed schemas, bounds, parameterized queries, safe interpreters | Validation-failure rates; database and process errors without raw payload logging |
| Resource and business-flow abuse | Per-identity quotas, concurrency and payload limits, idempotency, workflow-specific anti-automation controls | Cost, latency, queue depth, and conversion anomalies by caller and operation |
| Secret exposure | Dedicated secret storage, narrow workload identities, redaction before telemetry | Secret scanning and access audit events |
| Error disclosure | Stable external error contracts; no stack traces or internal identifiers | Error-shape tests and production response sampling |
| Stale or shadow APIs | Owned inventory of hosts, routes, versions, and retirement dates | Discovery results that do not match the inventory |
| Vulnerable components or unsafe upstream data | Verified dependencies, patched runtimes, validate third-party responses as untrusted input | Software inventory alerts and upstream contract violations |

### Keep Identity and Protocol Roles Separate

- **Basic authentication** is an HTTP credential scheme. It sends a reusable user ID and password encoding on each request and therefore requires TLS and careful scope; it is not categorically repaired by changing the credential to a JWT.
- **JWT** is a token format. A signed JWT may carry an ID token, access token, or another assertion, and each use needs distinct issuer, audience, type, algorithm, and claim validation.
- **OAuth** is an authorization framework for obtaining scoped access to a protected resource. It does not by itself authenticate the end user; OpenID Connect adds an identity layer for that use case.
- **HMAC JWT secrets** require enough random key material and safe distribution to every verifier. Asymmetric verification or opaque tokens may be a better trust boundary; “use a random symmetric secret” is not universal architecture guidance.

Do not log tokens, passwords, API keys, card data, or request bodies merely because monitoring is a control. Log safe identifiers, decision outcomes, policy names, latency, and bounded failure categories so defenders can detect abuse without creating another sensitive-data store.

## Pitfalls

### Checklist Security (False Sense of Compliance)

**What goes wrong**: a team works through the OWASP Top 10 as a checklist, marks each item 'done,' and considers the application secure. The Top 10 is a minimum baseline, not a comprehensive security program.

**Why it matters**: the Top 10 names broad risk classes, not every exploit path in a particular application. A business-logic bypass or supply-chain compromise may fall under a listed class, but the document cannot identify the application's assets, trust boundaries, workflows, or concrete abuse cases.

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

> [!QUESTION]- Why does passing an OWASP Top 10 checklist not prove an application is secure?
>
> - The Top 10 groups broad, common risk classes; it does not enumerate the application's assets, trust boundaries, business rules, or attackers.
> - A system can prevent listed injection patterns and still let a valid customer refund another customer's order through broken workflow authorization.
> - Use the list to seed threat models and verification, then add abuse cases, architecture-specific controls, dependency review, and incident exercises.

> [!QUESTION]- How do you prevent SQL injection in a .NET application?
>
> - Use parameterized queries always — EF Core and Dapper with parameters are safe by default.
> - Never concatenate user input into SQL strings, even for dynamic ORDER BY or table names.
> - For dynamic SQL, use allowlists (validate column names against a known set) rather than sanitization.
> - Do not assume an ORM makes interpolated raw SQL safe; verify which APIs parameterize and which execute literal command text.
> - Raw SQL is appropriate for performance-sensitive paths when every value remains parameterized and dynamic identifiers come from a closed allowlist.

## References

- [ByteByteGo — Top 12 Tips for API Security](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-12-tips-for-api-security.md) — the pinned checklist source, mapped here to preventive and detective controls; its defective visual is not reused.
- [ByteByteGo — A Cheatsheet to Build Secure APIs](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/a-cheatsheet-to-build-secure-apis.md) — the pinned control categories, with authentication, JWT, and OAuth terminology corrected.
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) — object, property, function, resource, inventory, SSRF, and unsafe-upstream risk definitions.
- [RFC 7617 — Basic HTTP Authentication](https://datatracker.ietf.org/doc/html/rfc7617) — the Basic scheme and its cleartext credential transport considerations.
- [RFC 9700 — OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700) — current OAuth threat model and deployment guidance.
- [OWASP Top 10 2025](https://owasp.org/Top10/2025/0x00_2025-Introduction/) — the current released web-application risk list and change summary.
- [OWASP .NET Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DotNet_Security_Cheat_Sheet.html) — .NET-specific mitigations for each OWASP category
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) — comprehensive guide for testing web application security
- [Microsoft — ASP.NET Core Security](https://learn.microsoft.com/en-us/aspnet/core/security/) — official ASP.NET Core security documentation covering authentication, authorization, and data protection
