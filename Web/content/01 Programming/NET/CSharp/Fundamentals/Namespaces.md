---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
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

## using Directives and Aliases

`using` brings names into scope; it has several flavours beyond the basic import:

- **Type/namespace alias** — disambiguate or shorten: `using Json = System.Text.Json;` then `Json.JsonSerializer`.
- **`using static`** — import a type's static members directly: `using static System.Math;` lets you write `Sqrt(x)` instead of `Math.Sqrt(x)`.
- **Alias *any* type (C# 12)** — including tuples, arrays, and generics: `using Point = (int X, int Y);` or `using IntList = System.Collections.Generic.List<int>;`.
- **`extern alias`** — the heavy hammer for the rare case where two referenced assemblies expose the *same* fully-qualified type. You assign each reference an alias in the project file and qualify with `extern alias OldSql;` / `OldSql::System.Data.SqlClient.SqlConnection`.

Name resolution searches from the **most-nested** namespace outward, so a type in the current namespace shadows a same-named type in an outer one.

### Project-level conventions

- **`<ImplicitUsings>enable</ImplicitUsings>`** auto-adds a set of `global using`s (System, Linq, Collections.Generic, …) for the SDK, removing boilerplate from every file.
- **`<RootNamespace>`** sets the default namespace the templates/`dotnet new` use; the compiler does **not** force namespace to match folder structure, but most teams keep `Namespace == folder path` by convention for navigability.

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
