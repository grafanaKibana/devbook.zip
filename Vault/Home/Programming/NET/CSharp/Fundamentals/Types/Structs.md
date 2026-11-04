---
topic: [Programming]
subtopic: [NET]
summary: "A value type holding its value inline, so assignment copies it."
level: ["4"]
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "Programming"
qard-topic: "NET/CSharp/Fundamentals/Types/Structs"
created: "2026-02-18T19:18:52.000Z"
modified: "2026-11-03T10:42:12.241Z"
published: "2026-07-08T13:14:17.328Z"
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

Equality also deserves an explicit decision. The inherited `ValueType.Equals(object)` boxes and compares fields: bitwise for some layouts without reference fields or padding, otherwise through reflection. The inherited `GetHashCode` may be computed from only some fields, so distinct values can collide. A plain struct also has no `==` operator; `a == b` does not compile unless the type declares one or converts implicitly to a type that has it. Public values used heavily in dictionaries or comparisons often benefit from `IEquatable<T>`, a matching `GetHashCode`, and `==`/`!=`. A `record struct` synthesizes all of them.

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

A `ref struct` is restricted from escaping into ordinary managed-heap storage. It cannot be boxed, used as an array element, captured by a lambda or local function, or used where its lifetime could outlive referenced data. `Span<T>` relies on these checks to expose contiguous memory without giving managed references an unsafe lifetime.

```csharp
public ref struct SpanPair
{
    public Span<byte> First;
    public Span<byte> Second;
}
```

It cannot be a field of a class or ordinary struct, a static field, or a `record`. C# 13 permits interface implementation and broader generic use under ref-safety rules, but converting the value to an interface still requires forbidden boxing. The same release permits local use in async methods and iterators when the value does not cross an `await` or `yield` boundary.

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

# Copies During Disposal

A `using (existingValue)` statement captures the resource expression once. For a struct, that captures a value copy. Mutating the copy during `Dispose` does not change fields on the original local:

```csharp
var resource = new Resource();
using (resource) { }
// Prints False: disposal changed the captured copy.
Console.WriteLine(resource.IsDisposed);

public struct Resource : IDisposable
{
    public bool IsDisposed { get; private set; }
    public void Dispose() => IsDisposed = true;
}
```

The disposal call for this value-type case need not box. The distinction comes from the captured value, not an obligatory conversion to `IDisposable`. A reference-type resource instead copies a reference to the same object. A `using` declaration that declares the resource has its own resource variable; the copy observation above applies specifically to capturing an existing struct expression.

# User-Defined Conversions

A struct can define conversions between itself and another type. An `implicit` conversion needs no cast at the call site, so it should preserve information and avoid surprising failures. An `explicit` conversion makes the caller acknowledge validation, information loss, or another meaningful change.

```csharp
public readonly struct Percentage
{
    public decimal Value { get; }

    public Percentage(decimal value)
    {
        if (value is < 0 or > 100)
        {
            throw new ArgumentOutOfRangeException(nameof(value));
        }
        Value = value;
    }

    public static implicit operator decimal(Percentage value) => value.Value;
    public static explicit operator Percentage(decimal value) => new(value);
}
```

Converting a valid `Percentage` to `decimal` preserves its number. Converting an arbitrary decimal back can fail validation, so it requires a cast. A conversion can also make a built-in arithmetic operator applicable without declaring that operator on the struct. Exposing that convenience indiscriminately can discard the domain meaning of a unit or validated value.

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

3. **Default equality on a hot path.** Each inherited `ValueType.Equals` call boxes, and a struct with reference fields or padding is compared through reflection. As a dictionary key, the inherited `GetHashCode` can also produce avoidable collisions. A typed `IEquatable<T>` with a matching `GetHashCode` controls both semantics and cost.

4. **Boxing behind abstraction.** Converting a struct to `object` or an interface allocates a box. A constrained generic call on `T` can keep the value unboxed.

5. **The zero value bypasses an explicit parameterless constructor.** Since C# 10, a struct may declare that constructor, but `default(T)` and zero-initialized arrays still produce the all-default field state. A struct invariant must tolerate that value.

# Tradeoffs

- **Struct or class:** a struct gives value-copy semantics and can avoid a separate object allocation. A class makes identity sharing cheap and avoids copying a large payload.
- **Readonly or mutable:** readonly is the safe default for value objects. Mutable structs fit narrow low-level APIs where mutation is explicit.
- **By value or by reference:** by-value calls are simplest and often fastest for small values. Ref semantics earn their complexity only when measurement shows copy cost matters.

# Questions

> [!qard]- Why can `using(existingStruct)` dispose a copy without changing the original struct's disposal flag?
> The using statement evaluates and captures the resource expression once. Capturing a struct copies its fields, and `Dispose` operates on that captured resource value. Its field mutation is not a mutation of the original local. The value-type disposal path does not require boxing to explain this result. Reference-type resources copy a reference to the same object, and using declarations that introduce their own resource variable are a different source shape. [C# specification: using statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/statements#1314-the-using-statement)

> [!qard]- When should a user-defined conversion be explicit instead of implicit?
> An explicit conversion fits when it can lose information, fail validation, or surprise a caller. An implicit conversion participates without a cast in assignment and overload applicability, so it should preserve information and behave predictably. A validated percentage can convert implicitly to its decimal value, but constructing one from an arbitrary decimal should be explicit because the input may be outside the allowed range. [Microsoft: user-defined conversions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/user-defined-conversion-operators)

> [!qard]- Why can calling a member on a struct stored in a `readonly` field or `in` parameter run the member on a copy, and how does `readonly struct` prevent it?
> A struct instance member receives `this` by reference and may assign its fields, while readonly storage must not change. When the member is not declared `readonly`, the compiler does not inspect its body; it copies the value into a hidden temporary and calls the member on that copy. Every call pays for the copy, and any mutation the member performs lands on the temporary and is lost.
>
> ```csharp
> class Holder
> {
>     private readonly Counter counter;
>     public int Tick() => counter.Next(); // always 1: Next increments a copy
> }
>
> struct Counter { private int n; public int Next() => ++n; }
> ```
>
> A `readonly struct` requires every instance field to be readonly, so no member can mutate `this`, and members run directly on the original storage. A mutable struct gets the same effect per member by marking non-mutating members `readonly`; the compiler already treats auto-implemented `get` accessors as readonly.
>
> [Microsoft: structure types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/struct) · [Microsoft: method parameters](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters)

> [!qard]- What restrictions apply to a `ref struct`, and why do they exist?
> A `ref struct` can never be stored on the managed heap. It cannot be boxed or converted to `object`, `ValueType`, or an interface type. It cannot be a field of a class or ordinary struct, a static field, or an array element. A lambda or local function cannot capture it, a variable of the type cannot stay live across an `await` or `yield return`, and the type cannot be declared as a record.
>
> The type can hold a reference into stack memory or into the middle of another object, as `Span<T>` over `stackalloc` memory does. A heap copy could outlive that stack frame or referenced data and leave a dangling reference. Keeping every copy where the compiler's ref-safety analysis tracks its lifetime makes such references safe without runtime checks.
>
> [Microsoft: ref structure types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/ref-struct)

> [!qard]- Why should a struct that is compared or hashed often implement `IEquatable<T>` instead of relying on inherited `ValueType` equality?
> Inherited `ValueType.Equals(object)` takes `object`, so comparing two structs boxes both values. It compares raw bytes only for some layouts, when no field is a reference type and the struct has no padding; otherwise it compares fields through reflection, which is much slower. Inherited `ValueType.GetHashCode` uses one or more fields, not necessarily all of them, so distinct values can share a hash and slow down lookups. By default, `Dictionary<TKey,TValue>` and `HashSet<T>` use `EqualityComparer<T>.Default`, which calls a typed `IEquatable<T>.Equals(T)` without boxing when the struct implements it.
>
> A complete implementation pairs `IEquatable<T>.Equals(T)` with `Equals(object)` and `GetHashCode` overrides over the same fields. A struct has no `==` or `!=` by default, so those operators need explicit declarations. A `record struct` synthesizes all of these members.
>
> [Microsoft: ValueType.Equals](https://learn.microsoft.com/en-us/dotnet/api/system.valuetype.equals) · [Microsoft: ValueType.GetHashCode](https://learn.microsoft.com/en-us/dotnet/api/system.valuetype.gethashcode) · [Microsoft: define value equality](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/statements-expressions-operators/how-to-define-value-equality-for-a-type)

# References

- [Structure types](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/struct)
