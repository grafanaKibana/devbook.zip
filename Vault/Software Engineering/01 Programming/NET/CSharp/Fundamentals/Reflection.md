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
# Reflection

# Intro

Reflection is the ability to inspect types, members, and assemblies at runtime using APIs in `System.Reflection`. It's commonly used by frameworks (DI, serializers, test runners), tools, and dynamic behaviors.

## Deeper Explanation

Reflection can be used for:

1. Inspecting types, methods, properties, and attributes
2. Dynamic object creation and method invocation
3. Working with assemblies and metadata

Example (inspect methods):

```csharp
using System.Reflection;

var type = typeof(string);
foreach (MethodInfo m in type.GetMethods())
{
    Console.WriteLine(m.Name);
}
```

## Questions

> [!QUESTION]- What is reflection?
> Runtime inspection of assemblies, types, members, and attributes (via `System.Reflection`), sometimes also used to invoke members dynamically.

> [!QUESTION]- What is an attribute and why do we need it?
> An attribute is metadata attached to code. It can be discovered (often via reflection) and used by frameworks/tools to drive behavior (serialization, DI, validation, routing, tests, etc.).

## Links

- [Reflection overview (.NET)](https://learn.microsoft.com/dotnet/fundamentals/reflection/overview)
- [Reflection and attributes (C#)](https://learn.microsoft.com/dotnet/csharp/advanced-topics/reflection-and-attributes/)

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
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Namespaces|Namespaces]]
<!-- whats-next:end -->
