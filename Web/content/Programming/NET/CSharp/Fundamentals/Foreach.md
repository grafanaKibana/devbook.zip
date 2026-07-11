---
publish: true
created: 2026-07-11T18:27:11.021Z
modified: 2026-07-11T18:27:11.021Z
published: 2026-07-11T18:27:11.021Z
topic:
  - Programming
subtopic:
  - NET
summary: The most common way to iterate a sequence in C#, lowered by the compiler into an enumerator-based pattern, plus iterators and yield.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

`foreach` is the most common way to iterate a sequence in C#. It works with types that provide an enumerator (typically via `IEnumerable` / `IEnumerable<T>`), and the compiler rewrites the loop into an enumerator-based pattern.

You can use `foreach` with:

- Any type that implements `System.Collections.IEnumerable` or `System.Collections.Generic.IEnumerable<T>`
- Or any type that satisfies the enumerator pattern:
  - A public parameterless `GetEnumerator()` method (instance or extension)
  - The returned enumerator has a public `Current` property and a public parameterless `MoveNext()` method returning `bool`

Internals (compiler lowering):

- For many built-in collections, the compiler emits code that calls `GetEnumerator()`, then loops while `MoveNext()` returns `true` and reads `Current`.
- For some cases (for example, arrays), the compiler can optimize into an index-based loop.

Under the hood, foreach compiles into:

```csharp
var enumerator = collection.GetEnumerator();
try
{
    while (enumerator.MoveNext())
    {
        var item = enumerator.Current;
        // Use item
    }
}
finally
{
    // If the enumerator is IDisposable, foreach disposes it — even on early break/exception.
    (enumerator as IDisposable)?.Dispose();
}
```

The `finally`/`Dispose` is the part people forget: it's what runs the `finally` block inside an iterator method (and disposes a `DbDataReader`, file enumerator, etc.) when you `break` out of a loop early. Hand-rolling the `while (MoveNext())` form skips this cleanup.

**Struct enumerators and boxing.** `List<T>`, arrays, and `Span<T>` expose a **struct** enumerator, so `foreach` over them allocates nothing (the JIT also elides bounds checks on `Span<T>`/arrays). But if you access the collection through `IEnumerable<T>`, `GetEnumerator()` returns the enumerator **boxed** to the interface — reintroducing the allocation. Iterate the concrete type on hot paths.

## Iterators and yield

`yield return` and `yield break` let you write iterator methods: methods that produce a sequence lazily, one element at a time.

An iterator method returns `IEnumerable<T>` / `IEnumerable` (or in async scenarios `IAsyncEnumerable<T>`), but it doesn't execute immediately:

- Calling the method creates an iterator object.
- Iteration starts when the consumer begins enumerating (often via `foreach`).
- Each `yield return` produces the next element and suspends execution until the next element is requested.
- `yield break` ends the sequence early.

Example:

```csharp
public static IEnumerable<int> CountNumbers(int start, int end)
{
    for (int i = start; i <= end; i++)
    {
        yield return i;
    }
}

foreach (var number in CountNumbers(1, 5))
{
    Console.WriteLine(number);
}
```

Two iterator gotchas:

- **Deferred execution moves exceptions.** Because the body doesn't run until enumeration starts, an argument check inside an iterator method throws _when the caller starts iterating_, not at the call site. For eager validation, split a public wrapper (validate, then return) from a private iterator (`yield`).
- **`yield` can't live inside a `try` with a `catch`** (only `try`/`finally` is allowed), and not inside a `lock`/`unsafe` block. If you need catch semantics around yielded work, wrap the consumption, not the production.

## Pitfalls

**Modifying the collection during iteration**: Mutating a `List<T>` or `Dictionary<TKey,TValue>` inside a `foreach` over it throws `InvalidOperationException`. The enumerator tracks an internal version counter and detects the change. Fix by iterating a snapshot (`collection.ToList()`) or collecting mutations in a separate list and applying them after the loop.

**Closure variable capture**: Lambdas created inside `foreach` capture the loop variable by reference unless you shadow it into a local. Before C# 5, all lambdas in a `foreach` could close over the same `item` variable and see only the last value. Best practice: always copy to a local inside the lambda body if lifetimes extend beyond the iteration: `var current = item; tasks.Add(() => Process(current));`.

## Tradeoffs

- **`foreach` vs `for`**: `foreach` is idiomatic and works on any enumerable. `for` is faster on arrays and `List<T>` because the JIT can eliminate bounds checks when iterating from 0 to `Count`. Use `for` in tight inner loops over known-length collections; `foreach` everywhere else.
- **`foreach` vs LINQ**: LINQ chains are composable and readable but allocate per-operator. `foreach` over the source directly allocates less. Use LINQ for readability on non-hot paths; `foreach` (or `Span<T>`) for hot paths where allocation matters.
- **`foreach` vs `Span<T>` iteration**: for CPU-bound loops over memory you own, iterating a `Span<T>` or `ReadOnlySpan<T>` eliminates enumerator overhead and enables bounds-check elimination. Typical microbenchmark improvement is 20–30% on large arrays.

## Questions

> [!QUESTION]- What types can you use in `foreach`?
> Any type that implements `IEnumerable` / `IEnumerable<T>`, or any type that provides the enumerator pattern (`GetEnumerator()` + `Current` + `MoveNext()`).

> [!QUESTION]- How is `foreach` implemented under the hood?
> The compiler lowers it to enumerator code: call `GetEnumerator()`, loop `MoveNext()`, read `Current`.

> [!QUESTION]- What is `yield` and how does it work?
> It creates an iterator: each `yield return` produces a value and pauses the method; the method resumes on the next iteration request.

> [!QUESTION]- Why and when should you use `yield return` instead of returning a materialized collection like `List<T>`?
> Use `yield return` for deferred execution and streaming when consumers may stop early or the sequence is large, because it lowers peak memory usage. Materialize (`ToList()` / `ToArray()`) when you need a snapshot, random access or `Count`, or repeated enumeration without rerunning expensive or side-effectful generation logic.

## Links

- [Iteration statements (foreach)](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/iteration-statements#the-foreach-statement) — language reference for `foreach` syntax, duck-typing pattern, and async enumeration.
- [C# language specification: iteration statements](https://learn.microsoft.com/dotnet/csharp/language-reference/language-specification/statements#139-iteration-statements) — formal spec defining the enumerator pattern the compiler targets.
- [yield statement (yield return / yield break)](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/yield) — reference for iterator methods, state machine semantics, and async iterators.
- [Iterators (overview)](https://learn.microsoft.com/dotnet/csharp/iterators) — conceptual guide covering lazy evaluation, deferred execution, and `IAsyncEnumerable<T>`.
- [How is foreach implemented in C#? (StackOverflow)](https://stackoverflow.com/questions/11179156/how-is-foreach-implemented-in-c) — community explanation of compiler lowering with IL examples.
- [Yield: what, where, and why (Habr)](https://habr.com/ru/post/311094/) — Russian-language practitioner deep-dive into iterator state machines.
