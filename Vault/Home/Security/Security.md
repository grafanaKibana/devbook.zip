---
icon: lock
order: 80
color: "#0ea5e9"
topic:
  - Security
subtopic: []
summary: "Protecting users, data, and systems: authentication, authorization, and cryptography."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Done
qard-deck: "Security"
qard-topic: "Security"
flashcard_uid: "e838d602"
---

Security keeps a system's promised behavior intact when people, software, and infrastructure fail or act maliciously. It is an engineering property of the whole service: identities, authorization, data handling, dependencies, deployment, detection, and recovery all contribute to the result.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# The Shape of the Problem

The CIA triad names three recurring goals: confidentiality limits disclosure, integrity limits unauthorized change, and availability keeps required operations usable. A real threat model adds the assets, actors, trust boundaries, abuse paths, and impact that make those goals concrete. Defense in depth then places independent controls along an abuse path so one failed control does not decide the outcome.

Two distinctions run through everything below:

- **Authentication and authorization:** authentication establishes a principal with some assurance. Authorization decides whether that principal may perform this operation on this resource now. A valid session never replaces the resource decision.
- **Encoding, password hashing, integrity, and encryption:** encoding changes representation. Password hashing creates an expensive verifier. A MAC or signature authenticates data within a defined trust model. Encryption protects confidentiality for key holders. None substitutes for the others.

Small omissions often open the path: one missing ownership check, one reusable credential in telemetry, one unbounded recovery endpoint, or one dependency deployed past its supported lifetime. The surrounding notes isolate those mechanisms. This page keeps their shared design process visible.

# Secure System Design Checklist

The checklist starts from one abuse case, not a catalog of controls. For a payroll export, the employee records are the assets, payroll staff and the export worker are the actors, and the browser, API, job queue, object store, and third-party delivery service are separate trust boundaries. Each control then answers a concrete path through those boundaries.

1. **Assets and actors:** the data and operations are classified, legitimate actors are named, and what an attacker gains is described. See [[Home/Security/Sensitive Data|Sensitive Data]].
2. **Trust boundaries:** the model shows where identities, data, and administrative control cross processes, networks, tenants, and vendors.
3. **Identity and access:** each actor is authenticated, authorization covers the exact resource and action, access is denied by default, and privileges stay narrow. See [[Home/Security/Authentication/Authentication|Authentication]] and [[Home/Security/Authorization Models|Authorization Models]].
4. **Secure defaults:** only required endpoints and methods are exposed, unused ports are closed, unknown input is rejected, and a missing policy fails closed. See [[Home/Security/Firewall|Firewall]], [[Home/Security/OWASP|OWASP]], and [[Home/Security/Web Vulnerabilities|Web Vulnerabilities]].
5. **Secrets and keys:** credentials stay out of code and telemetry, keys live in managed key storage, key administration is separated from data administration, and rotation is tested. See [[Home/Security/Secrets Management|Secrets Management]] and [[Home/Security/Encryption|Encryption]].
6. **Dependencies and delivery:** build inputs are pinned and verified, deployed artifacts are scanned, CI identities are protected, and a current inventory of components and public APIs is maintained.
7. **Detection:** authentication, authorization, administrative, and sensitive-data events are recorded with safe metadata. Alerts fire on an attack pattern rather than one expected denial.
8. **Response and recovery:** incidents have assigned owners, evidence is preserved, compromised access is revoked, communication follows the applicable obligations, and restoration uses a tested recovery path.

![[Security/Security-Security-18120000.png|theme-aware]]

A checklist becomes evidence only when its failure paths are exercised. The payroll export should reject another tenant, a missing policy, a revoked job identity, and a stale signing key. Operations should also know what happens when audit delivery fails or the only clean backup predates the incident.

# Questions

<!-- qard-id: 020bc3d2-4f0b-4156-94ef-d2ebc35ffa9f -->
> [!qard]- How do authentication and authorization work together when handling a request?
> Authentication runs first and establishes who is calling. It validates a credential, such as a cookie or bearer token, and produces a principal with claims. Authorization then uses that principal to decide whether this caller may perform this action on this resource in the current context. A valid identity is an input to the authorization decision, not permission for every operation.
> 
> In ASP.NET Core, one request flows as follows:
> 
> 1. **Authenticate:** the handler for the configured scheme validates the credential and sets `HttpContext.User` to the resulting principal. This step does not reject a request that lacks a valid credential. Such a request continues without an authenticated identity.
> 2. **Authorize the endpoint:** policies on the endpoint are evaluated against the principal before the action runs. Examples are requiring an authenticated user, a role or a claim.
> 3. **Authorize the resource:** an endpoint policy cannot see a record that the action has not loaded yet. When the decision depends on the record, such as whether the caller owns invoice 42, the action loads it and calls `IAuthorizationService.AuthorizeAsync(User, invoice, "CanReadInvoice")`.
> 4. **Handle a denial:** an unauthenticated caller receives a *challenge*, which asks for credentials. An authenticated caller without permission receives a *forbid*. The scheme decides the actual response:
>     - JWT bearer authentication returns 401 for a challenge and 403 for a forbid.
>     - Cookie authentication returns 401 or 403 to XHR requests and, from ASP.NET Core 10, to recognized API endpoints by default.
>     - Other cookie-authenticated requests are redirected to a sign-in page or an access-denied page.
> 
> [Microsoft: ASP.NET Core authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-10.0) · [Microsoft: Resource-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resource-based?view=aspnetcore-10.0) · [Microsoft: .NET 10 cookie authentication change for API endpoints](https://learn.microsoft.com/en-us/aspnet/core/breaking-changes/10/cookie-authentication-api-endpoints?view=aspnetcore-10.0)

# References

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
