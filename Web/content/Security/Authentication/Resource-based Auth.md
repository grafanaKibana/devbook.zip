---
publish: true
created: 2026-08-20T20:41:15.665Z
modified: 2026-08-20T20:41:15.665Z
published: 2026-08-20T20:41:15.665Z
topic:
  - Security
subtopic:
  - Authentication
summary: Checks whether a user may act on a specific resource instance, not just a type.
level:
  - "3"
priority: High
status: Ready to Repeat
---

Resource-based authorization decides whether a principal may perform an operation on one concrete resource. A role can grant document-editing capability in general. The resource check decides whether this document falls within that principal's authority.

# When to Use

Role authorization such as `[Authorize(Roles = "Admin")]` evaluates assigned roles without loading the target object. Resource-based authorization is needed when the decision depends on object data such as owner, tenant, project, classification, or current state. The application loads the resource first, then passes it to the authorization service.

## Where it Sits among Authorization Models

RBAC, ABAC, and ReBAC describe where an authorization decision gets its facts:

- **RBAC (Role-Based):** permissions attach to roles, and roles attach to principals. It is easy to audit, though a rule such as "Admin can edit documents" cannot express ownership of one document.
- **ABAC (Attribute-Based):** the policy evaluates attributes of the principal, resource, action, and environment. It handles rules such as tenant membership or data classification, but large policy sets can become difficult to trace.
- **ReBAC (Relationship-Based):** the decision follows relationships between subjects and resources, such as membership in the team that owns a folder. Zanzibar-style systems fit sharing and hierarchy-heavy products.

Resource-based authorization is an evaluation shape rather than a fourth model. An ASP.NET Core handler receives the concrete resource and can apply role, attribute, or relationship rules to it. Coarse route policy can reject obviously ineligible principals early. The per-resource handler makes the final instance-level decision. See [[Authorization|ASP.NET Authorization]].

# ASP.NET Core Implementation

```csharp
// 1. Define a requirement
public class DocumentOwnerRequirement : IAuthorizationRequirement { }

// 2. Implement the handler
public class DocumentOwnerHandler : AuthorizationHandler<DocumentOwnerRequirement, Document>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        DocumentOwnerRequirement requirement,
        Document resource)
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (resource.OwnerId == userId)
            context.Succeed(requirement);
        return Task.CompletedTask;
    }
}

// 3. Register in DI
builder.Services.AddSingleton<IAuthorizationHandler, DocumentOwnerHandler>();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("DocumentOwner", policy =>
        policy.Requirements.Add(new DocumentOwnerRequirement()));
});

// 4. Use in a controller
public async Task<IActionResult> Edit(int id)
{
    var document = await _repo.GetAsync(id);
    if (document is null) return NotFound();
    var authResult = await _authorizationService.AuthorizeAsync(User, document, "DocumentOwner");
    if (!authResult.Succeeded) return Forbid();
    // proceed with edit
}
```

The sample shows the handler shape, not a hardened production policy. The policy should call `RequireAuthenticatedUser()` before adding the ownership requirement. The handler must also require a non-null stable subject identifier and a non-null owner identifier before comparing them. Otherwise two absent values can compare equal.

When `_repo.GetAsync` returns `null`, ASP.NET Core skips an `AuthorizationHandler<TRequirement, TResource>` whose resource type does not match. Without the explicit `NotFound` check, this sample would collapse a missing document into the later `Forbid` result rather than dereference `OwnerId`. The authorization check must also stay coupled to the write: if ownership or tenant state can change between the check and update, the repository command needs the same predicate or a transaction that prevents a stale decision from authorizing a later state.

# Testing Authorization Handlers

Authorization handlers are plain classes, so their decisions can be tested without starting an ASP.NET Core host:

```csharp
// Unit test for DocumentOwnerHandler
public class DocumentOwnerHandlerTests
{
    [Fact]
    public async Task Succeeds_WhenUserIsOwner()
    {
        var handler = new DocumentOwnerHandler();
        var userId = "user-123";
        var document = new Document { OwnerId = userId };

        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims));
        var requirement = new DocumentOwnerRequirement();

        var context = new AuthorizationHandlerContext(
            new[] { requirement }, user, document);

        await handler.HandleAsync(context);

        Assert.True(context.HasSucceeded);
    }

    [Fact]
    public async Task Fails_WhenUserIsNotOwner()
    {
        var handler = new DocumentOwnerHandler();
        var document = new Document { OwnerId = "other-user" };

        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, "user-123") };
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims));
        var requirement = new DocumentOwnerRequirement();

        var context = new AuthorizationHandlerContext(
            new[] { requirement }, user, document);

        await handler.HandleAsync(context);

        Assert.False(context.HasSucceeded);
    }
}
```

These tests exercise the handler alone. `new ClaimsIdentity(claims)` has no authentication type, so its principal is unauthenticated. The sample handler can still succeed because it only compares the identifier claim. Production policy tests should use an authenticated identity, evaluate the configured policy with `RequireAuthenticatedUser()`, and include an unauthenticated negative case.

# Pitfalls

## Missing Authorization Check After Fetching Resource

The controller loads a resource and returns or mutates it without an instance-level decision. An authenticated principal can then enumerate identifiers and cross an ownership or tenant boundary. This is an insecure direct object reference under OWASP Broken Access Control.

Role checks often create false confidence because they establish broad capability while saying nothing about this object's owner or tenant.

Call `IAuthorizationService.AuthorizeAsync(User, resource, policy)` after loading the resource and before releasing data or applying a change. The data-access boundary should enforce the same ownership or tenant constraint when concurrent changes are possible.

## Returning 404 Vs 403

`403 Forbidden` reveals that the resource exists. `404 Not Found` can conceal existence, but it also makes a missing object indistinguishable from a hidden one.

Use `403` when authenticated callers may know that the resource exists. Use `404` when existence itself is sensitive, and apply that policy consistently so response timing or list endpoints do not undo the concealment.

# Questions

> [!QUESTION]- What is the difference between role-based and resource-based authorization?
> Role-based authorization evaluates assigned roles without needing the target instance. Resource-based authorization includes the loaded object's attributes or relationships in the decision. Roles work well as coarse gates. Resource checks enforce ownership, tenancy, or object state.

# References

- [Resource-based authorization in ASP.NET Core](https://learn.microsoft.com/aspnet/core/security/authorization/resourcebased)
- [OWASP Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
