---
publish: true
created: 2026-10-17T18:11:50.084Z
modified: 2026-10-17T18:11:50.084Z
published: 2026-10-17T18:11:50.084Z
topic:
  - Programming
subtopic:
  - NET
summary: Data-centric C# types with generated value equality, ToString, and with-expressions.
level:
  - "4"
priority: Medium
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/CSharp/Fundamentals/Types/Records
flashcard_uid: c03985b0
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
- `Equals(Person)` and `Equals(object)` comparing the runtime type and each instance field, using each field type's own equality.
- `GetHashCode()` combining the hashes of the same components.
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

// Nominal — explicit properties, no Deconstruct unless one is declared by hand
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
var p1 = new Person("Alice", 30);
var p2 = new Person("Alice", 30);
Console.WriteLine(p1 == p2);                // True — value-based equality
Console.WriteLine(ReferenceEquals(p1, p2)); // False — different heap objects

public record Person(string Name, int Age);
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

A record struct fits when value-copy semantics and generated equality match the model. Storage follows the containing context: the value may be a local, live inline inside a heap object or array, or be boxed.

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

A record fits when value equality and data-carrier members are part of the contract. A primary constructor on a plain class or struct makes its parameters available throughout the type body without otherwise turning the type into a record.

# `required` and Validation

- Records combine with **`required`** to force initialization of a nominal property without a positional parameter: `public record User { public required string Email { get; init; } }`.

- Validation can run in a property initializer that reads the positional parameter:

  ```csharp
  public record Email(string Value)
  {
      public string Value { get; } = string.IsNullOrWhiteSpace(Value)
          ? throw new ArgumentException("Email required") : Value;
  }
  ```

- **System.Text.Json** binds JSON to a record's primary constructor by parameter name (`[JsonConstructor]` disambiguates when there are multiple constructors).

# Pitfalls

1. **Mutable record structs.** Positional properties on a record struct use setters. Mutation is easy to lose across value-copy boundaries, so `readonly record struct` is the safer starting point unless mutation is deliberate.

2. **Runtime type participates in record-class equality.** Records from different points in a hierarchy do not compare equal merely because their shared properties match. `EqualityContract` prevents a base-shaped comparison from discarding derived state.

3. **A reference member keeps its own equality semantics.** Two records holding separate `List<string>` instances compare unequal even when the lists contain the same strings, because `List<T>` uses reference equality. Element-wise comparison therefore requires either a collection with the required equality semantics or explicitly implemented record equality.

4. **Shallow `with` copies.** Reference members are copied as references. Mutating a nested object through one record can therefore affect its copy:

```csharp
var a = new Wrapper(new List<int> { 1, 2 });
var b = a with { };
b.Items.Add(3);
Console.WriteLine(a.Items.Count); // 3 — same list instance

public record Wrapper(List<int> Items);
```

5. **Generated formatting is still work.** Record `ToString` calls synthesized `PrintMembers` code. It does not rely on reflection simply because the build is Debug. Formatting can still allocate and traverse members, so hot-path logging should avoid creating the string when the log level is disabled.

# Questions

> [!qard]- What is a C# record, and what does the compiler generate for it?
> A record is a class or struct declared with `record`, whose equality is based on its data rather than its identity. The compiler generates the members that make it behave as a data value:
>
> - **Value equality:** `Equals`, `GetHashCode`, `==` and `!=` treat two records as equal when they have the same runtime type and equal field values, each field compared with its own type's equality. Two separately created `record class` instances with equal data compare equal, unlike two ordinary class instances.
> - **Nondestructive mutation:** `p with { Age = 31 }` copies the record and changes the listed members. The copy is shallow, so referenced objects are shared.
> - **Readable `ToString`:** prints the type name and public members, such as `Person { Name = Alice, Age = 30 }`.
> - **Positional members:** `record Person(string Name, int Age)` also generates a primary constructor, a public property for each parameter and `Deconstruct`. These properties are init-only for `record class` and `readonly record struct`, but settable for a plain `record struct`.
>
> `record` alone means `record class`, a reference type that can inherit from another record class, while `record struct` is a value type. Records fit DTOs, messages and value objects. Types whose identity matters more than their current data, such as Entity Framework Core entities, fit ordinary classes better.
>
> [Microsoft: records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record)

<!-- qard-id: 40d90777-69d9-4746-901b-68d334cae949 -->

> [!qard]- In `record Wrapper(List<int> Items)`, if `var b = a with { };` and an item is added to `b.Items`, does `a` observe the change, and why?
> Yes. A `with` expression makes a shallow copy: it copies each field of `a` into the new record, and for a reference-type field that copies the reference, not the object it points to. `a.Items` and `b.Items` therefore refer to the same `List<int>`, so an item added through `b.Items` is visible through `a.Items`.
>
> ```csharp
> var a = new Wrapper(new List<int> { 1, 2 });
> var b = a with { };
> b.Items.Add(3);
> Console.WriteLine(a.Items.Count); // 3
> ```
>
> An independent copy needs its own list, for example `a with { Items = new List<int>(a.Items) }`.
>
> [Microsoft: records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record)

<!-- qard-id: 003b8f0c-ee5e-4a60-ac02-067b2fcef925 -->

> [!qard]- Given `record Wrapper(List<int> Items)` and `var b = a with { };`, are `a` and `b` equal before and after an item is added to `b.Items`? Why?
> They are equal both before and after the item is added. Generated record equality compares the runtime type and each field using that field's own equality, and `List<int>` compares by reference. Because `with` copied the reference, `a.Items` and `b.Items` refer to the same list. Adding an item changes that list in place without replacing it. The comparison therefore sees the same reference both times and never looks at the list's contents.
>
> The converse follows from the same rule: two `Wrapper` instances holding separate lists with identical items compare unequal.
>
> [Microsoft: records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record)

<!-- qard-id: 13eb1fca-847d-4f86-8bf6-c4720c859178 -->

> [!qard]- How can a record compare a collection member by its elements instead of by reference?
> There are two ways: override the record's equality so it compares the collection's elements, or store the elements in a type whose own `Equals` compares elements. Generated record equality compares each field with that field type's equality, and `List<T>` compares references, so the default never looks at the elements.
>
> Overriding equality in the record replaces the generated `Equals(T?)` and keeps `GetHashCode` consistent with it:
>
> ```csharp
> public sealed record Basket(string Owner, List<string> Items)
> {
>     public bool Equals(Basket? other) =>
>         other is not null
>         && Owner == other.Owner
>         && Items.SequenceEqual(other.Items); // element-wise and order-sensitive
>
>     public override int GetHashCode()
>     {
>         var hash = new HashCode();
>         hash.Add(Owner);
>         foreach (var item in Items) hash.Add(item);
>         return hash.ToHashCode();
>     }
> }
> ```
>
> The generated `==` and `!=` call this `Equals`, so they also compare elements. `GetHashCode` hashes the same components that `Equals` compares, so records that compare equal produce equal hash codes, as hash-based collections require.
>
> Trade-offs:
>
> - **Cost:** `SequenceEqual` compares elements pairwise in order and stops at the first mismatch, so a comparison examines up to all n items, O(n), instead of comparing one reference. The `GetHashCode` shown always visits every item, so it is O(n).
> - **Mutation:** this equality and hash read the list's current contents. If the list changes while the record is stored in a `HashSet<T>` or used as a dictionary key, the record's current hash can stop matching the hash the collection recorded, and its equality can change, so lookups become unreliable. A different hash and a failed lookup are both possible but not guaranteed, because different contents can produce the same hash code. This equality therefore fits collections that are not changed while the record serves as a key.
> - **Immutability alone is not enough:** an immutable collection prevents such changes, but its type's own `Equals` still decides whether elements are compared.
>
> [Microsoft: records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) · [Microsoft: define value equality](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/statements-expressions-operators/how-to-define-value-equality-for-a-type) · [Microsoft: Object.GetHashCode](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode?view=net-10.0) · [Microsoft: Dictionary\<TKey,TValue>](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2?view=net-10.0) · [.NET runtime: SequenceEqual source](https://github.com/dotnet/dotnet/blob/b0f34d51fccc69fd334253924abd8d6853fad7aa/src/runtime/src/libraries/System.Linq/src/System/Linq/SequenceEqual.cs)

<!-- qard-id: 6ceafb8f-9a7c-4ebf-8ae5-7739e4e828aa -->

> [!qard]- When is `record class` a better choice than `readonly record struct`?
> A `record class` is the better choice when the value is large, needs inheritance, uses `null` as an ordinary 'no value' state, or is frequently handled as `object` or an interface. A `readonly record struct` fits small immutable values where avoiding a separate heap object matters more than those features. Both generate value equality and support `with`, so equality alone does not decide.
>
> | Aspect | `record class` | `readonly record struct` |
> |---|---|---|
> | Assignment and passing | Copies a reference, so the cost is the same however many fields the record has. | Copies every field, which is cheap for a few small fields and grows with the size of the value. |
> | Storage | Each instance is a separate heap object that the garbage collector must track. | Stored inline in its variable, field or array element. Converting it to `object` or an interface boxes it into a heap copy. |
> | Absence | A variable of the type can be `null`. | Needs `Nullable<T>` (`T?`) to represent a missing value. |
> | Inheritance | Can derive from another record class, and equality accounts for the runtime type. | Cannot take part in inheritance: it neither derives from a record nor can be derived from. |
>
> When inheritance or `null` as absence decides the choice, no measurement is needed. When the justification rests on performance, the size at which copying outweighs allocation depends on the workload, so allocation and copy costs drive the decision only when measurement shows they matter.
>
> [Microsoft: records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) · [Microsoft: value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types) · [Microsoft: boxing](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing)

<!-- qard-id: 3a52f8c2-f1a4-4c9e-960f-6461e184a661 -->

> [!qard]- If record equality is customized, why must `GetHashCode` stay consistent with it?
> Hash-based collections such as `Dictionary<TKey,TValue>` and `HashSet<T>` use `GetHashCode` to decide where to look, and then call `Equals` only on entries with a matching hash code. Objects that are equal must therefore return the same hash code. Otherwise a lookup never reaches `Equals` for the matching entry.
>
> For example, suppose a custom `Equals` ignores an `UpdatedAt` property, but the generated `GetHashCode` still includes every field:
>
> 1. Record `a` is added to a `HashSet` under a hash code that includes `a.UpdatedAt`.
> 2. Record `b` differs only in `UpdatedAt`, so `a.Equals(b)` is `true`, but `b`'s hash code is computed from a different `UpdatedAt`.
> 3. A lookup for `b` searches by `b`'s hash code and never compares it with `a`. `Contains(b)` returns `false`, and `Add(b)` stores a second entry equal to the first, unless the two hash codes happen to collide.
>
> `GetHashCode` therefore must not depend on anything that can differ between two equal records, such as a property that `Equals` ignores. Hashing exactly the components that `Equals` compares is the usual choice. A coarser hash over a subset of them is also valid, because equal records agree on that subset; it only causes more collisions. The reverse is not required: unequal objects may share a hash code, which only costs extra `Equals` calls. For records, the compiler reports CS8851 when a record defines its own `Equals` but not `GetHashCode`.
>
> [Microsoft: Object.GetHashCode](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode?view=net-10.0) · [Microsoft: record declaration errors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/record-declaration-errors) · [Microsoft: define value equality](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/statements-expressions-operators/how-to-define-value-equality-for-a-type)

<!-- qard-id: 7c90c152-1919-4c74-84a3-c9cb621d3255 -->

> [!qard]- Can a record struct be used safely as a `Dictionary` key, and what can make it unsafe?
> Yes, as long as the equality and hash code the dictionary actually uses cannot change while the key is stored. That is either the key type's own equality or the `IEqualityComparer<TKey>` supplied to the dictionary. A dictionary stores its own copy of a struct key, so later assignments to the original variable do not affect the stored key. The risk comes from referenced objects: copying a struct copies references, not the objects they point to. Suppose the effective equality or a supplied comparer observes a referenced object's mutable state. Changing that object can make the key's current hash differ from the hash the dictionary recorded and can change its equality. The dictionary does not notice, so lookups for the entry can fail.
>
> ```csharp
> var tag = new Tag { Name = "a" };
> var map = new Dictionary<Key, string> { [new Key(1, tag)] = "x" };
>
> tag.Name = "b";                                       // changes state inside the stored key
> map.ContainsKey(new Key(1, tag));                    // false unless the "a" and "b" key hashes collide
> map.ContainsKey(new Key(1, new Tag { Name = "a" })); // false: Equals now sees "b"
>
> public record Tag { public string Name { get; set; } = ""; }
> public readonly record struct Key(int Id, Tag Label);
> ```
>
> `readonly` prevents reassigning the struct's own fields but does not freeze the objects they reference. A reference member compared by reference, such as a `List<T>` under the default comparer, stays stable when its contents change, because its identity does not. That holds only while the effective comparer also compares it by reference. A supplied comparer that compares the list's elements makes the key depend on mutable state again. A record struct key is therefore safe when every component that the effective equality and hash observe is immutable or compared by reference.
>
> [Microsoft: records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) · [Microsoft: value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types) · [Microsoft: Dictionary\<TKey,TValue>](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2?view=net-10.0) · [Microsoft: Object.GetHashCode](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode?view=net-10.0)

# References

- [Records](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record)
