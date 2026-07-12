---
publish: true
created: 2026-07-11T21:42:52.862Z
modified: 2026-07-11T21:42:52.862Z
published: 2026-07-11T21:42:52.862Z
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
---

# Intro

A C# type defines shape, behavior, and assignment semantics.
A common source of bugs is value semantics versus reference semantics: value types copy the value, while reference types copy object references.
That nuance matters for correctness, allocations, and API design, especially when code crosses boundaries such as collections, interfaces, and async flows.

<nav style="--card-accent: 244, 63, 94;" class="folder-structure-map" aria-label="Types section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Classes">Classes</span></span></div><p class="db-card-summary">A reference type defining a heap-allocated object with state, inheritance, and dispatch.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Classes.md" data-tooltip-position="top" aria-label="Classes">Classes</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Delegates">Delegates</span></span></div><p class="db-card-summary">A type-safe function pointer for storing, passing, and invoking methods as values.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Delegates.md" data-tooltip-position="top" aria-label="Delegates">Delegates</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Events">Events</span></span></div><p class="db-card-summary">A restricted delegate member implementing publisher and subscriber communication.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Events.md" data-tooltip-position="top" aria-label="Events">Events</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Records">Records</span></span></div><p class="db-card-summary">Data-centric C# types with generated value equality, ToString, and with-expressions.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Records.md" data-tooltip-position="top" aria-label="Records">Records</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Strings">Strings</span></span></div><p class="db-card-summary">An immutable C# reference type where any text change creates a new value.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Strings.md" data-tooltip-position="top" aria-label="Strings">Strings</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Structs">Structs</span></span></div><p class="db-card-summary">A value type holding its value inline, so assignment copies it.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Fundamentals/Types/Structs.md" data-tooltip-position="top" aria-label="Structs">Structs</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

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
>
> - The loop variable was a copy of a value type, so mutations were applied to the copy.
> - The same issue appears when mutating structs returned by properties, because property access often returns a copy.
> - Fix by making the struct immutable and replacing whole values, or by redesigning to avoid mutable structs in those paths.
> - If mutation is required, use APIs with explicit `ref` semantics very carefully.

> [!QUESTION]- Where does boxing usually sneak in, and what is the practical mitigation in production code?
>
> - Boxing happens when a value type is converted to `object` or interface-typed APIs.
> - Each boxing operation allocates and can increase GC pressure in hot paths.
> - Prefer generic APIs (`List<T>`, `EqualityComparer<T>`, generic interfaces) so calls stay strongly typed.
> - Verify with profiling before optimizing, then remove high-frequency boxing boundaries.

> [!QUESTION]- What criteria should drive choosing between `struct`, `class`, and `record class`?
>
> - Use `struct` for tiny immutable value objects when copy semantics are desired and boxing is controlled.
> - Use `class` for identity-rich entities where reference identity and lifecycle matter.
> - Use `record class` for data-centric models where value-based equality improves correctness.
> - Validate the choice against mutation rules, size/copy costs, and equality requirements.

## References

- [C# type system overview](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/)
- [Value types (C# reference)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)
- [Reference types (C# reference)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/reference-types)
- [Boxing and unboxing (C# guide)](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing)
- [C# language specification: Types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types)
- [Choosing between class and struct](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/choosing-between-class-and-struct)
- [Writing large responsive .NET apps: common allocations](https://learn.microsoft.com/en-us/dotnet/framework/performance/writing-large-responsive-apps#common-allocations-and-examples)
- [Mutating readonly structs (Eric Lippert)](https://ericlippert.com/2008/05/14/mutating-readonly-structs/)
