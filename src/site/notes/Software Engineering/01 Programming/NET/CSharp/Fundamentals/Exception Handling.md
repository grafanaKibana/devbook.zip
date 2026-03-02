---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/fundamentals/exception-handling/"}
---

# Intro

Exception handling in C# uses `try`, `catch`, and `finally` to handle failures and guarantee cleanup. In modern C#, `using` / `await using` is the preferred way to ensure `Dispose` / `DisposeAsync` runs.
- `try` contains code that may throw.
- `catch` handles exceptions you know how to handle.
- `finally` normally runs when leaving the `try` block (success or failure) and is used for cleanup.
- `throw;` rethrows the current exception and preserves the original stack trace.
- If no matching `catch` exists in the current method, the runtime searches up caller frames for a compatible handler (including `when` filters). After a handler is selected, the stack is unwound and `finally` blocks run on the path to that handler.

## Example:

```csharp
try
{
    await ProcessAsync(ct);
}
catch (ArgumentException ex)
{
    Console.WriteLine(ex.Message);
    throw;
}
catch (Exception ex) when (ex is not OperationCanceledException)
{
    Log(ex);
    throw;
}
finally
{
    Cleanup();
}
```

## `throw` keyword

`throw` is how you signal that code cannot continue normally and must transfer control to an exception handler.

### Why we need it

- It fails fast when invariants are broken (for example, invalid arguments or invalid state).
- It creates a stack trace from the throw site, which is critical for debugging.
- It lets higher layers decide how to handle the failure (retry, map to HTTP response, stop processing).

### When to use

- Argument validation in public APIs (`ArgumentNullException`, `ArgumentException`, `ArgumentOutOfRangeException`).
- Invalid object state where continuing would produce incorrect behavior (`InvalidOperationException`).
- Rethrow inside `catch` with `throw;` after logging to preserve the original stack trace.
- Wrap and throw a new exception (with `innerException`) when you need domain-specific context.
- Throw expressions in guard clauses for concise validation.

```csharp
public static string NormalizeName(string? value)
{
    var name = value ?? throw new ArgumentNullException(nameof(value));
    if (name.Length > 100)
    {
        throw new ArgumentOutOfRangeException(nameof(value), "Name is too long.");
    }

    return name.Trim();
}
```

## Pitfalls

- **Exceptions as control flow**: throwing for expected branches (for example, routine `not found`) is expensive and obscures business logic. Use explicit branching (`Try*` patterns, nullable results, or domain result types) for expected outcomes.
- **`throw ex;` in `catch`**: this restarts the stack trace at the rethrow point and loses the original call path. Use `throw;` inside the same `catch` to preserve debugging context.
- **Throwing in `finally`**: a new exception from `finally` can mask the original failure from `try`/`catch`. Keep `finally` focused on cleanup and avoid new throws there.
- **Overly generic exception types**: throwing `Exception` makes handling and telemetry less actionable. Prefer specific built-in types (`ArgumentException`, `InvalidOperationException`, and related types) that communicate intent.

## Questions

> [!QUESTION]- What is the difference between `throw;` and `throw ex;` inside a `catch` block?
> `throw;` preserves the original stack trace, while `throw ex;` resets it to the current method. In practice, this means `throw;` keeps the real failure path for debugging and observability.

> [!QUESTION]- When should you wrap an exception instead of rethrowing it directly?
> Wrap when you need to add domain context or translate infrastructure exceptions at a boundary (for example, repository to application service). Keep the original error in `InnerException` so root cause details remain available.

> [!QUESTION]- Why is throwing from `finally` considered dangerous?
> A throw in `finally` can replace the original exception and hide root cause information. The safer pattern is cleanup-only logic in `finally`, with error handling done in `catch` or at higher boundaries.

> [!QUESTION]- When might `finally` not execute?
> When the process terminates abruptly and normal stack unwinding does not happen (for example, crash/kill, `Environment.FailFast()`, or `StackOverflowException`).

## Links

- [Exception-handling statements (try/catch/finally/throw)](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/exception-handling-statements) — language reference for all exception-handling syntax including `when` filters and throw expressions.
- [Best practices for exceptions](https://learn.microsoft.com/dotnet/standard/exceptions/best-practices-for-exceptions) — Microsoft guidance on when to throw, when to catch, and how to design exception hierarchies.
- [Exception throwing (Framework Design Guidelines)](https://learn.microsoft.com/dotnet/standard/design-guidelines/exception-throwing) — API design rules for exception usage in library code.
- [Using standard exception types](https://learn.microsoft.com/dotnet/standard/design-guidelines/using-standard-exception-types) — which built-in exception types to use for which scenarios.
- [Catch handler search in call stack (Metanit)](https://metanit.com/sharp/tutorial/2.30.php) — Russian-language practitioner walkthrough of how the runtime searches for matching handlers up the call stack.

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
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Foreach\|Foreach]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Generics\|Generics]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Methods\|Methods]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Namespaces\|Namespaces]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Reflection\|Reflection]]
<!-- whats-next:end -->
