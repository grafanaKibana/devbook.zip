---
title: C# Types
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

> [!QUESTION]- Why might changing a struct inside `foreach` not update the collection, and how can it be fixed?
> A `foreach` variable normally contains a copy of the struct, so changing that copy does not change the element stored in the collection. Properties and ordinary indexers can return the same kind of copy. A safe fix is to create the changed value and assign the whole element back. A ref-returning API is appropriate only when the collection deliberately supports in-place mutation.

> [!QUESTION]- Where does boxing commonly happen, and how can it be reduced?
> Boxing commonly happens when a value type is converted to `object` or an interface, stored in a non-generic collection, or passed through `params object[]`. Each box creates a heap object and copies the value into it. Generic APIs such as `List<T>` and constrained generic calls can keep the value in its concrete type. Profiling should confirm that the boxing occurs often enough to matter before the API is made more complex.

> [!QUESTION]- When should a type be a `struct`, `class`, or `record class`?
> Start with assignment and equality semantics. A `struct` fits a small logical value that should be copied as a whole. A conventional class fits an entity whose identity stays the same while its state changes. A `record class` fits reference-typed data whose contents define equality. After that, size, mutation, boxing, and measured allocation cost can rule out a choice that looked correct from the data model alone.

# References

- [C# type system](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/)
