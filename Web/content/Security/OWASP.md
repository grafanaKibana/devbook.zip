---
publish: true
created: 2026-08-20T20:41:15.670Z
modified: 2026-08-20T20:41:15.671Z
published: 2026-08-20T20:41:15.671Z
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

The Open Worldwide Application Security Project (OWASP) publishes community-maintained security guidance and tools. Its Web Application Security Top 10 is an awareness document: ten broad risk categories selected from contributed data and community analysis. The current released edition is 2025.

The list gives application teams a shared vocabulary and a useful coverage check. It is not a standard, a complete threat model, or evidence that a particular system resists attack. The OWASP API Security Top 10 is a separate project whose current released edition remains 2023. Its categories should not be silently merged with the web list below.

# OWASP Top 10 (2025)

## A01: Broken Access Control

The system accepts an operation the caller is not allowed to perform. A signed-in user changes `/invoices/42` to `/invoices/43` and reads another tenant's data because the endpoint checked identity without checking ownership. Authorization belongs at the server-side operation that loads or mutates the resource. Deny by default, then test nearby identifiers and forbidden state transitions.

```csharp
var decision = await authorizationService.AuthorizeAsync(
    User,
    invoice,
    "CanReadInvoice");

if (!decision.Succeeded)
    return Forbid();
```

## A02: Security Misconfiguration

Unsafe defaults, unnecessary services, permissive cloud policy, missing security headers, or detailed production errors expose paths the application did not intend. Hardened configuration belongs in the deployment definition. Compare the running system with that policy and fail closed when a required setting is absent.

## A03: Software Supply Chain Failures

A compromised package, build action, registry, or signing identity can reach production through a trusted delivery path. Maintain an inventory of deployed components and build inputs. Restrict CI credentials, verify provenance where the ecosystem supports it, and rehearse replacing a compromised dependency without destroying the evidence needed to investigate it.

## A04: Cryptographic Failures

Sensitive data is exposed because protection is absent or a construction is used outside its security requirements. Plain SHA-256 password verifiers are cheap to guess. AES-GCM nonce reuse can break confidentiality and integrity. Use maintained libraries, [[Security/Password Storage|password-storage schemes]], [[Security/Encryption|authenticated encryption]], and a key lifecycle that covers generation, access, rotation, revocation, and loss.

## A05: Injection

Untrusted data changes the syntax interpreted by SQL, a shell, a template engine, LDAP, or another parser. A query built by concatenating an email address lets the value become SQL syntax. Use parameterized APIs for values, a closed allowlist for identifiers that cannot be parameters, and the least privilege needed by the interpreter account.

```csharp
var user = await connection.QueryFirstOrDefaultAsync<User>(
    "SELECT * FROM Users WHERE Email = @Email",
    new { Email = userEmail });
```

## A06: Insecure Design

The intended workflow lacks a security invariant, so an implementation can match its design and remain exploitable. A password-reset token with no expiry or account binding is still unsafe when implemented cleanly. Threat modeling should make abuse cases and failure behavior concrete before code fixes the wrong contract in place.

## A07: Authentication Failures

Credential, session, recovery, or authenticator handling lets an attacker assume another identity. Rate and detect credential attacks, protect session and renewal tokens, and choose phishing-resistant authenticators when the risk warrants them. Recovery is part of the authentication boundary. A weak recovery path bypasses a strong sign-in path.

## A08: Software or Data Integrity Failures

The system trusts code, serialized state, updates, or business data without establishing origin and integrity. Verify artifacts and update metadata before use, constrain deserialization to expected schemas, and keep verification trust outside the channel delivering the payload. A signature authenticates only what the verifier actually covers and the key authority it trusts.

## A09: Security Logging and Alerting Failures

The system cannot reconstruct or detect an attack because decision events are absent, unsafe, or never turned into alerts. Record security-relevant decisions with safe metadata and stable correlation. Then test that an abuse sequence produces a routed signal. A stored log that nobody evaluates is evidence at best, not detection.

## A10: Mishandling of Exceptional Conditions

Unexpected state, timeout, exhaustion, partial failure, or an exception path leaves the system open or inconsistent. A payment handler that commits an order after its authorization service times out has failed open. Define which failures deny the operation, bound resource consumption, and make any retry policy consistent with the operation's idempotency guarantees.

# API Threats and Controls

The API Security Top 10 adds vocabulary for object-, property-, and function-level authorization along with resource consumption, inventory, SSRF, and unsafe upstream consumption. A valid token does not prove that the caller may read object `42`, set `isAdmin`, or invoke an administrative operation. Load the exact resource, authorize the action, bind writable schemas, and put explicit bounds on payload size and work.

Each preventive control needs evidence tied to its failure mode. Cross-tenant tests exercise access control. Inventory drift reveals shadow endpoints. Cost and queue-depth changes can expose resource abuse. That telemetry must not contain tokens, passwords, API keys, card data, or unrestricted request bodies. Basic authentication, JWT, OAuth, and OpenID Connect have different protocol roles. Changing token format does not repair a missing authorization decision.

# Pitfalls

## Checklist Security (False Sense of Compliance)

Marking every broad category "done" turns an awareness list into false assurance. The list cannot identify one application's assets, trust boundaries, business rules, or chained abuse cases.

Use the Top 10 to seed threat models and verification. Add architecture-specific abuse cases and review depth according to the system's exposure, change surface, and release risk.

# Questions

> [!QUESTION]- How should a .NET application prevent SQL injection?
> Keep untrusted values out of SQL text by using parameterized APIs. Dynamic identifiers such as a sort column cannot normally be parameters, so map them from a closed allowlist. ORM safety depends on the exact API: LINQ and parameterizing raw-SQL methods differ from APIs that accept already constructed SQL text. Least-privilege database permissions reduce impact but do not repair concatenation.

# References

- [OWASP Top 10 2025](https://owasp.org/Top10/2025/0x00_2025-Introduction/)
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [ASP.NET Core security](https://learn.microsoft.com/aspnet/core/security/)
