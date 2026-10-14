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

- An unconstrained `T` exposes only operations valid for every type. Add the smallest constraint that the algorithm actually needs instead of casting internally.
- **Static state belongs to each closed type.** `Cache<int>` and `Cache<string>` receive separate copies of a `static` field declared on `Cache<T>`.
- **Value-type specialization can grow native code.** Separate value-type instantiations can produce separate JIT-compiled bodies. The specialization removes boxing and preserves value semantics, but many large instantiations increase startup and code-size costs.
- `default(T)` is `null` for reference types and zero-initialized data for value types. Either result may look valid in a domain model, so absence should have an explicit contract.
- A concrete base-class constraint couples the abstraction to one hierarchy. Prefer a behavioral interface when inheritance is not itself part of the requirement.

# Tradeoffs

- **Generics versus `object`.** Non-generic collections box value types when storing them as `object`. `List<int>` keeps integers unboxed and removes casts at the read boundary.
- **Generics versus inheritance.** A generic API carries a concrete type argument through compile-time checks. Inheritance allows one base reference to dispatch to different runtime implementations. The choice is about when variation is known, not a blanket performance rule.
- **Specialization versus code sharing.** The CLR normally specializes code for value-type arguments and shares compatible code for reference-type arguments. This balances value-type performance against native code size.

# Questions

<!-- qard-id: 051626ec-488b-484a-affe-9b09e168fb5e -->
> [!qard]- What do generics add to a C# API?
> A type parameter lets one implementation work with different types while preserving compile-time checking of values passed through that API. Constraints narrow the allowed types and tell the compiler which operations or members are safe to use. [Microsoft: generic types and methods](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/generics) · [Microsoft: constraints on type parameters](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters)

<!-- qard-id: 96d2fdb0-3c95-4eb1-91da-258a4574cde2 -->
> [!qard]- Why does `IEnumerable<string>` assign to `IEnumerable<object>`, but `List<string>` does not assign to `List<object>`?
> `IEnumerable<T>` is covariant because it only produces `T`: a sequence of strings can safely be read as objects. `List<T>` is invariant because it also accepts values; treating `List<string>` as `List<object>` would allow inserting a non-string into the original list. [Microsoft: covariance and contravariance](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance)

<!-- qard-id: 222e6ef2-bb7d-4c83-b731-ffd892537b23 -->
> [!qard]- When should a generic interface type parameter be marked `out` or `in`?
> Use `out` when the interface produces the type and `in` when it consumes it. If it both accepts and returns the type, it must be invariant because either conversion can make a read or write unsafe. C# variance conversions apply only to reference-type substitutions. [Microsoft: covariance and contravariance](https://learn.microsoft.com/en-us/dotnet/standard/generics/covariance-and-contravariance)

<!-- qard-id: dd86df45-1404-46cf-8c09-84cb046ef4f3 -->
> [!qard]- A generic method uses `default(T)` as a fallback. Why can this be dangerous?
> `default(T)` depends on the type: it may be `null` or a zero-initialized value that is valid domain data. If the fallback also represents a successful result, the caller cannot distinguish absence or failure from a real value. Use an explicit `Try` result, nullable contract, or result type when that distinction matters. [Microsoft: default values](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/default)

# References

- [Generics in C#](https://learn.microsoft.com/dotnet/csharp/programming-guide/generics/)
- [Covariance and contravariance in C#](https://ericlippert.com/2007/10/16/covariance-and-contravariance-in-c-part-1/)
