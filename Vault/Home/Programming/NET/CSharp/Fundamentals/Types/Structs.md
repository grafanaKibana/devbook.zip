---
topic:
  - Programming
subtopic:
  - NET
summary: "A value type holding its value inline, so assignment copies it."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---
# Intro

A struct is a value type in C#. Variables hold the value inline, so assignment copies the value rather than copying a reference. That makes structs a good fit for small, immutable data representing one logical value (coordinates, money amounts, date-time pairs). Struct values can still live on the heap when embedded in heap objects, captured/hoisted, or boxed. Structs implicitly derive from `System.ValueType`, are always `sealed`, and cannot participate in class inheritance.

## Deeper Explanation

```csharp
public readonly struct Money
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }
}

var price = new Money(9.99m, "USD");
var copy = price;   // full bitwise copy — independent value
```

Key properties:

- Cannot participate in class inheritance (all structs implicitly derive from `System.ValueType`). Can implement interfaces.
- Cannot declare a finalizer. Cannot have `abstract`, `virtual`, or `protected` members.
- Always `sealed` implicitly.
- Default value is all fields set to their defaults (`0`/`false`/`null`). `default(T)` and array allocation always use this zeroed value.
- Equality should be explicit (`IEquatable<T>` + `Equals`/`GetHashCode`) because default value-type equality is field-by-field and can be slow in hot paths.

**When to use a struct instead of a class:**

- The type logically represents a single value (like `DateTime`, `Guid`, `decimal`).
- Instance size is 16 bytes or less.
- It is immutable (or you commit to `readonly struct`).
- It is not frequently boxed.
- You need to avoid heap allocation in a hot path.

## Struct Modifiers

### readonly struct

Fields must be `readonly`, and properties must be get-only or `init`-only. The compiler enforces immutability after construction, which reduces defensive copies when the struct is accessed through `in` parameters or `readonly` fields.

```csharp
public readonly struct Vector2
{
    public double X { get; }
    public double Y { get; }

    public Vector2(double x, double y) => (X, Y) = (x, y);

    public double Length => Math.Sqrt(X * X + Y * Y);
    public Vector2 Normalize() => new(X / Length, Y / Length);
}
```

Without `readonly`, the compiler can make a defensive copy when a non-`readonly` member is called through a readonly receiver (for example, an `in` parameter), because it cannot prove the member is mutation-free. With `readonly struct` and `readonly` members, these hidden copies are avoided.

### ref struct

A `ref struct` is stack-only — it cannot be boxed or stored on the managed heap. This enables safe, allocation-free wrappers over stack memory.

```csharp
public ref struct SpanPair
{
    public Span<byte> First;
    public Span<byte> Second;
}
```

Key restrictions:

- Cannot be a field of a class or a non-ref struct.
- In C# 13+, can implement interfaces in constrained scenarios (for example, with `allows ref struct`), but still cannot be boxed to interface types.
- Cannot be boxed to `object`, `dynamic`, or interface references.
- In C# 13, can appear in `async` methods/iterators only when usage does not cross `await`/`yield` boundaries.
- Cannot be captured by lambdas/closures.
- `Span<T>` and `ReadOnlySpan<T>` are the most important `ref struct` types in the BCL.

C# 13 relaxes some restrictions: ref structs can now implement interfaces (with an `allows ref struct` anti-constraint) and appear in some generic contexts.

### readonly ref struct

Combines both: stack-only and fully immutable. The canonical example is `ReadOnlySpan<T>`:

```csharp
public readonly ref struct ReadOnlySpan<T>
{
    // ...internal pointer and length...
}

ReadOnlySpan<char> slice = "Hello, World!".AsSpan(0, 5);
```

This is the safest struct form — no heap escape, no mutation.

### partial struct

Same as partial classes - splits a struct definition across multiple files, and the compiler merges all parts into one type:

```csharp
// Measurement.cs
public partial struct Measurement
{
    public double Value { get; set; }
}

// Measurement.Validation.cs
public partial struct Measurement
{
    public bool IsValid() => !double.IsNaN(Value);
}
```

### Modifier Compatibility

| Modifier combination | Allowed? |
|---|---|
| `readonly` + `ref` | Yes (`readonly ref struct`) |
| `readonly` + `partial` | Yes |
| `ref` + `partial` | Yes |
| `abstract` | No — structs are implicitly sealed |
| `sealed` | Redundant — already implicit |
| `static` | No |

## Boxing — When a Value Type Lands on the Heap

The whole point of a struct (no allocation) is lost the moment it's **boxed**. The implicit triggers are easy to miss:

- Assigning to `object` or `dynamic`: `object o = myStruct;`
- Casting to an interface the struct implements: `IComparable c = myStruct;` (constrained generic calls — `where T : IComparable` — avoid this)
- Adding to a non-generic collection (`ArrayList`) or a `params object[]`
- String interpolation / `string.Format` of a struct (the value is boxed to call `object.ToString()` unless the type implements `ISpanFormattable`)
- Calling a non-overridden `ToString()`/`Equals()`/`GetHashCode()` inherited from `object`

## Memory Layout

A struct's size is the sum of its fields plus **padding** the runtime inserts for alignment (a `bool` + `long` field often occupies 16 bytes, not 9). That alignment cost is part of *why* the "keep structs ≤16 bytes" heuristic exists — beyond that, copy cost outweighs the allocation you saved. `[StructLayout(LayoutKind.Sequential)]` (or `Explicit` with `[FieldOffset]`) controls layout for interop/SIMD; `[StructLayout(LayoutKind.Auto)]` lets the runtime reorder fields to minimize padding.

## Modern Struct Features

- **Primary constructors (C# 12)** work on structs too: `public readonly struct Point(int x, int y) { public int X => x; }`.
- **`ref` fields and `scoped` (C# 11)** let a `ref struct` *store* a reference (this is how `Span<T>` holds a pointer into memory), with `scoped` constraining how long that reference may escape — the compiler enforces it can't outlive the data it points to.

## Pitfalls

1. **Mutable structs** — Assigning a struct to a new variable or returning it from a property copies the value. Mutating the copy does not affect the original, which leads to silent bugs:

```csharp
struct MutablePoint { public int X; public int Y; }

var list = new List<MutablePoint> { new() { X = 1, Y = 2 } };
// list[0].X = 10;  // Compile error — indexer returns a copy
```

Mark structs `readonly` to make this class of bug impossible.

2. **Large struct copies** — A struct bigger than about 16 bytes incurs meaningful copy cost every time it is passed by value, returned, or assigned. Use `in`, `ref`, or `ref readonly` to pass large structs without copying.

3. **Default value-type equality can be expensive** — If you do not override `Equals` and `GetHashCode`, comparison is field-by-field and may be reflection-based depending on runtime/type shape. Always implement `IEquatable<T>` on public structs used in hot paths or hash-based collections.

4. **Boxing in generic code** — Calling through `object`/interface references boxes structs and negates allocation benefits. Prefer constrained generic calls (`where T : IFoo` or `where T : struct, IFoo`) and invoke members on `T` directly instead of casting to `IFoo`.

5. **Default constructor gotcha** — Before C# 10, structs could not have an explicit parameterless constructor. Even in C# 10+, `default(T)` and array allocation still zero-initialize without calling the constructor, so the explicit parameterless constructor is not guaranteed to run in every path.

## Tradeoffs

- `struct` vs `class`: structs reduce heap allocations for small value-like data, but large structs increase copy cost and API complexity (`in`/`ref` usage everywhere).
- `readonly struct` vs mutable struct: readonly structs prevent copy-mutation bugs and defensive-copy penalties, while mutable structs are easier to misuse and should be reserved for very specific low-level scenarios.
- by-value vs `in`/`ref`: by-value is simpler and often fastest for small structs; `in`/`ref` helps large structs but can make call sites noisier and harder to maintain.

## Questions

> [!QUESTION]- For a high-throughput service processing 100k messages per second (Id, Timestamp, Status), would class or struct be the better model, and why?
> A `readonly struct` (or `readonly record struct`) is the best fit:
> - Total payload is roughly 28 bytes before alignment (Guid 16 + DateTime 8 + enum ~4), so it is above the strict 16-byte heuristic and should be benchmarked in your workload.
> - Value semantics avoid a separate object allocation per message when values stay inline and are not boxed/captured, reducing GC pressure at 100k/s.
> - `readonly` prevents accidental mutation.
> - If the message grows or needs richer behavior/reference sharing, a class can become the better tradeoff.

> [!QUESTION]- Why does mutating a struct returned from a property or indexer not compile (or silently do nothing)?
> - Property/indexer access usually returns a value copy, not a reference to the original storage.
> - Mutating that copy would be discarded immediately, so the compiler blocks common forms (for example CS1612 scenarios).
> - Even when a pattern compiles, mutations can affect only the temporary copy, not the original struct instance.
> - Mitigate with `readonly struct` for safer value semantics, or expose `ref`/`ref readonly` returns when true by-reference behavior is required.

> [!QUESTION]- Why does `ValueType.Equals` perform so poorly on structs with reference-type fields? What should you do about it?
> - Default value-type equality is field-by-field and can be expensive in hot paths.
> - Depending on type shape/runtime path, equality can include reflection-like overhead and extra indirection.
> - Using such structs as keys in dictionaries/sets amplifies the cost because equality and hashing are called frequently.
> - Implement `IEquatable<T>` and override `Equals`/`GetHashCode` to define stable semantics and avoid hidden performance costs.

## Links

- [Structure types - C# reference](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/struct) - Core language rules and constraints.
- [ref struct types - C# reference](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/ref-struct) - Stack-only semantics and restrictions.
- [Choose between class and struct - Microsoft Learn](https://learn.microsoft.com/dotnet/standard/design-guidelines/choosing-between-class-and-struct) - Official design heuristics and tradeoffs.
- [Choosing Between Struct and Class (Akritidis)](https://giannisakritidis.com/blog/Struct-VS-Class/) - Practical guidance with real-world tradeoff examples.
