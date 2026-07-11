---
publish: true
created: 2026-07-11T21:45:14.092Z
modified: 2026-07-11T21:45:14.094Z
published: 2026-07-11T21:45:14.094Z
topic:
  - Programming
subtopic:
  - NET
summary: Type-safe, reusable code without duplicating logic per type, including constraints and variance.
level:
  - "4"
priority: Medium
status: Ready to Repeat
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

## Variance

Variance controls assignment compatibility between constructed generic types.

- Invariance (default): `List<string>` is not assignable to `List<object>`.
- Covariance (`out T`): lets you use a more derived type where a base type is expected for producer-only APIs (for example, `IEnumerable<string>` to `IEnumerable<object>`).
- Contravariance (`in T`): lets you use a less derived type where a more derived type is expected for consumer-only APIs (for example, `IComparer<object>` as `IComparer<string>`).
- Variance is supported on interfaces and delegates marked with `in`/`out`, and only for reference-type substitutions.

```csharp
IEnumerable<string> names = new List<string> { "Ada", "Linus" };
IEnumerable<object> objects = names; // covariance

Action<object> printAny = o => Console.WriteLine(o);
Action<string> printString = printAny; // contravariance

List<string> list = new();
// List<object> invalid = list; // does not compile (invariance)
```

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

## Generic Math (.NET 7+)

For years you couldn't write a generic `Sum<T>` because `T` had no way to express "supports `+`." **Static abstract interface members** fixed that: interfaces like `INumber<T>` declare static operators, so the constraint `where T : INumber<T>` (the "curiously recurring" self-referencing pattern) unlocks arithmetic on the type parameter.

```csharp
public static T Sum<T>(ReadOnlySpan<T> values) where T : INumber<T>
{
    T total = T.Zero;
    foreach (var v in values) total += v;   // operators resolved via the interface
    return total;
}
```

This is also the mechanism behind `IParsable<T>`, `ISpanFormattable`, and other "static contract" interfaces.

## Reflection over Generics

An _open_ generic (`List<>`) can't be instantiated until its type arguments are supplied at runtime via `MakeGenericType` (and `MakeGenericMethod` for methods):

```csharp
Type closed = typeof(List<>).MakeGenericType(itemType); // e.g. List<Order>
var list = Activator.CreateInstance(closed);
```

Newer constraints worth knowing: `where T : struct, Enum` (enum-only generics), `where T : unmanaged`, and **`allows ref struct`** (C# 13) which lets `Span<T>` flow through generic code.

## Pitfalls

- Unconstrained `T` blocks member/operator usage because the compiler cannot prove capabilities, which pushes unsafe casts and weakens API clarity; add the smallest constraint set (`where T : IFoo`, `where T : struct`, etc.) that encodes what the algorithm really needs.
- **Static members are per-closed-type.** A `static` field in `Cache<T>` is _not_ shared across `Cache<int>` and `Cache<string>` — each closed type gets its own copy of the static state. Handy for per-type caches, but a classic surprise if you expected one shared counter.
- **Value-type specialization bloats code.** The JIT emits a separate native body per value-type argument (`List<int>`, `List<double>`, `List<MyStruct>`…). Great for speed, but a generic-heavy library instantiated over many value types grows the code/JIT footprint — a real cost on memory-constrained or fast-startup targets.
- `default(T)` can hide correctness bugs because reference and nullable types become `null` while value types become zeroed data, which may be interpreted as valid business values; model absence explicitly (for example, `Try` pattern, `Option`, or nullable annotations) and validate before use.
- Over-constraining (`where T : class, SomeConcreteType`) couples generic APIs to one hierarchy, which prevents reuse and forces duplicate implementations later; prefer interface-based constraints that describe behavior instead of concrete inheritance chains.

## Tradeoffs

- **Generics vs `object` (boxing)**: Non-generic collections (`ArrayList`, `Hashtable`) store value types as `object`, boxing them on every add and unboxing on every read. `List<int>` avoids boxing entirely — the JIT generates a specialized implementation per value type. The performance difference is measurable in allocation-heavy loops on value types like `int`, `Guid`, or `DateTime`.
- **Generics vs inheritance for polymorphism**: Generics express static (compile-time) polymorphism — the type argument is resolved at JIT time. Inheritance expresses dynamic (runtime) polymorphism via virtual dispatch. Use generics when the concrete type is always known at the call site (algorithm or container); use inheritance when the concrete type is determined at runtime (strategy, plugin, handler).
- **CLR generic specialization**: The CLR generates separate JIT-compiled bodies for each value-type argument (`List<int>`, `List<double>` each get their own code) but shares one compiled body for all reference-type arguments (`List<string>` and `List<object>` share JIT output). This means value-type generics are as fast as hand-typed code, while reference-type generics share an efficient single body with a small type-pointer indirection.

## Questions

> [!QUESTION]- Why does `IEnumerable<string>` assign to `IEnumerable<object>`, but `List<string>` does not assign to `List<object>`?
> `IEnumerable<out T>` is covariant, so it is safe to upcast because it only produces `T` values.
> `List<T>` is invariant because it both reads and writes `T`; if `List<string>` were assignable to `List<object>`, code could add a non-string object and break type safety.
> In practice, expose covariant interfaces (`IEnumerable<T>`, `IReadOnlyList<T>`) at API boundaries and keep mutable concrete collections internal.

> [!QUESTION]- When should you mark a generic interface type parameter as `out` or `in`?
> Use `out` when the type parameter is output-only (returned values), and `in` when it is input-only (method arguments).
> If a parameter must be both consumed and produced, keep it invariant because variance would allow unsafe assignments.
> This design choice improves API flexibility without sacrificing compile-time safety.

> [!QUESTION]- A generic method uses `default(T)` as a fallback value. Why can this be dangerous in production code?
> `default(T)` can silently map to meaningful domain values (`0`, `DateTime.MinValue`, `null`), so failures look like valid data instead of explicit errors.
> Repeated fallback usage can spread bad state across caches, persistence, or downstream services before detection.
> Prefer explicit failure paths (`TryXxx`, exceptions, discriminated result types) and validate invariants at boundaries.

## Links

- [Generics in C#](https://learn.microsoft.com/dotnet/csharp/programming-guide/generics/) — official guide covering generic classes, methods, interfaces, and delegates with examples.
- [Constraints on type parameters](https://learn.microsoft.com/dotnet/csharp/programming-guide/generics/constraints-on-type-parameters) — full list of constraint keywords and their semantics.
- [Covariance and contravariance in generics](https://learn.microsoft.com/dotnet/standard/generics/covariance-and-contravariance) — Microsoft reference on `in`/`out` variance with interface and delegate examples.
- [Covariance and Contravariance in C# (Eric Lippert)](https://ericlippert.com/2007/10/16/covariance-and-contravariance-in-c-part-1/) — 10-part series by a former C# compiler team member; the definitive practitioner explanation of variance semantics.
