---
publish: true
created: 2026-08-20T20:41:15.667Z
modified: 2026-08-20T20:41:15.667Z
published: 2026-08-20T20:41:15.667Z
topic:
  - Security
subtopic:
  - Security
summary: Chooses who may perform an action by evaluating identities, resources, roles, attributes, or relationships.
level:
  - "3"
priority: High
status: Ready to Repeat
---

Authorization evaluates a request such as `(principal, action, resource, context)` and returns a decision. Authentication supplies the principal. It does not prove that the principal may read this invoice, alter this field, or approve this workflow transition. The enforcement point must obtain a decision for every protected operation and deny when no rule matches.

The models describe different sources of policy facts and can be composed. RBAC may grant a coarse capability, ABAC may add tenant and risk conditions, and an ACL or relationship edge may narrow the decision to one document. Composition needs explicit precedence. An exception that silently overrides a mandatory restriction is a policy defect.

# Compare on the Same Axes

| Model | Decision input | Who controls policy | Good fit | Main cost |
| --- | --- | --- | --- | --- |
| ACL | Per-resource entries such as `user:alice -> read` | Resource service or administrator | A small number of shareable objects | Entries multiply across resources and become hard to audit |
| DAC | The resource owner delegates access, often through ACLs | Resource owner | User-owned files and collaboration | A compromised or careless owner can grant access too broadly |
| MAC | Centrally assigned subject clearances and object classifications | Central security authority | Regulated or military-style information flows | Rigid labels make ordinary collaboration expensive |
| RBAC | User roles mapped to permissions | Role administrators | Stable job functions such as billing operator or auditor | Role explosion appears when tenant, ownership, time, or risk matters |
| ABAC | Subject, resource, action, and environment attributes evaluated by policy | Central policy owners plus attribute authorities | Multi-tenant and context-sensitive decisions | Stale attributes and opaque policies make failures difficult to explain |
| ReBAC | Relationships in a graph, such as owner, member, parent, or viewer | Relationship owners plus central constraints | Documents, repositories, teams, and nested collaboration | Graph traversal, caching, and relationship consistency become security boundaries |

![[Assets/Security/Security-Authorization Models-18120000.png]]

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

Keep policy decisions deterministic and observable: record the policy and rule that denied a request, but do not log sensitive attributes or tokens. Test explicit allow, explicit deny, missing attributes, stale relationships, and the default-deny path. See [[Security/Authentication/Resource-based Auth|resource-based authorization]] for the handler mechanics.

# References

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [NIST SP 800-162: Guide to Attribute Based Access Control](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
