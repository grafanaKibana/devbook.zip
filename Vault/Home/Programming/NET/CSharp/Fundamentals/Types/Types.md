---
title: C# Types
topic: [Programming]
subtopic: [NET]
summary: "How C# types define shape, behavior, and value versus reference assignment semantics."
tags: [FolderNote]
publish: true
status: New
priority: Medium
level: ["4"]
qard-deck: "Programming"
qard-topic: "NET/CSharp/Fundamentals/Types/Types"
flashcard_uid: "a5c39ae2"
created: "2026-02-10T16:03:55.000Z"
modified: "2026-11-12T10:29:34.513Z"
published: "2026-07-08T13:14:17.329Z"
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
- **Storage:** a value type is stored inline in whatever holds it: a local variable, a field of a heap object, or an array element. A reference-type variable holds only a reference to an object instance, so the reference and the object are distinct. Where either physically resides is a runtime detail. Declaration kind therefore does not dictate one physical location.
- **Boxing:** conversion from a value type to `object` or an interface value copies it into a box. Constrained generic calls can often avoid that allocation. Nullable value types box differently: a populated `Nullable<T>` boxes its underlying `T` value, and an empty one converts to a `null` reference without allocating a box.

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
var h = new Holder { Counter = new Counter { Value = 0 } };

// Property access returns a copy of the struct value.
h.Counter.Inc();
Console.WriteLine(h.Counter.Value); // 0

// Fix: replace the whole value after mutation.
var c = h.Counter;
c.Inc();
h.Counter = c;
Console.WriteLine(h.Counter.Value); // 1

public struct Counter
{
    public int Value;
    public void Inc() => Value++;
}

public sealed class Holder
{
    public Counter Counter { get; set; }
}
```

The direct `h.Counter.Inc()` call compiles, but it mutates the temporary value returned by the property and then discards that copy. A direct field assignment such as `h.Counter.Value = 1` is rejected with CS1612. Reading the value into `c`, mutating it, and assigning it back persists the change.

# Questions

<!-- qard-id: d8eb59cf-ad2d-43be-954f-44db23f34d38 -->
> [!qard]- Why does a mutating method in a normal `foreach` leave the stored struct’s fields unchanged?
> A normal `foreach` copies each struct element into the loop variable. A mutating method changes that copy, but `foreach` never writes it back. The struct stored in the collection therefore keeps its original field values.
>
> For an array of `Counter` structs starting at `0`, where `Increment()` increases `Value`:
>
> ```csharp
> foreach (Counter counter in counters)
> {
>     counter.Increment();
> }
>
> Console.WriteLine(counters[0].Value);
> ```
>
> The output is `0`. Conceptually, each iteration works like this, where `i` is the element’s index:
>
> ```csharp
> Counter copy = counters[i];
> copy.Increment();
> ```
>
> There is no `counters[i] = copy` to save the change. This illustrates the copying behavior, rather than exact compiler output.
>
> This concerns the struct’s own fields; objects referenced by those fields can still be shared and changed.
>
> Sources: [Microsoft Learn: Iteration statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements) · [Microsoft Learn: Value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)

> [!qard]- How can stored struct elements be updated rather than discarded copies?
> The stored elements can be updated in two ways. The same read-modify-write-back approach applies to an ordinary struct-valued property:
>
> - **Indexed write-back:** a loop by index reads `items[i]` into a local, changes the local and assigns it back to `items[i]`, replacing the whole element value.
> - **`ref` iteration:** when the collection exposes its elements by reference, as `Span<T>` does, `foreach (ref var item in span)` makes `item` an alias for the stored element, so changes apply in place.
> 
> Mutable structs make this mistake easy. Immutable structs, updated by creating a new value and assigning it back, keep the copy boundary visible.
>
> Sources: [Microsoft Learn: Iteration statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements) · [Microsoft Learn: Structure types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct) · [Microsoft Learn: Value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)

<!-- qard-id: b89f32ef-f23d-488d-a26a-78ebe0051826 -->
> [!qard]- Where does boxing commonly happen?
> Wherever a value type is converted to `object` or to an interface type. Everyday cases:
>
> - **`object` or `params object[]` parameters:** `logger.LogInformation("Id {Id}", id)`, `string.Format("{0}", 42)`.
> - **Non-generic collections:** `ArrayList.Add(42)`.
> - **Interface-typed variables:** `IComparable c = 42;`.
>
> Each box is a separate heap allocation holding a copy of the value.
>
> Sources: [Microsoft Learn: Boxing and unboxing](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing)

> [!qard]- How can boxing be reduced on a measured hot path?
> The conversion to object or an interface value must be removed from the actual call path.
>
> - **Generic collections and APIs:** a generic collection such as `List<int>` is specialized for `int`, so adding an element stores the value without converting it to `object`.
> - **Constrained generics instead of interface-typed parameters:** a method such as `Max<T>(T a, T b) where T : IComparable<T>` can call `CompareTo` on a struct argument without converting it to the interface type, provided the struct itself implements that member.
> 
> These changes matter mainly in frequently executed code. They justify extra API complexity where profiling shows boxing allocations are significant.
>
> Sources: [Microsoft Learn: Boxing and unboxing](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing) · [Microsoft Learn: Nullable value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-value-types#boxing-and-unboxing) · [Microsoft Learn: Generic classes and methods](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/generics) · [Microsoft Learn: OpCodes.Constrained](https://learn.microsoft.com/en-us/dotnet/api/system.reflection.emit.opcodes.constrained?view=net-10.0)

<!-- qard-id: d5bda60c-1799-4e4a-ab36-7624ae085e3a -->
> [!qard]- When does each C# type kind fit, from `class` and `record class` to the struct variants?
> Identity or shared state → a reference type; a small value without identity → a value type; then pick the variant.
>
> - **`class`**: an object with identity or an inheritance hierarchy, because equality compares references by default: two objects with equal fields are still two objects.
> - **`record class`**: reference-type data defined by its values, because the compiler generates value equality (`Equals`, `GetHashCode`, `==`), a member-printing `ToString` and `with`; it can be null and can inherit only from another record.
> - **`struct`**: a small value copied whole, because every assignment, by-value argument and return copies all its fields without a separate heap allocation. Microsoft advises a struct only for a single logical, small (<16 bytes), immutable, rarely boxed value.
> - **`ref struct`**: required when a type holds a `Span<T>`, another `ref struct` or a `ref` field, because only a type that never reaches the managed heap may hold them.
> - **`readonly struct`**: the default form for a struct, because mutable value types are discouraged: no field changes after construction, so no change is lost on a copy.
> - **`readonly record struct`**: the usual form for a small value with generated equality, because its positional properties are init-only.
> - **`record struct`**: generated value equality for a value whose members must stay settable, so it carries the mutable-struct risk.
>
> Sources: [Microsoft Learn: Choosing between class and struct](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/choosing-between-class-and-struct) · [Microsoft Learn: Records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) · [Microsoft Learn: Structure types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct) · [Microsoft Learn: ref structure types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/ref-struct)

> [!qard]- Why can two anonymous objects compare unequal with `==` but match in `Intersect`?
> Anonymous types synthesize value-based `Equals` and `GetHashCode`, but do not overload `==`; that operator compares reference identity. Two separately created anonymous objects with the same property names, types, order, and values in the same assembly therefore compare unequal with `==` but equal with `Equals`. `Intersect` uses the default equality comparer, which uses their generated equality and hash rather than the `==` operator. Each property is compared with its own type's equality, not recursively by arbitrary object contents. [Microsoft: anonymous types](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/anonymous-types)

# References

- [C# type system](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/)
