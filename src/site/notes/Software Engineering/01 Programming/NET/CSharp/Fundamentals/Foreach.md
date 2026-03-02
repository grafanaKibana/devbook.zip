---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/fundamentals/foreach/"}
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
while (enumerator.MoveNext())
{
    var item = enumerator.Current;
    // Use item
}
```

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
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Generics\|Generics]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Methods\|Methods]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Namespaces\|Namespaces]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Reflection\|Reflection]]
<!-- whats-next:end -->
