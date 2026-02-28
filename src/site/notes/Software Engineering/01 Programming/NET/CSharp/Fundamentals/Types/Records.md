---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/fundamentals/types/records/","noteIcon":"3"}
---

# Intro

Records are C# types (introduced in C# 9 for classes, C# 10 for structs) designed for data-centric models. The compiler generates value-based equality (`Equals`, `GetHashCode`, `==`, `!=`), a human-readable `ToString`, deconstruction, and `with`-expression support. Records eliminate the boilerplate of writing equality and formatting for DTOs, events, messages, and other types whose identity is defined by their content rather than their reference.

## Deeper Explanation

### What the Compiler Generates

For a positional record:

```csharp
public record Person(string Name, int Age);
```

The compiler produces:

- A primary constructor with `Name` and `Age` parameters.
- `init`-only properties `Name` and `Age` (for `record class`; `get`/`set` for `record struct`).
- `Equals(Person)` and `Equals(object)` comparing all properties by value.
- `GetHashCode()` combining all property hashes.
- `operator ==` and `operator !=` delegating to `Equals`.
- `ToString()` returning `Person { Name = Alice, Age = 30 }`.
- `Deconstruct(out string name, out int age)`.
- A protected copy constructor and `<Clone>$` method powering `with`-expressions.
- A virtual `EqualityContract` property (for record classes) returning `typeof(T)`.

You can override any of these. Adding extra properties or methods is free — the generated members incorporate them.

### Positional vs Nominal Syntax

```csharp
// Positional — primary constructor, auto-generated properties and Deconstruct
public record Order(int Id, string Customer, decimal Total);

// Nominal — explicit properties, no Deconstruct unless you write one
public record Order
{
    public int Id { get; init; }
    public string Customer { get; init; } = string.Empty;
    public decimal Total { get; init; }
}
```

Both get the same equality, `ToString`, and `with` support. Use positional for simple data carriers; nominal when you need validation, computed properties, or custom accessors.

### with-expressions

Non-destructive mutation — creates a new instance with selected properties changed:

```csharp
var p1 = new Person("Alice", 30);
var p2 = p1 with { Age = 31 };

Console.WriteLine(p1); // Person { Name = Alice, Age = 30 }
Console.WriteLine(p2); // Person { Name = Alice, Age = 31 }
Console.WriteLine(ReferenceEquals(p1, p2)); // False
```

Under the hood, `with` calls the copy constructor and then sets the changed properties. Works on both `record class` and `record struct`.

## Record Variants

### record class (default)

`record` or `record class` — a reference type allocated on the heap with value-based equality.

```csharp
public record Person(string Name, int Age);

var p1 = new Person("Alice", 30);
var p2 = new Person("Alice", 30);
Console.WriteLine(p1 == p2);                // True — value-based equality
Console.WriteLine(ReferenceEquals(p1, p2)); // False — different heap objects
```

Positional properties are `get`/`init` by default — the type is immutable after construction.

### abstract record

Cannot be instantiated directly. Subrecords must provide implementations for abstract members. Used to define a record hierarchy with a shared base:

```csharp
public abstract record Vehicle(string Make)
{
    public abstract decimal CalculateInsurance();
}

public record Car(string Make, int Doors) : Vehicle(Make)
{
    public override decimal CalculateInsurance() => 500m * Doors;
}

public record Truck(string Make, double PayloadTons) : Vehicle(Make)
{
    public override decimal CalculateInsurance() => 1000m * (decimal)PayloadTons;
}

// Vehicle v = new Vehicle("Toyota");  // Compile error
```

The `EqualityContract` in each derived record ensures that a `Car` and `Truck` with the same `Make` are never considered equal.

### sealed record

Cannot be further derived. Useful for leaf types in a record hierarchy or when you want to lock down the equality contract:

```csharp
public sealed record ApiKey(string Value, DateTime CreatedAt);
// record DerivedKey(...) : ApiKey(...) { }  // Compile error
```

### record struct

Value-type record. Positional properties are `get`/`set` by default (mutable):

```csharp
public record struct Coord(double Lat, double Lon);

var c = new Coord(50.45, 30.52);
c.Lat = 51.50;  // Allowed — record struct positional properties are mutable
```

Use when you want value-based equality and `with`-expressions but need stack allocation and no GC pressure.

### readonly record struct

Immutable value-type record. Positional properties become `get`/`init`:

```csharp
public readonly record struct Color(byte R, byte G, byte B);

var red = new Color(255, 0, 0);
// red.R = 128;  // Compile error — init-only
var pink = red with { R = 255, G = 182, B = 193 };
```

This is the recommended default when you want a small, immutable data carrier with value equality and no heap allocation.

### partial record

Same as partial classes — splits the record definition across files. Commonly used with source generators:

```csharp
// UserDto.cs
public partial record UserDto(string Name, string Email);

// UserDto.Validation.cs — generated or hand-written
public partial record UserDto
{
    public bool IsValid() => !string.IsNullOrWhiteSpace(Name) && Email.Contains('@');
}
```

### Modifier Compatibility

| Modifier combination | record class | record struct |
|---|---|---|
| `abstract` | Yes | No |
| `sealed` | Yes | Implicit |
| `static` | No | No |
| `partial` | Yes | Yes |
| `readonly` | N/A | Yes (`readonly record struct`) |
| `ref` | No | No |

## Record Inheritance

Only `record class` types support inheritance, and only from other `record class` types (not from plain classes or structs):

```csharp
public record Entity(int Id);
public record Person(int Id, string Name) : Entity(Id);
public sealed record Employee(int Id, string Name, string Dept) : Person(Id, Name);
```

Key rules:

- A record can only inherit from another record (not from a class).
- A class cannot inherit from a record.
- Each record in the hierarchy gets its own `EqualityContract` returning its own `typeof(T)`.
- `with`-expressions work across the hierarchy — the copy constructor is virtual.
- Positional parameters from the base must be forwarded in the derived constructor.

## Pitfalls

1. **Record struct mutability by default** — Unlike `record class` (which uses `init` setters), `record struct` positional properties are `get`/`set`. This catches people off guard. Always prefer `readonly record struct` unless you explicitly need mutation.

2. **EqualityContract breaks cross-type equality** — Two records of different runtime types are never equal, even if all shared properties match. This is by design (prevents sliced-equality bugs) but can surprise developers expecting base-type comparison.

3. **Reference-type properties in records** — Value-based equality compares each property with its own `Equals`. If a record has a `List<string>` property, two records with identical-content lists will be considered *not equal* because `List<T>.Equals` uses reference equality. Fix: use immutable collections (`ImmutableArray<T>`) or override `Equals`.

4. **with-expression shallow copies** — `with` calls the copy constructor and sets changed properties. For reference-type properties, it copies the *reference*, not the object. Mutating a nested object through one copy affects the other:

```csharp
public record Wrapper(List<int> Items);
var a = new Wrapper(new List<int> { 1, 2 });
var b = a with { };
b.Items.Add(3);
Console.WriteLine(a.Items.Count); // 3 — same list instance
```

5. **ToString performance** — The generated `ToString` uses reflection in Debug builds and can be slow for logging in hot paths. Override `ToString` if you need high-throughput string representation.

## Questions

> [!QUESTION]- In `record Wrapper(List<int> Items)`, if `var b = a with { };` and an item is added to `b.Items`, does `a` observe the change, and why?
> Yes — `a` sees the change. `with` performs a *shallow copy*: it copies references, not the underlying objects. Both `a.Items` and `b.Items` point to the same `List<int>` instance. Furthermore, `a == b` was `true` before the mutation (same reference in both), but the equality check still uses `List<T>.Equals` which is reference equality — so it remains `true` even after the content changes. To get proper deep value semantics, use immutable collections (`ImmutableList<T>`, `ImmutableArray<T>`) or override `Equals` to compare content.

> [!QUESTION]- When would you choose `record class` over `readonly record struct`?
> Choose `record class` when:
> - The data contains variable-length reference types (strings, collections) — the struct would not avoid heap allocation anyway.
> - The type participates in an inheritance hierarchy (only record classes support inheritance).
> - The data is large (more than ~16 bytes of value-type fields) — copy cost outweighs GC cost.
> - You need `null` semantics (e.g. optional return values without `Nullable<T>`).
>
> Choose `readonly record struct` when:
> - The data is small and all fields are value types — avoids heap allocation entirely.
> - You are on a hot path where GC pressure matters (e.g. tight loops, high-throughput pipelines).
> - No inheritance is needed.

> [!QUESTION]- If `Equals` on a positional record is overridden to ignore one property, does `GetHashCode` still include that property, and what breaks?
> Yes — the compiler-generated `GetHashCode` includes all positional properties regardless of your `Equals` override. This breaks the contract: two objects that are "equal" (by your custom `Equals`) may have different hash codes, causing them to land in different buckets in `Dictionary`, `HashSet`, or any hash-based collection. Lookups silently fail. **Rule**: whenever you override `Equals`, always override `GetHashCode` to match. The compiler emits a warning (CS8851) if you override one without the other, but it is only a warning — not an error.

> [!QUESTION]- Can a record struct be used as a `Dictionary` key safely? What do you need to watch out for?
> Yes, `record struct` works well as a dictionary key because the compiler generates value-based `Equals` and `GetHashCode` by default. Watch out for:
> - **Mutable record structs** — if a key is mutated after insertion, its hash code changes and it becomes unreachable in the dictionary. Use `readonly record struct` for keys.
> - **Reference-type properties** — if the record struct contains a reference-type property (e.g. `string[]`), the generated `GetHashCode` calls that property's `GetHashCode`, which for arrays is reference-based (not content-based). Two structurally identical keys with different array instances will hash differently. Override `GetHashCode` or use immutable value-semantic collections.

## Links

- [Records - C# reference](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record)
- [Create record types - C# tutorial](https://learn.microsoft.com/dotnet/csharp/whats-new/tutorials/records)
- [Positional syntax for property definition](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record#positional-syntax-for-property-definition)
- [Equality in record types - C# spec](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record#equality-in-inheritance-hierarchies)

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
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Strings\|Strings]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Structs\|Structs]]
<!-- whats-next:end -->
