---
publish: true
created: 2026-08-20T20:41:15.656Z
modified: 2026-08-20T20:41:15.657Z
published: 2026-08-20T20:41:15.657Z
topic:
  - Programming
subtopic:
  - NET
summary: A logical scope organizing types and preventing naming collisions.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A namespace gives a type a qualified name. `Billing.User` and `Identity.User` can coexist because the namespace is part of each type's identity. It also gives IDEs and readers a map of the API.

A namespace is not a deployment or access boundary. Assemblies control packaging and loading. Access modifiers control visibility. Two types in the same namespace can live in different assemblies, and sharing a namespace grants no special access.

Block-scoped syntax can contain more than one namespace block in a file:

```csharp
namespace MyProject.Utilities
{
    public static class MathUtility
    {
        public static int Add(int a, int b) => a + b;
    }
}
```

File-scoped syntax is the common one-namespace-per-file form:

```csharp
namespace MyProject.Utilities;

public static class MathUtility
{
    public static int Add(int a, int b) => a + b;
}
```

# Name Lookup and `using`

`using` shortens names within a compilation unit. It does not reference an assembly or copy anything into the file.

- A namespace or type alias disambiguates or shortens a name: `using Json = System.Text.Json;`.
- `using static System.Math;` brings static members such as `Sqrt` into scope.
- C# 12 extended aliases to more type forms, including tuples and arrays: `using Point = (int X, int Y);`.
- `extern alias` handles the rare case where referenced assemblies expose the same fully qualified type. The reference receives an alias, then code qualifies the type with syntax such as `OldSql::System.Data.SqlClient.SqlConnection`.

Name resolution starts in the innermost scope and works outward. A nearby declaration can therefore hide a same-named type from an outer namespace. A fully qualified name removes that ambiguity.

## Project Conventions

- `<ImplicitUsings>enable</ImplicitUsings>` asks the SDK to generate a framework-specific set of `global using` directives.
- `<RootNamespace>` influences generated code and project templates. It does not make the compiler enforce a folder-to-namespace mapping.

Keeping namespaces aligned with folders is still useful when it reflects real ownership. Blindly mirroring every folder creates churn when files move without changing their API role.

# Pitfalls

**Conflicting short names.** Referencing both `System.Data.SqlClient` and `Microsoft.Data.SqlClient` can make `SqlConnection` ambiguous. A normal alias is enough when the namespaces differ. `extern alias` is needed only when two assemblies expose the same fully qualified name.

**Global-using overreach.** Importing both `Newtonsoft.Json` and `System.Text.Json` globally makes `JsonSerializer` ambiguous across the project. Global imports work best for stable, widely used namespaces. Local aliases keep competing APIs explicit.

**Misleading ownership.** A type in `MyApp.Utilities` can live in `MyApp.Core.dll`. That is legal, but a namespace that points at the wrong subsystem makes package and dependency discovery harder.

# Tradeoffs

- File-scoped namespaces remove one indentation level when the whole file belongs to one namespace.
- Block-scoped namespaces remain useful for files that intentionally contain multiple namespace blocks.

# Questions

> [!QUESTION]- When is `extern alias` necessary instead of an ordinary `using` alias?
> Use an ordinary alias when two types have different fully qualified names. `extern alias` is for conflicting types whose assembly-qualified identities differ but whose fully qualified type names are identical.

# References

- [Declare namespaces to organize types](https://learn.microsoft.com/dotnet/csharp/fundamentals/types/namespaces)
