---
publish: true
created: 2026-08-20T20:41:15.655Z
modified: 2026-08-20T20:41:15.655Z
published: 2026-08-20T20:41:15.655Z
topic:
  - Programming
subtopic:
  - NET
summary: C#'s common way to iterate a sequence, plus iterators and yield.
level:
  - "4"
priority: High
status: Ready to Repeat
---

`foreach` asks a source for one item at a time. Most sources implement `IEnumerable<T>`, but the compiler also accepts types that expose the required enumerator pattern without implementing the interface. This is why arrays, collections, spans, and custom stack-only enumerators can all use the same loop syntax.

The source must provide either an enumerable interface or a suitable `GetEnumerator()` method. The returned enumerator exposes `Current` and a parameterless `MoveNext()` returning `bool`.

For a normal enumerable, the lowering is roughly:

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
    // Conceptually: if this enumerator requires disposal, dispose it here.
    // The exact pattern depends on its static type and may avoid boxing a struct.
}
```

The exact lowering depends on the source type. Arrays receive specialized index-based handling. Other enumerators are disposed when required, including after `break` or an exception. A hand-written `while (MoveNext())` loop must preserve that cleanup itself.

Concrete collections can expose struct enumerators, avoiding a heap allocation for the enumerator. Upcasting such a collection to `IEnumerable<T>` may box that enumerator. This matters only on measured hot paths. The interface is often the better boundary elsewhere.

# Iterators and Yield

`yield return` lets a method describe a sequence without building the whole result first. The compiler turns the method into a state machine that resumes at the next statement each time the consumer asks for another element. `yield break` ends the sequence.

An iterator returning `IEnumerable<T>` normally starts work during enumeration, not when the method is called:

- Calling the method obtains the enumerable state machine.
- `MoveNext()` runs the body until it reaches a `yield return` or finishes.
- Disposing the enumerator runs pending `finally` blocks.

Async iterators apply the same idea through `IAsyncEnumerable<T>` and `await foreach`.

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

Two boundaries are easy to miss:

- **Deferred execution moves failures.** Validation inside the iterator body throws when enumeration begins. A non-iterator wrapper can validate immediately and return a private iterator.
- **`yield return` has placement restrictions.** It cannot appear in a `catch` or `finally`, or in a `try` that has a `catch`. A `try` with only `finally` is allowed so the state machine can preserve cleanup.

# Pitfalls

**Changing the source during enumeration.** Many mutable collections, including `List<T>` and `Dictionary<TKey,TValue>`, invalidate active enumerators after structural changes and throw `InvalidOperationException`. Apply changes after the loop or iterate an intentional snapshot.

**Deferred work captures more than the item.** Since C# 5, each `foreach` iteration has its own iteration variable, so lambdas do not all observe the final item. Captured mutable state outside the loop is still shared, and closures can outlive resources used during enumeration.

**Multiple enumeration.** An `IEnumerable<T>` may repeat I/O, database work, or side effects every time it is enumerated. Materialize only when a stable snapshot or repeated traversal is actually needed.

# Tradeoffs

- `foreach` expresses sequential traversal without exposing indexes. Use `for` when the index itself is part of the algorithm or the collection must be updated by position.
- LINQ expresses a transformation pipeline. A loop is easier to step through and can avoid iterator or delegate overhead, but performance depends on the source and operators.
- `Span<T>` provides a stack-only view over contiguous memory. It helps APIs avoid copies and allocations. It is not an automatic reason to replace every collection loop.

# Questions

> [!QUESTION]- What must a type provide to work with `foreach`?
> A type does not have to implement `IEnumerable`. The compiler can use the enumerable pattern: a public parameterless instance `GetEnumerator` method, or a supported extension `GetEnumerator` when instance lookup does not provide one. That method must return an enumerator with a public `Current` property and a public parameterless `bool MoveNext()` method. Implementing `IEnumerable<T>` is the usual reusable contract. Arrays receive dedicated compiler handling, while `Span<T>` works through its enumerator pattern.

> [!QUESTION]- How does `foreach` work under the hood?
> The compiler rewrites the loop according to the source type. In the general case it obtains an enumerator, calls `MoveNext`, reads `Current`, and disposes the enumerator in a `finally` block when disposal is required. Arrays use a simpler indexed loop, so the exact generated shape is not identical for every collection.

> [!QUESTION]- How does `yield return` implement an iterator?
> The compiler turns the method into a state machine that stores its current position and local state. Calling the method creates the iterator, but the body normally starts only when enumeration begins. Each `yield return` produces one value and pauses execution; the next `MoveNext` call resumes from that point. This also means work and exceptions occur during enumeration rather than when the iterator is created.

> [!QUESTION]- When is `yield return` better than returning a materialized collection such as `List<T>`?
> `yield return` is useful when values can be produced one at a time, the sequence is large, or the caller may stop early. It avoids building the whole collection first, but the generation logic runs again on each enumeration and can observe changing state. A materialized collection is better when a stable snapshot, random access, a cheap `Count`, or repeated enumeration is required.

# References

- [C# iteration statements](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/iteration-statements#the-foreach-statement)
