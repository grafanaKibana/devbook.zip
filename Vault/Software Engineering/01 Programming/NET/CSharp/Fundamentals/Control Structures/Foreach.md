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
# Foreach

# Intro

`foreach` is the most common way to iterate a sequence in C#. It works with types that provide an enumerator (typically via `IEnumerable` / `IEnumerable<T>`), and the compiler rewrites the loop into an enumerator-based pattern.

## Deeper Explanation

You can use `foreach` with:

- Any type that implements `System.Collections.IEnumerable` or `System.Collections.Generic.IEnumerable<T>`
- Or any type that satisfies the enumerator pattern:
  - A public parameterless `GetEnumerator()` method (instance or extension)
  - The returned enumerator has a public `Current` property and a public parameterless `MoveNext()` method returning `bool`

Internals (compiler lowering):

- For many built-in collections, the compiler emits code that calls `GetEnumerator()`, then loops while `MoveNext()` returns `true` and reads `Current`.
- For some cases (for example, arrays), the compiler can optimize into an index-based loop.

Example equivalent shape:

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

## Links

- [Iteration statements (foreach)](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/iteration-statements#the-foreach-statement)
- [C# language specification: iteration statements](https://learn.microsoft.com/dotnet/csharp/language-reference/language-specification/statements#139-iteration-statements)
- [yield statement (yield return / yield break)](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/yield)
- [Iterators (overview)](https://learn.microsoft.com/dotnet/csharp/iterators)
- [How is foreach implemented in C#? (StackOverflow)](https://stackoverflow.com/questions/11179156/how-is-foreach-implemented-in-c)
- [Yield: what, where, and why](https://habr.com/ru/post/311094/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Fundamentals|Fundamentals]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Exception Handling|Exception Handling]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Methods|Methods]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Namespaces|Namespaces]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Control Structures/Reflection|Reflection]]
<!-- whats-next:end -->
