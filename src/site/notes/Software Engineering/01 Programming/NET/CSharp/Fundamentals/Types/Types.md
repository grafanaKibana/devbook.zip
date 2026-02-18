---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/fundamentals/types/types/","tags":["FolderNote"],"noteIcon":"1"}
---


# Intro

This hub is the entry point for C# type-system fundamentals. Use it to navigate the concrete type notes (`Classes`, `Structs`, `Records`, `Strings`, `Delegates`, `Events`) and to keep a small set of cross-cutting concepts in one place.

## How To Use This Hub

- Read this page first for assignment semantics, memory model myths, and decision rules.
- Go to child notes for deep details, pitfalls, and topic-specific interview questions.
- Treat this page as a navigation and synthesis layer, not the full theory dump.

## Mental Model

- A C# type defines shape, behavior, and assignment semantics.
- Value types copy data on assignment; reference types copy references.
- Where data ends up (stack/heap) depends on runtime context, not only on type category.

```csharp
var n1 = 10;
var n2 = n1;
n2++;
// n1 == 10, n2 == 11 (value copy)

var list1 = new List<int> { 1, 2 };
var list2 = list1;
list2.Add(3);
// list1 and list2 point to the same object (reference copy)
```

## Questions

> [!QUESTION]- What is the practical difference between value-type and reference-type assignment?
> Value-type assignment copies the value itself. Reference-type assignment copies the reference to the same object.

> [!QUESTION]- Do value types always live on the stack and reference types always on the heap?
> No. Storage location depends on context (local, field, captured variable, boxing), not only on the type category.

> [!QUESTION]- When does boxing happen, and why is it expensive?
> Boxing happens when a value type is converted to `object` or an interface. It allocates on the heap and adds copy/GC overhead.

> [!QUESTION]- Why must `Equals` and `GetHashCode` be consistent?
> Hash-based collections rely on the contract: equal objects must produce equal hash codes, otherwise lookups can fail.

> [!QUESTION]- How do you choose between `class`, `struct`, and `record` in C#?
> Use `class` for identity/reference semantics, `struct` for small immutable value-like data, and `record` for data models with value-based equality and concise syntax.

> [!QUESTION]- Why does passing a reference type by value still allow mutation of the object?
> Because the copied value is the reference itself, and both references still target the same object instance.

## Links

- [C# type system overview](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/)
- [Value types (C# reference)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)
- [Reference types (C# reference)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/reference-types)
- [Boxing and unboxing (C# guide)](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Fundamentals\|Fundamentals]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Classes\|Classes]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Delegates\|Delegates]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Events\|Events]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Records\|Records]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Strings\|Strings]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Structs\|Structs]]
<!-- whats-next:end -->
