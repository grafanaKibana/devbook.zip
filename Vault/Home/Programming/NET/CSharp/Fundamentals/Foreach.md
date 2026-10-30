---
topic: [Programming]
subtopic: [NET]
summary: "C#'s common way to iterate a sequence, plus iterators and yield."
level: ["4"]
priority: High
status: Ready to Repeat
publish: true
qard-deck: "Programming"
qard-topic: "NET/CSharp/Fundamentals/Foreach"
flashcard_uid: "2e8ba405"
created: "2026-02-15T16:27:13.000Z"
modified: "2026-10-28T12:33:42.000Z"
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

**Changing the source during enumeration.** Many mutable collections, including `List<T>` and `Dictionary<TKey,TValue>`, invalidate active enumerators after structural changes and throw `InvalidOperationException`. Applying changes after the loop or iterating an intentional snapshot avoids the exception.

**Deferred work captures more than the item.** Since C# 5, each `foreach` iteration has its own iteration variable, so lambdas do not all observe the final item. Captured mutable state outside the loop is still shared, and closures can outlive resources used during enumeration.

**Multiple enumeration.** An `IEnumerable<T>` may repeat I/O, database work, or side effects every time it is enumerated. Materialization is worthwhile only when a stable snapshot or repeated traversal is actually needed.

# Tradeoffs

- `foreach` expresses sequential traversal without exposing indexes. `for` fits when the index itself is part of the algorithm or the collection must be updated by position.
- LINQ expresses a transformation pipeline. A loop is easier to step through and can avoid iterator or delegate overhead, but performance depends on the source and operators.
- `Span<T>` provides a stack-only view over contiguous memory. It helps APIs avoid copies and allocations. It is not an automatic reason to replace every collection loop.

# Questions

<!-- qard-id: 23508898-cc73-4289-ba2c-ab026d0258b2 -->
> [!qard]- What must a type provide to work with `foreach`?
> A type works with `foreach` in either of two ways. It implements `IEnumerable<T>` or `IEnumerable`, or it matches the enumerator pattern that the compiler looks for. The interface is the usual reusable contract, but it is not required.
>
> The pattern has two parts:
>
> - **The source** has a public parameterless `GetEnumerator()` method. That method can also be an extension method.
> - **The returned enumerator** has a public `Current` property and a public parameterless `MoveNext()` method that returns `bool`.
> 
> The compiler binds to these members rather than to an interface, so a type can be iterated without implementing either interface. Arrays also receive specialized compiler handling.
>
> [Microsoft: iteration statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements)

<!-- qard-id: cdfb0d9a-b75e-43e1-b6ed-ac7ea0da25c7 -->
> [!qard]- How does `foreach` work under the hood?
> The compiler rewrites `foreach` into lower-level code, and the result depends on the source type. For the general enumerator pattern, the rewrite is roughly:
>
> ```csharp
> var enumerator = source.GetEnumerator();
> try
> {
>     while (enumerator.MoveNext())
>     {
>         var item = enumerator.Current;
>         // loop body
>     }
> }
> finally
> {
>     // Disposes the enumerator when it requires disposal.
> }
> ```
>
> 1. `GetEnumerator()` is called once, before the first element.
> 2. Each `MoveNext()` call advances to the next element and returns `false` when the sequence is exhausted.
> 3. `Current` supplies that element, which is assigned to the iteration variable before the body runs.
> 4. When the enumerator requires disposal, the `finally` block disposes it, including after `break` or an exception. A handwritten `while (MoveNext())` loop has to provide that cleanup itself, or the enumerator's cleanup does not run.
> 
> No single generated shape fits every source. Arrays, for example, can be lowered to index-based code without an enumerator.
>
> [Microsoft: iteration statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements)

<!-- qard-id: 0cfeffdf-d33d-4c50-a677-d2f470332fd4 -->
> [!qard]- When is `yield return` useful compared with a materialized collection?
> `yield return` produces values on demand, so a consumer can stop early without first building the whole result. The iterator body runs during enumeration; enumerating again runs it again and may observe changed state. A materialized collection is preferable when a stable snapshot or repeated traversal is needed. [Microsoft: yield statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/yield)

# References

- [C# iteration statements](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/iteration-statements#the-foreach-statement)
