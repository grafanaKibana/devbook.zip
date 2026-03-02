---
topic:
  - Security
subtopic:
  - Authentication
level:
  - "3"
priority: High
status: Creation

dg-publish: true
---

# Resource-Based Authorization

Resource-based authorization checks whether the current user has permission to perform an action on a specific resource instance — not just a resource type. It answers: "Can this user edit this specific document?" rather than "Can this user edit documents?"

## When to Use

Role-based authorization (`[Authorize(Roles = "Admin")]`) checks what type of user you are. Resource-based authorization checks ownership or relationship to a specific resource. Use it when authorization depends on data — for example, only the document owner can edit it.

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

## References

- [Microsoft — Resource-based authorization in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased) — official guide with full implementation example
- [Microsoft — Policy-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies) — how to define and use authorization policies
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/07 Security/07 Security|07 Security]]
>
> **Pages**
> - [[Software Engineering/07 Security/Authentication/Basic Auth|Basic Auth]]
> - [[Software Engineering/07 Security/Authentication/Oauth OIDC (OpenId Connect)|Oauth OIDC (OpenId Connect)]]
> - [[Software Engineering/07 Security/Authentication/SSO (Single Sign-On)|SSO (Single Sign-On)]]
> - [[Software Engineering/07 Security/Authentication/Two-Factor Auth|Two-Factor Auth]]
<!-- whats-next:end -->
