---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/fundamentals/types/types/","tags":["FolderNote"],"noteIcon":"3"}
---


# Intro

A C# type defines shape, behavior, and assignment semantics.
A common source of bugs is value semantics versus reference semantics: value types copy the value, while reference types copy object references.
That nuance matters for correctness, allocations, and API design, especially when code crosses boundaries such as collections, interfaces, and async flows.

## How It Works

- **Assignment:** assigning a value type copies the value (including any reference-type fields, which remain shared references); assigning a reference type copies a pointer-like reference to the same object.
- **Parameter passing default:** C# passes arguments by value unless you use `ref`, `out`, or `in`. For reference types, the copied value is still the reference, so object mutation is visible to both callers.
- **Storage model:** "stack vs heap" is a runtime placement detail. Value types can live inside heap objects, and references can be stored in stack frames.
- **Boxing boundary:** converting a value type to `object` or an interface boxes it (heap allocation + copy). Repeated boxing in hot paths can create avoidable GC pressure.

## Pitfalls

- Assuming reference types are always safe to pass around can create hidden shared-mutation bugs. This happens when multiple aliases point to one mutable object. Mitigate by preferring immutability for shared models or cloning at ownership boundaries.
- Using large or mutable structs can hurt both performance and correctness. A common failure mode is mutating a struct returned from a property or in a `foreach`, because you often mutate a copy, not the original value. Mitigate by keeping structs small and immutable (`readonly struct` where possible), and by avoiding APIs that expose mutable struct state through copying boundaries.

## Tradeoffs

- **`class` vs `struct`:** `class` avoids large copy costs and supports inheritance; `struct` can reduce allocations for small value-like data but is sensitive to copy/boxing overhead.
- **`record class` vs `class`:** records improve value-based equality and concise modeling, but default equality semantics may be wrong for identity-based domain entities.
- **Interface abstraction with value types:** interfaces improve design flexibility, but passing structs through interface-typed APIs may introduce boxing unless generic constraints keep calls strongly typed.

## Examples

```csharp
public struct Counter
{
    public int Value;
    public void Inc() => Value++;
}

public sealed class Holder
{
    public Counter Counter { get; set; }
}

var h = new Holder { Counter = new Counter { Value = 0 } };

// Property access returns a copy of the struct value.
h.Counter.Inc();
Console.WriteLine(h.Counter.Value); // 0

// Fix: replace the whole value after mutation.
var c = h.Counter;
c.Inc();
h.Counter = c;
Console.WriteLine(h.Counter.Value); // 1
```

## Questions

> [!QUESTION]- Why can updating a value-type item inside `foreach` fail to persist, and what are safe fixes?
> - The loop variable was a copy of a value type, so mutations were applied to the copy.
> - The same issue appears when mutating structs returned by properties, because property access often returns a copy.
> - Fix by making the struct immutable and replacing whole values, or by redesigning to avoid mutable structs in those paths.
> - If mutation is required, use APIs with explicit `ref` semantics very carefully.

> [!QUESTION]- Where does boxing usually sneak in, and what is the practical mitigation in production code?
> - Boxing happens when a value type is converted to `object` or interface-typed APIs.
> - Each boxing operation allocates and can increase GC pressure in hot paths.
> - Prefer generic APIs (`List<T>`, `EqualityComparer<T>`, generic interfaces) so calls stay strongly typed.
> - Verify with profiling before optimizing, then remove high-frequency boxing boundaries.

> [!QUESTION]- What criteria should drive choosing between `struct`, `class`, and `record class`?
> - Use `struct` for tiny immutable value objects when copy semantics are desired and boxing is controlled.
> - Use `class` for identity-rich entities where reference identity and lifecycle matter.
> - Use `record class` for data-centric models where value-based equality improves correctness.
> - Validate the choice against mutation rules, size/copy costs, and equality requirements.

## Links

- [C# type system overview](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/)
- [Value types (C# reference)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)
- [Reference types (C# reference)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/reference-types)
- [Boxing and unboxing (C# guide)](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing)
- [C# language specification: Types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types)
- [Choosing between class and struct](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/choosing-between-class-and-struct)
- [Writing large responsive .NET apps: common allocations](https://learn.microsoft.com/en-us/dotnet/framework/performance/writing-large-responsive-apps#common-allocations-and-examples)
- [Mutating readonly structs (Eric Lippert)](https://ericlippert.com/2008/05/14/mutating-readonly-structs/)

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
