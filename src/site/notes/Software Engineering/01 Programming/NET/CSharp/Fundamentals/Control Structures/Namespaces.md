---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/fundamentals/control-structures/namespaces/","noteIcon":""}
---

# Namespaces

# Intro

A namespace is a logical scope for organizing types (classes, structs, interfaces, enums, delegates). Namespaces help structure code and prevent naming collisions.

## Deeper Explanation

Namespaces:

1. Provide uniqueness for type names (same simple name can exist in different namespaces)
2. Organize large codebases into logical modules
3. Improve readability and navigation

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
