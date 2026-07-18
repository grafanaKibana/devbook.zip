---
topic:
  - Security
subtopic:
  - Security
summary: "Chooses who may perform an action by evaluating identities, resources, roles, attributes, or relationships."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

Authorization evaluates a request such as `(alice, read, invoice-42, current context)` and returns permit or deny. Authentication establishes that the caller is Alice; authorization still has to prove that Alice may read this invoice. Enforce that decision on every request, close to the resource, and deny when no rule matches.

The common models are not mutually exclusive. An application can use RBAC to grant coarse capabilities, ABAC to add tenant and risk conditions, and an ACL to record exceptions on one document.

# Compare on the Same Axes

| Model | Decision input | Who controls policy | Good fit | Main cost |
| --- | --- | --- | --- | --- |
| ACL | Per-resource entries such as `user:alice -> read` | Resource service or administrator | A small number of shareable objects | Entries multiply across resources and become hard to audit |
| DAC | The resource owner delegates access, often through ACLs | Resource owner | User-owned files and collaboration | A compromised or careless owner can grant access too broadly |
| MAC | Centrally assigned subject clearances and object classifications | Central security authority | Regulated or military-style information flows | Rigid labels make ordinary collaboration expensive |
| RBAC | User roles mapped to permissions | Role administrators | Stable job functions such as billing operator or auditor | Role explosion appears when tenant, ownership, time, or risk matters |
| ABAC | Subject, resource, action, and environment attributes evaluated by policy | Central policy owners plus attribute authorities | Multi-tenant and context-sensitive decisions | Stale attributes and opaque policies make failures difficult to explain |
| ReBAC | Relationships in a graph, such as owner, member, parent, or viewer | Relationship owners plus central constraints | Documents, repositories, teams, and nested collaboration | Graph traversal, caching, and relationship consistency become security boundaries |

![[Security/Security-Authorization Models-18120000.png]]

# One Invoice, Three Decisions

Suppose `GET /invoices/42` is requested by a signed-in billing agent.

- RBAC can permit `invoice:read` for the `BillingAgent` role, but that alone may expose every tenant's invoices.
- ABAC can require `user.tenant_id == invoice.tenant_id`, `invoice.status != "sealed"`, and a device risk score below the policy threshold.
- ReBAC can permit access when the caller owns the customer account or belongs to its billing team.

The endpoint must load invoice 42 and authorize that exact object. Hiding the identifier or checking only the UI menu leaves an insecure direct object reference: changing `/42` to `/43` bypasses the intended boundary.

# ASP.NET Core Mapping

ASP.NET Core roles are a direct RBAC tool. Policies can combine claims and custom requirements for ABAC-like checks. Resource-based authorization passes the loaded object to a handler, which is the right place for ownership and relationship decisions.

```csharp
var invoice = await repository.GetAsync(invoiceId);
if (invoice is null)
    return NotFound();

var decision = await authorizationService.AuthorizeAsync(
    User,
    invoice,
    "CanReadInvoice");

return decision.Succeeded ? Ok(invoice) : Forbid();
```

Keep policy decisions deterministic and observable: record the policy and rule that denied a request, but do not log sensitive attributes or tokens. Test explicit allow, explicit deny, missing attributes, stale relationships, and the default-deny path. See [[Home/Security/Authentication/Resource-based Auth|resource-based authorization]] for the handler mechanics.

# References

- [ByteByteGo — Designing a Permission System](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-design-a-permission-system.md) — the pinned source comparison that prompted this model-oriented rewrite.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — least privilege, deny-by-default, per-request validation, testing, and logging guidance.
- [NIST SP 800-162 — Attribute Based Access Control](https://csrc.nist.gov/pubs/sp/800/162/upd2/final) — the formal ABAC definition covering subject, object, action, and environment attributes.
- [Microsoft — Resource-based authorization in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased) — handlers that authorize a loaded resource rather than only an endpoint.
