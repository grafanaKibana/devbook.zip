---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/fundamentals/generics/","noteIcon":"1"}
---

# Intro

Generics let you write type-safe, reusable code without duplicating logic per type. Instead of accepting `object` and casting later, you keep strong compile-time guarantees and better IDE support. In .NET, generics also matter for performance because collections like `List<int>` avoid boxing that older non-generic APIs caused.
- `T` is a placeholder for a type chosen by the caller.
- `List<T>` is an open generic type definition; `List<int>` is a closed constructed type.
- Constraints (`where T : ...`) are capability contracts that unlock members safely.
- Generic code is checked at compile time, then JIT-optimized per runtime type usage.


## Use Cases

- Collections: `List<T>`, `Dictionary<TKey, TValue>`, and `HashSet<T>` provide reusable containers with strong typing.
- Reusable algorithms: sorting, filtering, and comparison helpers can work across many types with constraints.
- Repository/service abstractions: patterns like `IRepository<TEntity>` avoid repeating CRUD interfaces per entity.
- Result wrappers: types like `Result<T>` or `ApiResponse<T>` let you model success payloads consistently.

## Constraints

Constraints define what operations are legal on `T` and protect APIs from invalid type arguments.

- `where T : class` - `T` must be a reference type.
- `where T : struct` - `T` must be a non-nullable value type.
- `where T : notnull` - `T` cannot be nullable (`string?`, `int?`, etc.).
- `where T : unmanaged` - `T` must be blittable/unmanaged (useful for low-level memory scenarios).
- `where T : new()` - `T` must have a public parameterless constructor.
- `where T : BaseType` - `T` must inherit from a specific base type.
- `where T : ISomeInterface` - `T` must implement a specific interface.

## Example

```csharp
public static T CreateAndValidate<T>()
    where T : EntityBase, IValidatable, new()
{
    var value = new T();
    value.Validate();
    return value;
}
```

## Pitfalls

- Unconstrained `T` is very limited: you cannot call members or use operators unless you add constraints.
- `default(T)` can be surprising (`null` for refs, zeroed value for structs); be explicit about nullability and defaults.
- Over-constraining (`where T : class, SomeConcreteType`) reduces reuse and can force awkward workarounds.

## Questions

TODO

## Links

- [Generics in C#](https://learn.microsoft.com/dotnet/csharp/programming-guide/generics/)
- [Constraints on type parameters](https://learn.microsoft.com/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters)
- [Covariance and contravariance in generics](https://learn.microsoft.com/dotnet/standard/generics/covariance-and-contravariance)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp\|CSharp]]
>
> **Topics**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Types\|Types]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Exception Handling\|Exception Handling]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Foreach\|Foreach]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Methods\|Methods]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Namespaces\|Namespaces]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Reflection\|Reflection]]
<!-- whats-next:end -->
