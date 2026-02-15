---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Creation
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

## Links

- [Reflection overview (.NET)](https://learn.microsoft.com/dotnet/fundamentals/reflection/overview)
- [Reflection and attributes (C#)](https://learn.microsoft.com/dotnet/csharp/advanced-topics/reflection-and-attributes/)
