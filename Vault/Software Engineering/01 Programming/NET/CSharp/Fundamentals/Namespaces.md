---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Creation
dg-publish: true
---

# Intro

A namespace is a logical scope for organizing types (classes, structs, interfaces, enums, delegates) in C#. It prevents naming collisions and makes large solutions easier to navigate by grouping related code into a clear, discoverable API surface. Encapsulation and versioning boundaries come from assemblies and access modifiers, not namespaces.

Namespaces provide:
1. Disambiguation for type names (`User` can exist in multiple namespaces)
2. Logical modularization of large codebases
3. Better readability and discoverability in tooling

Example (block-scoped namespace):

```csharp
namespace MyProject.Utilities
{
    public static class MathUtility
    {
        public static int Add(int a, int b) => a + b;
    }
}
```

Example (file-scoped namespace):

```csharp
namespace MyProject.Utilities;

public static class MathUtility
{
    public static int Add(int a, int b) => a + b;
}
```

## Pitfalls

**Namespace collision between libraries** — when two NuGet packages define the same fully qualified type name, the compiler reports ambiguity. A real case: migrating from `System.Data.SqlClient` to `Microsoft.Data.SqlClient` while both packages are referenced causes every `SqlConnection` usage to error. Fix with `extern alias` in the project file, or complete the migration before removing the old package.

**Global using overreach** — C# 10 `global using` directives apply to every file in the project. A team added `global using Newtonsoft.Json;` and `global using System.Text.Json;` simultaneously, causing ambiguity errors on `JsonSerializer` across 200+ files. Limit global usings to universally unambiguous imports (`System`, `System.Collections.Generic`); keep domain-specific namespaces in per-file `using` directives.

**Namespace/assembly mismatch** — the compiler does not enforce alignment between namespace name and assembly name. A type in `MyApp.Utilities` can live in `MyApp.Core.dll`. Misaligned namespaces cause autocompletion to mislead developers about which assembly to reference and make `dotnet add package` discovery harder.


## Tradeoffs

- File-scoped namespaces reduce indentation and noise for one-namespace-per-file layouts, which improves readability in modern codebases.
- Block-scoped namespaces are still useful when a file intentionally contains multiple namespace blocks or mixed declarations.

## Questions

> [!QUESTION]- When should you prefer file-scoped namespaces over block-scoped namespaces?
> Prefer file-scoped namespaces when a file contains one namespace and regular type declarations, because it reduces indentation and visual noise. Use block-scoped form when a file needs multiple namespace blocks or unusual nesting patterns.

## Links

- [Declare namespaces to organize types](https://learn.microsoft.com/dotnet/csharp/fundamentals/types/namespaces) — official overview and best-practice guidance for namespace declaration and usage.
- [namespace keyword](https://learn.microsoft.com/dotnet/csharp/language-reference/keywords/namespace) — exact language rules and syntax variants including file-scoped form.
- [Global using directives (C# 10)](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-10#global-using-directives) — covers the new `global using` syntax, when to use it, and common pitfalls.
- [Namespace naming guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/names-of-namespaces) — Framework Design Guidelines naming conventions for public APIs.
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp|CSharp]]
>
> **Topics**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Types|Types]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Exception Handling|Exception Handling]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Foreach|Foreach]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Generics|Generics]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Methods|Methods]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Reflection|Reflection]]
<!-- whats-next:end -->
