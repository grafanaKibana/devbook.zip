---
publish: true
title: C# Types
created: 2026-10-28T12:27:02.961Z
modified: 2026-10-28T12:33:02.657Z
published: 2026-10-28T12:33:02.657Z
tags:
  - FolderNote
topic:
  - Programming
subtopic:
  - NET
summary: How C# types define shape, behavior, and value versus reference assignment semantics.
status: Creation
priority: Medium
level:
  - "4"
qard-deck: Programming
qard-topic: NET/CSharp/Fundamentals/Types/Types
flashcard_uid: a5c39ae2
---

A C# type defines what values exist, which operations are valid, and what assignment copies. Value types copy their contained value. Reference types copy a reference to one object. That distinction controls aliasing and equality long before stack-versus-heap details matter.

The folder separates the main forms. Classes and record classes are reference types. Structs and record structs are value types. Strings, delegates, and events add specialized behavior on top of the same type system.

<nav style="--card-accent: 244, 63, 94;" class="folder-structure-map" aria-label="Types section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Classes">Classes</span></span></div><p class="db-card-summary">A C# reference type combining shared object identity with state, inheritance, and virtual dispatch.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Classes.md" data-tooltip-position="top" aria-label="Classes">Classes</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Delegates">Delegates</span></span></div><p class="db-card-summary">A type-safe function pointer for storing, passing, and invoking methods as values.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Delegates.md" data-tooltip-position="top" aria-label="Delegates">Delegates</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Events">Events</span></span></div><p class="db-card-summary">A restricted delegate member implementing publisher and subscriber communication.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Events.md" data-tooltip-position="top" aria-label="Events">Events</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Records">Records</span></span></div><p class="db-card-summary">Data-centric C# types with generated value equality, ToString, and with-expressions.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Records.md" data-tooltip-position="top" aria-label="Records">Records</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Strings">Strings</span></span></div><p class="db-card-summary">An immutable C# reference type where any text change creates a new value.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Strings.md" data-tooltip-position="top" aria-label="Strings">Strings</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Structs">Structs</span></span></div><p class="db-card-summary">A value type holding its value inline, so assignment copies it.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Structs.md" data-tooltip-position="top" aria-label="Structs">Structs</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid var(--interactive-accent, var(--secondary, #437100)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Copy and Storage Boundaries

- **Assignment:** a value-type assignment copies every field. Reference fields inside that value still point to the same objects. A reference-type assignment copies the object reference, so both variables can observe mutations to one instance.
- **Arguments:** parameters are passed by value unless marked `ref`, `out`, or `in`. Passing a reference type by value copies the reference, not the object.
- **Storage:** value types may live inline inside heap objects and arrays. References may be local variables. Declaration kind does not dictate one physical location.
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

> [!qard]- Why might changing a struct inside `foreach` not update the collection, and how can it be fixed?
> In an ordinary (non-`ref`) `foreach`, each struct element reaches the loop body as a copy held in a read-only iteration variable. Changes to the copy's own fields never reach the stored element.
>
> - Assigning the iteration variable, or one of its fields, is rejected by the compiler.
> - Calling a mutating method on it compiles, but the method changes the copy's fields rather than the stored element's, so the update is silently lost.
>
> The copy is shallow. When a field of the struct refers to an object, such as a `List<T>`, the copy and the stored element refer to the same object. A change made to that object through the copy, such as adding an item, therefore remains visible through the collection. Only changes to the struct's own field values are lost.
>
> The stored elements can be updated in two ways:
>
> - **Indexed write-back:** a loop by index reads `items[i]` into a local, changes the local and assigns it back to `items[i]`, replacing the whole element value.
> - **`ref` iteration:** when the collection exposes its elements by reference, as `Span<T>` does, `foreach (ref var item in span)` makes `item` an alias for the stored element, so changes apply in place.
>
> Mutable structs make this mistake easy. Immutable structs, updated by creating a new value and assigning it back, keep the copy boundary visible.
>
> Sources: [Microsoft Learn: Iteration statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements) · [Microsoft Learn: Structure types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct) · [Microsoft Learn: Value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)

<!-- qard-id: b89f32ef-f23d-488d-a26a-78ebe0051826 -->

> [!qard]- Where does boxing commonly happen, and how can it be reduced?
> Boxing happens wherever a value type is converted to `object` or to an interface it implements. The runtime allocates an object on the managed heap and copies the value into it. A nullable value type is boxed according to its contents: a populated `int?` boxes its underlying `int` value, and an empty one converts to a `null` reference without allocating.
>
> Common places:
>
> - **`object`-typed variables, collections and parameters:** `object o = 42;`, adding an `int` to a `List<object>` or an `ArrayList`, or passing a struct to a parameter of type `object`.
> - **Interface-typed variables and parameters:** assigning a struct to an `IComparable` variable, or passing it where an interface type is declared.
>
> Each box is a separate heap allocation that the garbage collector must later reclaim. The box also holds a copy, so later changes to the original value do not affect it.
>
> Ways to reduce boxing:
>
> - **Generic collections and APIs:** a generic collection such as `List<int>` is specialized for `int`, so adding an element stores the value without converting it to `object`.
> - **Constrained generics instead of interface-typed parameters:** a method such as `Max<T>(T a, T b) where T : IComparable<T>` can call `CompareTo` on a struct argument without converting it to the interface type, provided the struct itself implements that member.
>
> These changes matter mainly in frequently executed code. They justify extra API complexity where profiling shows boxing allocations are significant.
>
> Sources: [Microsoft Learn: Boxing and unboxing](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing) · [Microsoft Learn: Nullable value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-value-types#boxing-and-unboxing) · [Microsoft Learn: Generic classes and methods](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/generics) · [Microsoft Learn: OpCodes.Constrained](https://learn.microsoft.com/en-us/dotnet/api/system.reflection.emit.opcodes.constrained?view=net-10.0)

<!-- qard-id: d5bda60c-1799-4e4a-ab36-7624ae085e3a -->

> [!qard]- When should a type be a `struct`, `class`, or `record class`?
> The choice follows the semantics the type needs. A `struct` fits a small value that is copied field by field, a `class` fits an object with its own identity, and a `record class` fits a reference type whose contents define its equality. Copying, mutation and measured allocation costs then confirm or adjust that semantic choice.
>
> | Aspect | `struct` | `class` | `record class` |
> |---|---|---|---|
> | Assignment and passing | Copies every field, so each variable holds its own field values. The copy is shallow: a reference-type field copies only the reference, so both copies can still point to one object. | Copies a reference, so several variables can share and observe one object. | Copies a reference, as a class does. |
> | Default equality | `Equals` is true when both have the same type and the same stored values. | Equality holds only when both references point to the same object, even if every field matches. | Compiler-generated `Equals` and `==` compare the type and member values. The generated `GetHashCode` compares nothing; it returns hash codes compatible with that equality, so equal records hash equally. |
> | Mutation | A change to a copy's own fields affects only that copy, so such changes are easy to lose. A change to an object reached through a reference field is visible through every copy that shares it. | A change is visible through every reference to the object. | Positional properties are init-only by default, and a `with` expression creates a modified shallow copy whose reference-type members still point to the same objects. |
> | Allocation and cost | Stored inline in the variable, field or array element that holds it, with no allocation of its own. Large values make every copy expensive, and boxing allocates. | One heap allocation per instance. | One heap allocation per instance, as with a class. |
> | Inheritance | Cannot derive from another struct or class or serve as a base type, though it can implement interfaces. | Supports class inheritance. | Can inherit only from another record. |
> | Typical fit | Small data-centric values with little behavior, such as a coordinate. | Entities with identity, a lifecycle or polymorphic behavior. | Data defined by its contents, such as messages or DTOs. |
>
> Sources: [Microsoft Learn: Structure types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct) · [Microsoft Learn: Value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types) · [Microsoft Learn: Classes (C# language specification)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes) · [Microsoft Learn: Records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record)

# References

- [C# type system](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/)
