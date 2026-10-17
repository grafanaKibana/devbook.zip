---
topic:
  - Programming
subtopic:
  - NET
summary: "Type-safe, reusable code without duplicating logic per type, including constraints and variance."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "Programming"
qard-topic: "NET/CSharp/Fundamentals/Generics"
flashcard_uid: "3fc98b91"
---

Generics parameterize code by type. `List<T>` can store any `T` while the compiler still checks every read and write. That is a stronger contract than accepting `object` and recovering the real type with casts. For value types, generic collections also avoid the boxing required by older object-based APIs.

- `T` is a placeholder for a type chosen by the caller.
- `List<T>` is an open generic type definition. `List<int>` is a closed constructed type.
- Constraints (`where T : ...`) are capability contracts that unlock members safely.
- The runtime specializes generic code for value-type arguments and can share code between reference-type arguments.

# Use Cases

- Collections preserve the element or key type throughout an API.
- Algorithms can require only the operations they use, such as comparison or numeric operators.
- Generic result and handler types can keep payload types explicit without duplicating infrastructure.

A generic abstraction should still represent one real behavior. `IRepository<TEntity>` is not useful merely because every entity happens to support create, read, update, and delete operations. Different aggregates often need different contracts.

# Constraints

Constraints tell the compiler what operations are valid for `T`. They also document the smallest capability the algorithm expects.

- `where T : class` - `T` must be a reference type.
- `where T : struct` - `T` must be a non-nullable value type.
- `where T : notnull` - nullable analysis warns when a nullable type argument is used.
- `where T : unmanaged` - `T` is a non-nullable unmanaged type whose fields are also unmanaged. This is not identical to every platform's definition of blittable.
- `where T : new()` - `T` must have a public parameterless constructor.
- `where T : BaseType` - `T` must inherit from a specific base type.
- `where T : ISomeInterface` - `T` must implement a specific interface.

# Variance

Variance controls safe assignment between constructed interface or delegate types when their type arguments are related by inheritance.

- Invariance (default): `List<string>` is not assignable to `List<object>`.
- Covariance (`out T`): allows a more derived type where a base type is expected for producer-only APIs (for example, `IEnumerable<string>` to `IEnumerable<object>`).
- Contravariance (`in T`): allows a less derived type where a more derived type is expected for consumer-only APIs (for example, `IComparer<object>` as `IComparer<string>`).
- Variance is supported on interfaces and delegates marked with `in`/`out`, and only for reference-type substitutions.

```csharp
IEnumerable<string> names = new List<string> { "Ada", "Linus" };
IEnumerable<object> objects = names; // covariance

Action<object> printAny = o => Console.WriteLine(o);
Action<string> printString = printAny; // contravariance

List<string> list = new();
// List<object> invalid = list; // does not compile (invariance)
```

# Example

```csharp
public static T CreateAndValidate<T>()
    where T : EntityBase, IValidatable, new()
{
    var value = new T();
    value.Validate();
    return value;
}
```

# Generic Math (.NET 7+)

Generic code once had no static contract for operators such as `+`. Static abstract interface members changed that. `INumber<T>` declares numeric operators and identities, so a `where T : INumber<T>` constraint makes arithmetic available on the type parameter.

```csharp
public static T Sum<T>(ReadOnlySpan<T> values) where T : INumber<T>
{
    T total = T.Zero;
    foreach (var v in values) total += v;   // operators resolved via the interface
    return total;
}
```

The same static-member mechanism supports contracts such as `IParsable<TSelf>`, where parsing belongs to the type rather than an instance.

# Reflection over Generics

An open generic such as `List<>` has unassigned type parameters and cannot be instantiated. Reflection can close it at runtime with `MakeGenericType`. Generic methods use `MakeGenericMethod`.

```csharp
Type closed = typeof(List<>).MakeGenericType(itemType); // e.g. List<Order>
var list = Activator.CreateInstance(closed);
```

`where T : struct, Enum` admits enum value types, while `allows ref struct` tells the compiler that a type argument may be stack-only. Code using that anti-constraint must obey the ref-safety rules for every possible `T`.

# Pitfalls

- An unconstrained `T` exposes only operations valid for every type. The smallest constraint that the algorithm actually needs makes the required operations available without internal casts.
- **Static state belongs to each closed type.** `Cache<int>` and `Cache<string>` receive separate copies of a `static` field declared on `Cache<T>`.
- **Value-type specialization can grow native code.** Separate value-type instantiations can produce separate JIT-compiled bodies. The specialization avoids the boxing that `object`-based storage requires and preserves value semantics, but many large instantiations increase startup and code-size costs.
- `default(T)` is `null` for reference types and zero-initialized data for value types. Either result may look valid in a domain model, so absence should have an explicit contract.
- A concrete base-class constraint couples the abstraction to one hierarchy. A behavioral interface avoids that coupling when inheritance is not itself part of the requirement.

# Tradeoffs

- **Generics versus `object`.** Non-generic collections box value types when storing them as `object`. `List<int>` keeps integers unboxed and removes casts at the read boundary.
- **Generics versus inheritance.** A generic API carries a concrete type argument through compile-time checks. Inheritance allows one base reference to dispatch to different runtime implementations. The choice is about when variation is known, not a blanket performance rule.
- **Specialization versus code sharing.** The CLR normally specializes code for value-type arguments and shares compatible code for reference-type arguments. This balances value-type performance against native code size.

# Questions

<!-- qard-id: 051626ec-488b-484a-affe-9b09e168fb5e -->
> [!qard]- What do generics add to a C# API?
> Generics let one implementation take a type as a parameter. The same code then works with many types, while the compiler still checks the type of every value that goes in or comes out.
> 
> Compared with an API that accepts `object`:
> 
> - **Type safety:** an `object`-based API needs casts on the way out, so a wrong type fails only at runtime. A `List<string>` instead rejects an `int` at compile time and returns strings without casts.
> - **No storage boxing for value types:** an `object`-based collection boxes each `int` it stores, while `List<int>` stores the integers directly. Generic code can still box a value-type `T` through conversions, such as converting it to `object` or to an interface type.
> 
> **Constraints** such as `where T : IComparable<T>` narrow which type arguments are allowed. In return, the generic code may use the members that the constraint guarantees, such as `CompareTo`.
> 
> [Microsoft: generic types and methods](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/generics) · [Microsoft: constraints on type parameters](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters) · [C# specification: boxing conversions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/conversions#1029-boxing-conversions)

<!-- qard-id: 96d2fdb0-3c95-4eb1-91da-258a4574cde2 -->
> [!qard]- Why does `IEnumerable<string>` assign to `IEnumerable<object>`, but `List<string>` does not assign to `List<object>`?
> `IEnumerable<T>` declares its type parameter covariant (`out T`), so the conversion is allowed. `List<T>` is invariant, so it is not.
> 
> - **`IEnumerable<string>` as `IEnumerable<object>`:** the interface only hands `T` values out. Every string read from the sequence is also an object, so reading strings as objects is safe.
> - **`List<string>` as `List<object>`:** `List<T>` also takes `T` values in, for example through `Add`. If the conversion were allowed, code could add an `int` through the `List<object>` reference, and the original `List<string>` would then hold a non-string.
> 
> Variance also has to be declared, and C# allows it only on generic interfaces and delegates. A generic class such as `List<T>` is therefore always invariant, whatever its members do.
> 
> [Microsoft: covariance and contravariance](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance)

<!-- qard-id: 222e6ef2-bb7d-4c83-b731-ffd892537b23 -->
> [!qard]- When should a generic interface type parameter be marked `out` or `in`?
> A type parameter can be marked `out` when the interface only produces `T`, and `in` when it only consumes `T`. When `T` flows both in and out, it stays invariant.
> 
> | Marking | Where `T` may appear | Conversion it enables |
> |---|---|---|
> | `out` (covariant) | Only in output positions, such as method return types | A more derived type argument can stand in for a less derived one: `IEnumerable<string>` converts to `IEnumerable<object>` |
> | `in` (contravariant) | Only in input positions, such as method parameter types | A less derived type argument can stand in for a more derived one: `IComparer<object>` converts to `IComparer<string>` |
> | None (invariant) | In both input and output positions | No conversion, because either direction would allow an unsafe read or write |
> 
> The compiler enforces these positions, so it accepts a variant marking only when the interface's members keep it safe.
> 
> Variance conversions work only when the type arguments are reference types. `IEnumerable<int>` does not convert to `IEnumerable<object>`, because a value-type argument makes the constructed type invariant.
> 
> [Microsoft: covariance and contravariance](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance)

<!-- qard-id: dd86df45-1404-46cf-8c09-84cb046ef4f3 -->
> [!qard]- A generic method uses `default(T)` as a fallback. Why can this be dangerous?
> `default(T)` is not one fixed value. It is `null` when `T` is a reference type, and a zero-initialized value such as `0` or `false` when `T` is a value type. Those values can also be legitimate data, so returning `default(T)` to signal that nothing was found or that something failed makes absence look like a real result.
> 
> For example, a `GetOrDefault<T>` method that returns `default(T)` for a missing key returns `0` when `T` is `int`. A caller then cannot tell a missing entry from a stored `0`.
> 
> When that distinction matters, the API reports absence separately from the value:
> 
> - **`Try` method:** returns `bool` for success and the value through an `out T` parameter.
> - **Result type:** carries the success or failure state together with the value.
> - **Nullable contract:** returns `T?`, with `null` meaning absence. This works only when `null` is never legitimate data and the return type can actually hold `null` for the type argument. For a value type that requires `Nullable<T>`, for example `T?` under a `where T : struct` constraint, whose `HasValue` separates a missing entry from a stored `0`. With an unconstrained `T`, `T?` adds no null state for a value-type argument, so `GetOrDefault<int>` would still return `0`.
> 
> [Microsoft: default keyword](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/default) · [Microsoft: nullable value types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/nullable-value-types)

# References

- [Generics in C#](https://learn.microsoft.com/dotnet/csharp/programming-guide/generics/)
- [Covariance and contravariance in C#](https://ericlippert.com/2007/10/16/covariance-and-contravariance-in-c-part-1/)
