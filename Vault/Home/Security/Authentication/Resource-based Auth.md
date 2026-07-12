---
topic:
  - Security
subtopic:
  - Authentication
summary: "Checks whether a user may act on a specific resource instance, not just a type."
level:
  - "3"
priority: High
status: Ready to Repeat

publish: true
---

# Resource-Based Authorization

Resource-based authorization checks whether the current user has permission to perform an action on a specific resource instance — not just a resource type. It answers: "Can this user edit this specific document?" rather than "Can this user edit documents?"

## When to Use

Role-based authorization (`[Authorize(Roles = "Admin")]`) checks what type of user you are. Resource-based authorization checks ownership or relationship to a specific resource. Use it when authorization depends on data — for example, only the document owner can edit it.

### Where it sits among authorization models

Resource-based auth is one point on a spectrum of access-control models:

- **RBAC (Role-Based)** — permissions attached to roles, roles to users. Simple and the common default, but coarse: "Admin can edit documents" can't express "only *this* document's owner."
- **ABAC (Attribute-Based)** — decisions from attributes of the *user, resource, action, and context* ("editors in the EU during business hours"). Flexible, but rules can sprawl.
- **ReBAC (Relationship-Based)** — decisions from the *relationship graph* between subject and resource ("user is in the team that owns the folder"). The Google Zanzibar / OpenFGA model, ideal for sharing/hierarchy-heavy apps.

Resource-based authorization is the *implementation mechanism* (evaluate a rule against a specific resource instance) that ABAC and ReBAC require — in ASP.NET Core it's expressed as policy handlers given the resource. It complements RBAC rather than replacing it: use roles for coarse gates and resource-based checks for per-instance ownership. See [[Authorization|ASP.NET Authorization]].

## ASP.NET Core Implementation

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
    var authResult = await _authorizationService.AuthorizeAsync(User, document, "DocumentOwner");
    if (!authResult.Succeeded) return Forbid();
    // proceed with edit
}
```

## Testing Authorization Handlers

Authorization handlers are plain classes and easy to unit test without spinning up ASP.NET Core:

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


## Pitfalls

### Missing Authorization Check After Fetching Resource

**What goes wrong**: the controller fetches the resource and returns it without checking ownership. Any authenticated user can access any resource by guessing the ID (Insecure Direct Object Reference, OWASP A01).

**Why it happens**: authorization is added as an afterthought, or developers assume role-based checks are sufficient.

**Mitigation**: always call `IAuthorizationService.AuthorizeAsync(User, resource, policy)` after fetching the resource and before returning it. Return `403 Forbidden` (not `404 Not Found`) when the resource exists but the user lacks permission — unless you want to hide resource existence.

### Returning 404 vs 403

**What goes wrong**: returning `404 Not Found` for unauthorized access hides resource existence but can confuse legitimate users who have the wrong ID.

**Decision rule**: return `403 Forbidden` when the resource exists and the user is authenticated but lacks permission. Return `404 Not Found` only when you intentionally want to hide resource existence from unauthorized users (e.g., private content).


## Questions

> [!QUESTION]- What is the difference between role-based and resource-based authorization?
> Role-based authorization checks what type of user you are (e.g., Admin, Editor). Resource-based authorization checks your relationship to a specific resource instance (e.g., are you the owner of this document?). Use role-based for coarse-grained access control; use resource-based when the decision depends on data.

> [!QUESTION]- Why inject `IAuthorizationService` instead of checking ownership in the controller directly?
> `IAuthorizationService` centralizes authorization logic in handlers, making it testable and reusable across controllers. Direct ownership checks in controllers scatter authorization logic, making it easy to miss a check or apply it inconsistently. The handler pattern also supports multiple requirements composing into a single policy.


## References

- [Microsoft — Resource-based authorization in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased) — official guide with full implementation example including handler registration and controller usage
- [Microsoft — Policy-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies) — how to define and use authorization policies; covers requirement composition and handler ordering
- [OWASP — Broken Access Control (A01:2021)](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) — OWASP's top vulnerability category; Insecure Direct Object Reference (IDOR) is the canonical resource-based auth failure mode
- [Microsoft — Authorization in ASP.NET Core (overview)](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/introduction) — covers the full authorization model: simple, role-based, claims-based, and resource-based
