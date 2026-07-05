---
publish: true
created: 2026-07-05T10:53:26.796+03:00
modified: 2026-07-05T17:36:34.273+03:00
---

# Authorization in ASP.NET Core

Authorization determines _what_ an authenticated user is allowed to do. It runs after authentication (which establishes _who_ the user is) and evaluates whether the current `ClaimsPrincipal` has permission to access a resource or perform an action. ASP.NET Core supports three authorization models: **role-based**, **claims-based**, and **policy-based** (the most flexible). Resource-based authorization handles cases where the decision depends on the specific resource being accessed.

## Role-Based Authorization

The simplest model: restrict access to users with a specific role claim.

```csharp
// Restrict to users with the "Admin" role
[Authorize(Roles = "Admin")]
public IActionResult AdminDashboard() => Ok();

// Multiple roles (OR logic — any of these roles grants access)
[Authorize(Roles = "Admin,Manager")]
public IActionResult Reports() => Ok();
```

Roles are stored as claims (`ClaimTypes.Role`) in the JWT or cookie. Role-based authorization is simple but inflexible — adding a new permission requires adding a new role or changing role assignments.

## Policy-Based Authorization

Policies are named requirements evaluated against the `ClaimsPrincipal`. They decouple the authorization logic from the controller.

```csharp
// Register policies in Program.cs
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanApproveOrders", policy =>
        policy.RequireClaim("department", "Finance")
              .RequireRole("Manager"));

    options.AddPolicy("MinimumAge18", policy =>
        policy.Requirements.Add(new MinimumAgeRequirement(18)));
});

// Apply a policy to an endpoint
[Authorize(Policy = "CanApproveOrders")]
public IActionResult ApproveOrder(string orderId) => Ok();
```

Custom requirements implement `IAuthorizationRequirement` and are evaluated by a handler:

```csharp
public sealed class MinimumAgeRequirement(int minimumAge) : IAuthorizationRequirement
{
    public int MinimumAge { get; } = minimumAge;
}

public sealed class MinimumAgeHandler : AuthorizationHandler<MinimumAgeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        MinimumAgeRequirement requirement)
    {
        var birthDateClaim = context.User.FindFirst("birthdate");
        if (birthDateClaim is null) return Task.CompletedTask;

        var birthDate = DateOnly.Parse(birthDateClaim.Value);
        var age = DateOnly.FromDateTime(DateTime.Today).Year - birthDate.Year;

        if (age >= requirement.MinimumAge)
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}

// Register the handler
builder.Services.AddSingleton<IAuthorizationHandler, MinimumAgeHandler>();
```

## Resource-Based Authorization

When the authorization decision depends on the specific resource (e.g., "can this user edit _this_ document?"), inject `IAuthorizationService` and evaluate imperatively:

```csharp
public sealed class DocumentsController(IAuthorizationService authz, IDocumentRepository docs)
    : ControllerBase
{
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, DocumentDto dto)
    {
        var document = await docs.FindAsync(id);
        if (document is null) return NotFound();

        // Check if the current user can edit this specific document
        var result = await authz.AuthorizeAsync(User, document, "CanEditDocument");
        if (!result.Succeeded) return Forbid();

        // Proceed with update...
        return Ok();
    }
}
```

The `"CanEditDocument"` policy handler receives the `document` as the resource and can check ownership, team membership, or any other resource-specific condition.

## Defaults, Fallback, and Advanced Hooks

- **Secure-by-default with `FallbackPolicy`** — set a fallback that applies to any endpoint _without_ an explicit `[Authorize]`/`[AllowAnonymous]`, so forgetting an attribute fails closed:

  ```csharp
  builder.Services.AddAuthorization(options =>
  {
      options.FallbackPolicy = new AuthorizationPolicyBuilder()
          .RequireAuthenticatedUser().Build();   // everything requires auth unless [AllowAnonymous]
  });
  ```

  `DefaultPolicy` (separately) is what a bare `[Authorize]` with no policy name evaluates.
- **OR within a requirement = multiple handlers** — the note above notes that stacked `[Authorize]` attributes are **AND**. To express **OR**, register _several handlers for the same requirement_; if **any** handler calls `context.Succeed(requirement)`, it passes. (One handler can also internally check several alternative conditions.)
- **`RequireAssertion`** — for one-off logic, skip the requirement/handler pair: `policy.RequireAssertion(ctx => ctx.User.HasClaim(...))`.
- **`IAuthorizationMiddlewareResultHandler`** — customize what a 403/forbidden actually returns (e.g. a Problem Details body) instead of the default empty response.
- **Minimal APIs** — apply policies fluently: `app.MapGet("/admin", ...).RequireAuthorization("CanApproveOrders")`.

## Pitfalls

### Returning 404 Instead of 403 for Unauthorized Resources

**What goes wrong**: returning `NotFound()` when a user tries to access a resource they don't own leaks information about the resource's existence.

**Why it happens**: developers return 404 to hide that the resource exists, but this is inconsistent — authenticated users who own the resource get 200, others get 404.

**Mitigation**: for sensitive resources, return 404 consistently (don't reveal existence). For non-sensitive resources, return 403 Forbidden so the client knows the resource exists but access is denied. Be consistent within an API.

### Authorization Logic in Controllers

**What goes wrong**: `if (user.Role == "Admin" || user.Id == resource.OwnerId)` scattered across controller actions. Logic is duplicated and hard to audit.

**Why it happens**: it's the path of least resistance when adding a quick permission check.

**Mitigation**: move all authorization logic into policies and handlers. Controllers should only call `authz.AuthorizeAsync()` or use `[Authorize(Policy = "...")]` — never contain authorization logic directly.

## Tradeoffs

- **Role-based vs policy-based**: Role-based is simple and appropriate for coarse-grained access (admin vs user). Policy-based is more flexible — requirements are composable, testable, and decouple permission logic from controllers. Prefer policy-based for any production system beyond the simplest use case.
- **Policy-based vs resource-based**: Use policy-based (attribute) when the decision is independent of the specific resource instance. Use resource-based (`IAuthorizationService.AuthorizeAsync`) when the decision depends on the resource's data (owner, state, team membership). Start with policy-based; add resource-based only where instance context is needed.
- **Declarative (`[Authorize]`) vs imperative (`authz.AuthorizeAsync`)**: Declarative is cleaner and evaluated at routing level. Imperative is necessary when the resource is only available after a database query — you cannot load the resource before the action method runs.

## Questions

> [!QUESTION]- When should you return 403 Forbidden vs 404 Not Found for an unauthorized resource access?
> Return 403 when the resource exists but the user lacks permission, and the resource's existence is not sensitive. Return 404 consistently when leaking the resource's existence is a security risk (e.g., private financial or health records).

> [!QUESTION]- What is the difference between `context.Succeed()` and `context.Fail()` in an authorization handler?
> `context.Succeed(requirement)` marks that requirement as satisfied. `context.Fail()` explicitly forces authorization failure regardless of other handlers' decisions — it cannot be overridden by a subsequent `Succeed`. Use `Fail` only when you have a definitive security reason to block access.

> [!QUESTION]- How do you implement OR logic across two authorization policies on a single endpoint?
> Multiple `[Authorize]` attributes stack with AND semantics — all policies must pass. For OR logic, implement a single custom `IAuthorizationRequirement` that internally checks whether any of the conditions is met, then apply that single requirement via one policy.

## References

- [Authorization in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/introduction) — official overview of role-based, claims-based, and policy-based authorization.
- [Policy-based authorization (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies) — detailed guide to custom requirements, handlers, and policy registration.
- [Resource-based authorization (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased) — how to use `IAuthorizationService` for per-resource authorization decisions.
- [[01 Programming/NET/ASP.NET Web API/Authentication|Authentication]] — the prerequisite: how ASP.NET Core establishes the `ClaimsPrincipal` before authorization runs.
- [[Resource-based Auth]] — the general pattern for resource-level access control, independent of ASP.NET Core.
