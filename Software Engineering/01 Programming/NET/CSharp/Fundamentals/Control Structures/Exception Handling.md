---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Creation
---
# Intro

Exception handling in C# uses `try`, `catch`, and `finally` to handle failures and guarantee cleanup. In modern C#, `using` / `await using` is the preferred way to ensure `Dispose` / `DisposeAsync` runs.

## Deeper Explanation

- `try` contains code that may throw.
- `catch` handles exceptions you know how to handle.
- `finally` runs when leaving the `try` block (success or failure) and is used for cleanup.
- `throw;` rethrows the current exception and preserves the original stack trace.

Example:

```csharp
try
{
    DoWork();
}
catch (ArgumentException ex)
{
    Console.WriteLine(ex.Message);
    throw;
}
finally
{
    Cleanup();
}
```

Example with exception filter:

```csharp
try
{
    await ProcessAsync(ct);
}
catch (Exception ex) when (ex is not OperationCanceledException)
{
    Log(ex);
    throw;
}
```

## Questions

> [!QUESTION]- How do you handle potential errors in code?
> Use `try`/`catch`/`finally` to handle exceptions and guarantee cleanup (often via `using`/`await using` for disposables).

> [!QUESTION]- When might `finally` not execute?
> When the process terminates abruptly and normal stack unwinding doesn't happen (for example, crash/kill, `Environment.FailFast()`, or `StackOverflowException`).

## Links

- [Exception-handling statements (try/catch/finally/throw)](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/exception-handling-statements)
