---
topic:
  - Programming
subtopic:
  - NET
summary: "How C# types define shape, behavior, and value versus reference assignment semantics."
tags: [FolderNote]
publish: true
status: Creation
priority: Medium
level:
  - "4"
---

A C# type defines what values exist, which operations are valid, and what assignment copies. Value types copy their contained value. Reference types copy a reference to one object. That distinction controls aliasing and equality long before stack-versus-heap details matter.

The folder separates the main forms. Classes and record classes are reference types. Structs and record structs are value types. Strings, delegates, and events add specialized behavior on top of the same type system.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Copy and Storage Boundaries

- **Assignment:** a value-type assignment copies every field. Reference fields inside that value still point to the same objects. A reference-type assignment copies the object reference, so both variables can observe mutations to one instance.
- **Arguments:** parameters are passed by value unless marked `ref`, `out`, or `in`. Passing a reference type by value copies the reference, not the object.
- **Storage:** value types may live inline inside heap objects and arrays. References may be local variables. Declaration kind does not dictate one physical location.
- **Boxing:** conversion from a value type to `object` or an interface value copies it into a box. Constrained generic calls can often avoid that allocation.

# Pitfalls

- **Hidden aliases.** Several references can point at one mutable object. Ownership must be clear. Shared models are easier to reason about when immutable.
- **Mutable value copies.** A property, indexer, or `foreach` variable usually exposes a struct copy. Mutation may be rejected by the compiler or affect only the copy. Readonly structs and whole-value replacement keep that boundary visible.
- **Equality chosen by accident.** Classes use reference equality unless they define another contract. Record classes and record structs synthesize value equality, while ordinary structs inherit field-based default equality. Domain identity should decide, not syntax convenience.

# Tradeoffs

- **Class or struct:** a class makes shared identity and inheritance available. A struct gives value-copy semantics and can avoid a separate allocation, but large copies and boxing may cost more.
- **Record class or conventional class:** records fit data whose contents define equality. Identity-rich entities usually need conventional class semantics.
- **Interface or constrained generic:** an interface value gives runtime polymorphism but boxes a struct. A constrained generic can preserve static typing and avoid the box.

# Examples

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

The direct `h.Counter.Inc()` call compiles, but it mutates the temporary value returned by the property and then discards that copy. A direct field assignment such as `h.Counter.Value = 1` is rejected with CS1612. Reading the value into `c`, mutating it, and assigning it back persists the change.

# Questions

> [!QUESTION]- Why can updating a value-type item inside `foreach` fail to persist, and what are safe fixes?
> The loop variable is normally a value copy, so changing it cannot update the collection element. Properties and ordinary indexers have the same copy boundary. Prefer immutable values and replace the whole element. A ref-returning API is appropriate only when in-place mutation is a deliberate part of the collection contract.

> [!QUESTION]- Where does boxing usually sneak in, and what is the practical mitigation in production code?
> Boxing usually appears at conversions to `object`, interface-typed variables, non-generic collections, and `params object[]`. Each box allocates and copies the value. Generic APIs such as `List<T>` and constrained calls keep values strongly typed. Profiling should identify whether that boundary is frequent enough to matter.

> [!QUESTION]- What criteria should drive choosing between `struct`, `class`, and `record class`?
> Start with semantics. A struct fits a small logical value when copying is expected and boxing is controlled. A conventional class fits an entity whose identity survives state changes. A record class fits reference-typed data whose contents define equality. Size, mutation, and measured allocation behavior can then reject an otherwise plausible choice.

# References

- [C# type system](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/)
