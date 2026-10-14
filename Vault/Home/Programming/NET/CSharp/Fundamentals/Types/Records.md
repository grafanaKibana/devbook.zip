---
topic:
  - Programming
subtopic:
  - NET
summary: "Data-centric C# types with generated value equality, ToString, and with-expressions."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "Programming"
qard-topic: "NET/CSharp/Fundamentals/Types/Records"
flashcard_uid: "c03985b0"
---

Records are C# types for models whose contents define equality. The compiler supplies value-based equality and a useful `ToString`. Positional records also get properties and deconstruction. A `with` expression creates a copy with selected members changed. This fits DTOs, messages, and other data that should compare by value instead of object identity.

# Synthesized Members

## What the Compiler Generates

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
- A protected copy constructor and `<Clone>$` method powering `with` expressions.
- A virtual `EqualityContract` property (for record classes) returning `typeof(T)`.

The copy-constructor and clone-method bullet applies only to record classes. Record structs use value copying for `with` expressions and do not synthesize that copy constructor or clone path.

These members can be customized, but equality and hashing must stay consistent. A member added to a record may affect synthesized equality through its backing field, while a computed property without storage does not become a new equality component.

## Positional Vs Nominal Syntax

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

Both forms get the record equality and formatting machinery. Positional syntax is compact and exposes constructor parameters as properties. Nominal syntax makes validation, custom accessors, and construction rules easier to see.

## With-expressions

A `with` expression copies a record and then applies the listed member initializers:

```csharp
var p1 = new Person("Alice", 30);
var p2 = p1 with { Age = 31 };

Console.WriteLine(p1); // Person { Name = Alice, Age = 30 }
Console.WriteLine(p2); // Person { Name = Alice, Age = 31 }
Console.WriteLine(ReferenceEquals(p1, p2)); // False
```

For a record class, the compiler-generated clone operation invokes a copy constructor and preserves the runtime record type. A record struct is copied as a value. Both are shallow copies: referenced objects remain shared unless the copy logic replaces them.

# Record Variants

## Record Class (Default)

`record` and `record class` declare a reference type with generated value equality.

```csharp
public record Person(string Name, int Age);

var p1 = new Person("Alice", 30);
var p2 = new Person("Alice", 30);
Console.WriteLine(p1 == p2);                // True — value-based equality
Console.WriteLine(ReferenceEquals(p1, p2)); // False — different heap objects
```

Positional properties use `get`/`init` by default. That prevents later property assignment, but it does not make referenced objects immutable.

## Abstract Record

An abstract record cannot be instantiated. It defines the shared state and behavior of a record hierarchy while leaving abstract members to derived records.

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

## Sealed Record

A sealed record closes the inheritance hierarchy. This is useful for leaf types whose equality contract should not acquire another derived shape.

```csharp
public sealed record ApiKey(string Value, DateTime CreatedAt);
// record DerivedKey(...) : ApiKey(...) { }  // Compile error
```

## Record Struct

A record struct is a value type. Its positional properties use `get`/`set` by default, so the generated data carrier is mutable unless declared `readonly`.

```csharp
public record struct Coord(double Lat, double Lon);

var c = new Coord(50.45, 30.52);
c.Lat = 51.50;  // Allowed — record struct positional properties are mutable
```

Use it when value-copy semantics and generated equality match the model. Storage follows the containing context: the value may be a local, live inline inside a heap object or array, or be boxed.

## Readonly Record Struct

A readonly record struct prevents mutation through its instance. Positional properties become `get`/`init`.

```csharp
public readonly record struct Color(byte R, byte G, byte B);

var red = new Color(255, 0, 0);
// red.R = 128;  // Compile error — init-only
var pink = red with { R = 255, G = 182, B = 193 };
```

This is a strong default for a small value-like data carrier. It prevents accidental mutation, though referenced fields can still point to mutable heap objects and boxing can still allocate.

## Partial Record

A partial record can span files, which lets generated members and handwritten behavior share one type without sharing one source file.

```csharp
// UserDto.cs
public partial record UserDto(string Name, string Email);

// UserDto.Validation.cs — generated or hand-written
public partial record UserDto
{
    public bool IsValid() => !string.IsNullOrWhiteSpace(Name) && Email.Contains('@');
}
```

## Modifier Compatibility

| Modifier combination | record class | record struct |
|---|---|---|
| `abstract` | Yes | No |
| `sealed` | Yes | Implicit |
| `static` | No | No |
| `partial` | Yes | Yes |
| `readonly` | N/A | Yes (`readonly record struct`) |
| `ref` | No | No |

# Record Inheritance

Only record classes support record inheritance, and their base class must also be a record class (apart from the implicit `object` base):

```csharp
public record Entity(int Id);
public record Person(int Id, string Name) : Entity(Id);
public sealed record Employee(int Id, string Name, string Dept) : Person(Id, Name);
```

Key rules:

- A record can only inherit from another record (not from a class).
- A class cannot inherit from a record.
- Each record in the hierarchy gets its own `EqualityContract` returning its own `typeof(T)`.
- `with`-expressions preserve the runtime record type through the compiler-generated clone operation.
- Positional parameters from the base must be forwarded in the derived constructor.

# Records Vs C# 12 Primary Constructors

C# 12 primary constructors make plain class and struct declarations look similar to positional records, but the generated surface is different:

- `record Person(string Name)` → generates a **public `init` property** `Name`, plus value equality, `ToString`, `Deconstruct`, and `with`.
- `class Person(string name)` → `name` remains in scope throughout the type body. The compiler synthesizes storage only when an instance member uses `name` and capture is required. It does **not** generate a record property, value equality, `ToString`, `Deconstruct`, or `with`.

Use a record when value equality and data-carrier members are part of the contract. A primary constructor on a plain class or struct makes its parameters available throughout the type body without otherwise turning the type into a record.

# `required` and Validation

- Combine records with **`required`** to force a nominal property without a positional parameter: `public record User { public required string Email { get; init; } }`.
- Validate by adding logic in a property initializer:

  ```csharp
  public record Email(string Value)
  {
      public string Value { get; } = string.IsNullOrWhiteSpace(Value)
          ? throw new ArgumentException("Email required") : Value;
  }
  ```

- **System.Text.Json** binds JSON to a record's primary constructor by parameter name (use `[JsonConstructor]` to disambiguate when there are multiple constructors).

# Pitfalls

1. **Mutable record structs.** Positional properties on a record struct use setters. Mutation is easy to lose across value-copy boundaries, so `readonly record struct` is the safer starting point unless mutation is deliberate.

2. **Runtime type participates in record-class equality.** Records from different points in a hierarchy do not compare equal merely because their shared properties match. `EqualityContract` prevents a base-shaped comparison from discarding derived state.

3. **A reference member keeps its own equality semantics.** Two records holding separate `List<string>` instances compare unequal even when the lists contain the same strings, because `List<T>` uses reference equality. Choose a collection with the required equality semantics or implement record equality explicitly.

4. **Shallow `with` copies.** Reference members are copied as references. Mutating a nested object through one record can therefore affect its copy:

```csharp
public record Wrapper(List<int> Items);
var a = new Wrapper(new List<int> { 1, 2 });
var b = a with { };
b.Items.Add(3);
Console.WriteLine(a.Items.Count); // 3 — same list instance
```

5. **Generated formatting is still work.** Record `ToString` calls synthesized `PrintMembers` code. It does not rely on reflection simply because the build is Debug. Formatting can still allocate and traverse members, so hot-path logging should avoid creating the string when the log level is disabled.

# Questions

<!-- qard-id: 40d90777-69d9-4746-901b-68d334cae949 -->
> [!qard]- In `record Wrapper(List<int> Items)`, if `var b = a with { };` and an item is added to `b.Items`, does `a` observe the change, and why?
> Yes. The `with` copy is shallow: `a.Items` and `b.Items` hold the same `List<int>` reference, so adding an item through `b.Items` changes the list visible through `a.Items` too.
<!-- qard-id: 003b8f0c-ee5e-4a60-ac02-067b2fcef925 -->
> [!qard]- Given `record Wrapper(List<int> Items)` and `var b = a with { };`, are `a` and `b` equal before and after an item is added to `b.Items`? Why?
> They remain equal both before and after the mutation. Record equality delegates to the list's equality, which is reference-based; `a.Items` and `b.Items` still refer to the same list after the item is added.
<!-- qard-id: 13eb1fca-847d-4f86-8bf6-c4720c859178 -->
> [!qard]- When a record contains a collection but the model requires structural collection equality, what must it choose or implement?
> A record containing `List<T>` delegates equality to the list, whose equality is reference-based. For structural collection equality, the model must choose a suitable immutable value or implement that equality explicitly.

<!-- qard-id: 6ceafb8f-9a7c-4ebf-8ae5-7739e4e828aa -->
> [!qard]- When is `record class` a better choice than `readonly record struct`?
> Both provide record-style value equality. A `record class` has reference semantics: assignment shares an object reference and it can participate in class inheritance. A `readonly record struct` has value semantics and copies its value on assignment. Choose based on identity, nullability, and copying behavior; measure allocation or copy costs when they drive the decision. [Microsoft: records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) · [Microsoft: value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types)

<!-- qard-id: 3a52f8c2-f1a4-4c9e-960f-6461e184a661 -->
> [!qard]- If record equality is customized, why must `GetHashCode` stay consistent with it?
> Equal objects must produce equal hash codes. If custom `Equals` ignores a property while `GetHashCode` still includes it, equal records can land in different hash buckets and lookups can fail. Keep both methods based on the same equality components; the compiler reports CS8851 for certain record overrides that omit the matching hash override. [Microsoft: record declaration errors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/record-declaration-errors) · [Microsoft: Object.GetHashCode](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode?view=net-10.0)

<!-- qard-id: 7c90c152-1919-4c74-84a3-c9cb621d3255 -->
> [!qard]- Can a record struct be used safely as a `Dictionary` key, and what can make it unsafe?
> Yes, if the equality and hash result for the stored key remain stable. A struct copy does not deep-copy referenced members: if equality or a comparer observes mutable referenced state, changing that state can change the key’s hash while it is stored and make lookup unreliable. `readonly` prevents direct reassignment of struct fields but does not freeze referenced objects. [Microsoft: records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) · [Microsoft: Object.GetHashCode](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode?view=net-10.0)

# References

- [Records](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record)
