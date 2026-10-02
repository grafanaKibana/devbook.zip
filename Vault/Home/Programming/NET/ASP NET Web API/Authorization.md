---
topic:
  - Programming
subtopic:
  - NET
summary: "Deciding what an authenticated user may do via roles, claims, or policies."
level:
  - "1"
priority: Medium
status: Ready to Repeat
publish: true
---

Authorization decides whether the current principal may perform an operation. Authentication supplies the identity. Authorization evaluates roles, claims, or policy requirements against that identity. When the decision depends on an object already loaded from storage, the object becomes an additional authorization resource.

# Role-Based Authorization

Role checks restrict an endpoint to principals carrying one of the accepted role claims.

```csharp
// Restrict to users with the "Admin" role
[Authorize(Roles = "Admin")]
public IActionResult AdminDashboard() => Ok();

// Multiple roles (OR logic — any of these roles grants access)
[Authorize(Roles = "Admin,Manager")]
public IActionResult Reports() => Ok();
```

ASP.NET Core reads roles from claims using the configured role-claim type. Roles work for coarse access groups, but they become awkward when permissions vary independently or depend on resource state.

# Policy-Based Authorization

A policy names one or more requirements. Handlers evaluate those requirements outside the controller, leaving the endpoint responsible for selecting the policy rather than implementing its rules.

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

Custom requirements implement `IAuthorizationRequirement`. One or more handlers decide whether each requirement succeeds.

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

The example keeps the handler mechanics visible, but its year-only age calculation is incomplete around birthdays. A production handler should use `DateOnly.TryParse`, leave the requirement unsatisfied when the claim is missing or malformed, and compare the full birth date under a defined time-zone policy.

# Resource-Based Authorization

An attribute cannot evaluate a document that has not been loaded yet. In that case, the action loads the resource and calls `IAuthorizationService` with both the principal and the object.

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

The `"CanEditDocument"` handler receives `document` as `AuthorizationHandlerContext.Resource`. Ownership or workflow-state checks can then use the actual record rather than identifiers supplied by the client.

# Defaults, Fallback, and Advanced Hooks

- **`FallbackPolicy` can make authentication the default.** It applies when an endpoint has no explicit authorization metadata, so a forgotten `[Authorize]` does not silently expose the endpoint.

  ```csharp
  builder.Services.AddAuthorization(options =>
  {
      options.FallbackPolicy = new AuthorizationPolicyBuilder()
          .RequireAuthenticatedUser().Build();   // everything requires auth unless [AllowAnonymous]
  });
  ```

  `DefaultPolicy` is different: a bare `[Authorize]` uses it.
- **Several handlers can provide OR semantics for one requirement.** Authorization succeeds when any registered handler marks that requirement successful, unless the context has been explicitly failed. Stacking different `[Authorize]` attributes still produces AND semantics across policies.
- **`RequireAssertion`** keeps a small one-off condition inline with policy registration: `policy.RequireAssertion(ctx => ctx.User.HasClaim(...))`.
- **`IAuthorizationMiddlewareResultHandler`** changes how challenge and forbid results become HTTP responses, for example by returning a Problem Details body.
- **Minimal APIs** attach the same policies through endpoint metadata: `app.MapGet("/admin", ...).RequireAuthorization("CanApproveOrders")`.

# Pitfalls

## Inconsistent 403 and 404 Semantics

The status code itself can become an existence oracle. Returning 404 for missing records and 403 for existing-but-forbidden records tells a caller which identifiers are real.

Sensitive resources often need the same 404 response for both cases. For public resources, 403 is more informative and can be the correct contract.

Choose the rule by resource sensitivity and apply it consistently, including timing and response shape where enumeration risk matters.

## Authorization Logic in Controllers

Checks such as `if (user.Role == "Admin" || user.Id == resource.OwnerId)` tend to spread across actions. Small differences then create permission drift.

The controller already has the user and resource, so an inline condition looks cheaper at first.

Move reusable access rules into handlers. The controller should select a policy declaratively or call `AuthorizeAsync` after loading a resource.

# Tradeoffs

- **Roles or policies:** roles are readable for coarse groups such as administrators. Policies express permissions and compose claims or custom handlers without baking those rules into controllers.
- **Principal-only or resource-based checks:** endpoint metadata is enough when the decision depends only on the principal and request metadata. A loaded entity requires an imperative resource-based check.
- **Declarative or imperative evaluation:** `[Authorize]` fails before action execution and keeps the rule visible on the endpoint. `AuthorizeAsync` is necessary when the action must first load the object that the handler will inspect.

# References

- [Authorization in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/introduction)
