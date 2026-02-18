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

A namespace is a logical scope for organizing types (classes, structs, interfaces, enums, delegates). Namespaces help structure code and prevent naming collisions.
It is providing:
1. Uniqueness for type names (same simple name can exist in different namespaces)
2. Organizing large codebases into logical modules
3. Improving readability and navigation

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

## Questions

> [!QUESTION]- What is a namespace? Why do we need it?
> A namespace groups related types and avoids name collisions; it also helps organize large projects.

## Links

- [Declare namespaces to organize types](https://learn.microsoft.com/dotnet/csharp/fundamentals/types/namespaces)
- [namespace keyword](https://learn.microsoft.com/dotnet/csharp/language-reference/keywords/namespace)

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
