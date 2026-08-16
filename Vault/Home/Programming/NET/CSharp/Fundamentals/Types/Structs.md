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

A struct is a C# value type. Assignment copies its fields as a new value, including any references those fields contain. That behavior fits small, immutable data representing one logical value, such as a coordinate or money amount.

Storage depends on context. A struct may be a local, live inline inside a heap object or array, or be copied into a box. Structs derive from `System.ValueType`, cannot inherit from another class or struct, and may implement interfaces.

# Value-Copy Semantics

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

The example's “bitwise copy” comment describes the independent value result. The language guarantees value-copy semantics, not a particular machine instruction sequence.

A struct cannot declare a finalizer or use class-style abstract and virtual members. Its default value has every field set to that field's default, even when an explicit parameterless constructor would establish a different application invariant.

Use a struct when the type behaves as a single value, copying is cheap, and boxing is uncommon. Immutability matters more than a universal byte limit. The 16-byte guideline is a starting point from framework design guidance, not a runtime cutoff. Measure larger hot-path values in their real APIs.

Equality also deserves an explicit decision. Default `ValueType` equality is correct for many shapes but may be slower than a typed implementation. Public values used heavily in dictionaries or comparisons often benefit from `IEquatable<T>` and a matching `GetHashCode`.

# Struct Modifiers

## Readonly Struct

A readonly struct prevents instance fields from being reassigned after construction. Its instance fields must be readonly, and auto-properties must expose only `get` or `init`. This lets the compiler avoid defensive copies for readonly receivers when the invoked member is known not to mutate the value.

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

Without that guarantee, calling a potentially mutating member through an `in` parameter or readonly field can require a defensive copy. Individual members on a mutable struct can also be marked `readonly` when they do not mutate state.

## Ref Struct

A `ref struct` is restricted from escaping into ordinary managed-heap storage. It cannot be boxed, captured by a closure, or used where its lifetime could outlive referenced data. `Span<T>` relies on these checks to expose contiguous memory without giving managed references an unsafe lifetime.

```csharp
public ref struct SpanPair
{
    public Span<byte> First;
    public Span<byte> Second;
}
```

It cannot be a field of a class or ordinary struct. C# 13 permits interface implementation and broader generic use under ref-safety rules, but converting the value to an interface still requires forbidden boxing. The same release permits local use in async methods and iterators when the value does not cross an `await` or `yield` boundary.

## Readonly Ref Struct

A readonly ref struct combines ref-safety restrictions with an immutable receiver. `ReadOnlySpan<T>` is the standard example:

```csharp
public readonly ref struct ReadOnlySpan<T>
{
    // ...internal pointer and length...
}

ReadOnlySpan<char> slice = "Hello, World!".AsSpan(0, 5);
```

The declaration blocks field reassignment and ordinary heap escape. It does not make memory reached through every contained reference deeply immutable.

## Partial Struct

A partial struct spreads one type declaration across files. The compiler combines the parts into a single value type.

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

## Modifier Compatibility

| Modifier combination | Allowed? |
|---|---|
| `readonly` + `ref` | Yes (`readonly ref struct`) |
| `readonly` + `partial` | Yes |
| `ref` + `partial` | Yes |
| `abstract` | No — structs are implicitly sealed |
| `sealed` | No — structs are implicitly sealed |
| `static` | No |

# Boxing

Boxing copies a value into an object on the managed heap. It appears when a value is converted to `object`, `dynamic`, or an interface value. Non-generic collections and `params object[]` are common accidental boundaries.

Constrained generic calls can invoke interface members without first converting the value to an interface object. Modern interpolated string handlers can also format values without boxing, depending on the overload and formatter. The allocation question belongs to the actual call path, not the presence of interpolation syntax alone.

Calls to members declared on `object` deserve the same care. The JIT can use constrained calls, while some interface or object-typed paths require a box. `EqualityComparer<T>.Default` is usually the right generic equality boundary.

# Memory Layout

A struct's managed size includes field storage and alignment padding. For example, a `bool` followed by a `long` may occupy 16 bytes rather than nine. `[StructLayout(LayoutKind.Sequential)]` preserves field order for layout-sensitive interop, while `Explicit` uses `[FieldOffset]`. Auto layout leaves ordering to the runtime and is unsuitable for unmanaged interop.

Size affects copy cost and cache behavior, but it does not create a fixed class-versus-struct boundary. A 24-byte value passed by reference may outperform a heap-allocated object in one workload and lose in another.

# Modern Struct Features

- **Primary constructors (C# 12)** work on structs: `public readonly struct Point(int x, int y) { public int X => x; }`. Parameters become stored state only when their use requires capture.
- **`ref` fields and `scoped` (C# 11)** let a ref struct store a managed reference while the compiler limits how far that reference can escape.

# Pitfalls

1. **Mutable structs.** Assignment and ordinary property returns copy the value. Mutating a copy does not update the original storage and often fails to compile at obvious property or indexer boundaries:

```csharp
struct MutablePoint { public int X; public int Y; }

var list = new List<MutablePoint> { new() { X = 1, Y = 2 } };
// list[0].X = 10;  // Compile error — indexer returns a copy
```

Readonly values remove most accidental mutation paths. APIs that need in-place updates should expose that choice explicitly through a ref return or replace the whole value.

2. **Large copies.** Copy cost grows with the value and call pattern. `in`, `ref`, or `ref readonly` can avoid a copy, but indirection and defensive copies can erase the benefit. Benchmark before spreading ref semantics through an API.

3. **Default equality on a hot path.** `ValueType.Equals` compares fields and may use slower runtime paths for some type shapes. A typed `IEquatable<T>` implementation gives direct control over semantics and cost.

4. **Boxing behind abstraction.** Converting a struct to `object` or an interface allocates a box. A constrained generic call on `T` can keep the value unboxed.

5. **The zero value bypasses an explicit parameterless constructor.** Since C# 10, a struct may declare that constructor, but `default(T)` and zero-initialized arrays still produce the all-default field state. A struct invariant must tolerate that value.

# Tradeoffs

- **Struct or class:** a struct gives value-copy semantics and can avoid a separate object allocation. A class makes identity sharing cheap and avoids copying a large payload.
- **Readonly or mutable:** readonly is the safe default for value objects. Mutable structs fit narrow low-level APIs where mutation is explicit.
- **By value or by reference:** by-value calls are simplest and often fastest for small values. Ref semantics earn their complexity only when measurement shows copy cost matters.

# References

- [Structure types](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/struct)
