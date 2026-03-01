---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/fundamentals/namespaces/"}
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

## Tradeoffs

- File-scoped namespaces reduce indentation and noise for one-namespace-per-file layouts, which improves readability in modern codebases.
- Block-scoped namespaces are still useful when a file intentionally contains multiple namespace blocks or mixed declarations.

## Questions

> [!QUESTION]- What is a namespace? Why do we need it?
> A namespace groups related types and prevents naming conflicts by enabling fully qualified names when simple names collide. In daily development, `using` directives keep call sites readable while preserving unambiguous resolution during compilation. It also improves project structure by mapping code to logical domains.

> [!QUESTION]- When should you prefer file-scoped namespaces over block-scoped namespaces?
> Prefer file-scoped namespaces when a file contains one namespace and regular type declarations, because it reduces indentation and visual noise. Use block-scoped form when a file needs multiple namespace blocks or unusual nesting patterns.

## Links

- [Declare namespaces to organize types](https://learn.microsoft.com/dotnet/csharp/fundamentals/types/namespaces) - Official overview and best-practice guidance.
- [namespace keyword](https://learn.microsoft.com/dotnet/csharp/language-reference/keywords/namespace) - Exact language rules and syntax variants.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp\|CSharp]]
>
> **Topics**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Types\|Types]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Exception Handling\|Exception Handling]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Foreach\|Foreach]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Generics\|Generics]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Methods\|Methods]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Reflection\|Reflection]]
<!-- whats-next:end -->
