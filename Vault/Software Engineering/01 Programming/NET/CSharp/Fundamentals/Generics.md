---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Creation
dg-publish: true
---
# Intro

Generics let you write type-safe, reusable code without duplicating logic per type. Instead of accepting `object` and casting later, you keep strong compile-time guarantees and better IDE support. In .NET, generics also matter for performance because collections like `List<int>` avoid boxing that older non-generic APIs caused.

## Mental Model

- `T` is a placeholder for a type chosen by the caller.
- `List<T>` is an open generic type definition; `List<int>` is a closed constructed type.
- Constraints (`where T : ...`) are capability contracts that unlock members safely.
- Generic code is checked at compile time, then JIT-optimized per runtime type usage.

## Deeper Explanation

Generic method with a constraint:

```csharp
public static T Max<T>(T left, T right) where T : IComparable<T>
{
    return left.CompareTo(right) >= 0 ? left : right;
}

var best = Max(10, 42);          // int
var latest = Max(DateTime.UtcNow.AddDays(-1), DateTime.UtcNow);
```

Generic class with multiple constraints:

```csharp
public sealed class CacheEntry<TValue>
    where TValue : class, new()
{
    public TValue Value { get; } = new();
}

var entry = new CacheEntry<StringBuilder>();
```

## Use Cases

- **Collections**: `List<T>`, `Dictionary<TKey, TValue>`, and `HashSet<T>` provide reusable containers with strong typing.
- **Reusable algorithms**: sorting, filtering, and comparison helpers can work across many types with constraints.
- **Repository/service abstractions**: patterns like `IRepository<TEntity>` avoid repeating CRUD interfaces per entity.
- **Result wrappers**: types like `Result<T>` or `ApiResponse<T>` let you model success payloads consistently.

## Constraints

Constraints define what operations are legal on `T` and protect APIs from invalid type arguments.

- `where T : class` - `T` must be a reference type.
- `where T : struct` - `T` must be a non-nullable value type.
- `where T : notnull` - `T` cannot be nullable (`string?`, `int?`, etc.).
- `where T : unmanaged` - `T` must be blittable/unmanaged (useful for low-level memory scenarios).
- `where T : new()` - `T` must have a public parameterless constructor.
- `where T : BaseType` - `T` must inherit from a specific base type.
- `where T : ISomeInterface` - `T` must implement a specific interface.

Example with combined constraints:

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

> [!QUESTION]- Why is `List<T>` generally preferred over old non-generic collections like `ArrayList`?
> `List<T>` gives compile-time type safety, avoids most casts, and prevents boxing for value types like `int`, which usually improves performance and correctness.

> [!QUESTION]- You wrote `T Parse<T>(string input)` and need to call `TryParse` inside. What should you change?
> Add an abstraction or constraint-based strategy because unconstrained `T` has no guaranteed static parse API. In modern C#, static-abstract interface members can model this cleanly; otherwise pass a parser delegate.

> [!QUESTION]- When can adding a `where T : class` constraint be a design smell?
> When it is used only to make null handling easy. If the API should support value types too, this constraint blocks valid use cases and reduces reusability.

## Links

- [Generics in C#](https://learn.microsoft.com/dotnet/csharp/programming-guide/generics/)
- [Constraints on type parameters](https://learn.microsoft.com/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters)
- [Covariance and contravariance in generics](https://learn.microsoft.com/dotnet/standard/generics/covariance-and-contravariance)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp|CSharp]]
>
> **Topics**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Types|Types]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Exception Handling|Exception Handling]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Foreach|Foreach]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Methods|Methods]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Namespaces|Namespaces]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Reflection|Reflection]]
<!-- whats-next:end -->
