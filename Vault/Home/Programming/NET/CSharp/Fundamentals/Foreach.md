---
topic:
  - Programming
subtopic:
  - NET
summary: "C#'s common way to iterate a sequence, plus iterators and yield."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
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

> [!QUESTION]- What types can you use in `foreach`?
> Any type that implements `IEnumerable` / `IEnumerable<T>`, or any type that provides the enumerator pattern (`GetEnumerator()` + `Current` + `MoveNext()`).

> [!QUESTION]- How is `foreach` implemented under the hood?
> The compiler chooses a lowering for the source type. The general form calls `GetEnumerator()`, loops through `MoveNext()` and `Current`, then disposes the enumerator when required. Arrays receive specialized handling.

> [!QUESTION]- What is `yield` and how does it work?
> It creates an iterator: each `yield return` produces a value and pauses the method. The method resumes on the next iteration request.

> [!QUESTION]- Why and when should you use `yield return` instead of returning a materialized collection like `List<T>`?
> Use `yield return` for deferred execution and streaming when consumers may stop early or the sequence is large, because it lowers peak memory usage. Materialize (`ToList()` / `ToArray()`) when you need a snapshot, random access or `Count`, or repeated enumeration without rerunning expensive or side-effectful generation logic.

# References

- [C# iteration statements](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/iteration-statements#the-foreach-statement)
