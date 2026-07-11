---
publish: true
created: 2026-07-11T21:45:09.957Z
modified: 2026-07-11T21:45:09.958Z
published: 2026-07-11T21:45:09.958Z
topic:
  - Programming
subtopic:
  - NET
summary: Using try/catch/finally to handle failures and guarantee cleanup in C#.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

Exception handling in C# uses `try`, `catch`, and `finally` to handle failures and guarantee cleanup. In a production ASP.NET Core API handling 5,000 requests/second, the difference between a well-structured exception strategy and ad-hoc `catch (Exception)` blocks is the difference between actionable Application Insights traces with full stack context and a wall of swallowed errors that hide the root cause for days. In modern C#, `using` / `await using` is the preferred way to ensure `Dispose` / `DisposeAsync` runs.

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

## Custom Exceptions

Create a custom exception type when callers need to **catch your failure specifically** (vs a generic `InvalidOperationException`). Derive from `Exception` (not `ApplicationException`, which is obsolete), provide the three conventional constructors, and prefer immutable, meaningful state:

```csharp
public sealed class OrderNotFoundException(int orderId)
    : Exception($"Order {orderId} was not found.")
{
    public int OrderId { get; } = orderId;
}
```

Don't create a custom type when a built-in one already communicates intent (`ArgumentException`, `KeyNotFoundException`, `TimeoutException`). Note that `[Serializable]` + the serialization constructor are legacy (binary serialization is obsolete in modern .NET) — skip them unless you specifically cross an AppDomain/remoting boundary.

## Aggregated and Cross-Boundary Exceptions

- **`AggregateException`** wraps multiple failures — it's what `Task.WhenAll` and parallel code produce. `await` rethrows only the first; to handle all, inspect `task.Exception` and use `.Flatten()` (collapse nested aggregates) and `.Handle(predicate)` (mark some inner exceptions as handled, rethrow the rest). See [[Tasks]].
- **`ExceptionDispatchInfo`** lets you capture an exception and rethrow it later — from another thread or stack frame — **without losing the original stack trace**:

  ```csharp
  ExceptionDispatchInfo? captured = null;
  try { Work(); } catch (Exception ex) { captured = ExceptionDispatchInfo.Capture(ex); }
  // ...later, elsewhere...
  captured?.Throw(); // original throw-site preserved
  ```

  This is exactly the machinery `await` uses to surface task exceptions at the real failure location.

## Global / Last-Chance Handlers

Always have a top-level net so a stray exception is logged, not silently lost or process-killing:

- ASP.NET Core: `app.UseExceptionHandler(...)` (return RFC 7807 Problem Details).
- `AppDomain.CurrentDomain.UnhandledException` — last-chance log before the process terminates (you cannot stop it).
- `TaskScheduler.UnobservedTaskException` — catches faults from tasks nobody awaited (see the fire-and-forget pitfall).
- `AppDomain.CurrentDomain.FirstChanceException` — fires for _every_ exception as it's thrown (before any catch); useful for diagnostics, noisy in production.

## Pitfalls

- **Exceptions as control flow**: throwing for expected branches (for example, routine `not found`) is expensive and obscures business logic. On a hot path processing 10,000 order lookups/second, using `throw new NotFoundException()` for cache misses (a 30% miss rate) generated 3,000 exceptions/second — each costing ~15μs for stack trace capture, adding 45ms of CPU time per second and triggering garbage collection pressure from the `Exception` objects. Use explicit branching (`Try*` patterns, nullable results, or domain result types) for expected outcomes.
- **`throw ex;` in `catch`**: this restarts the stack trace at the rethrow point and loses the original call path. Use `throw;` inside the same `catch` to preserve debugging context.
- **Throwing in `finally`**: a new exception from `finally` can mask the original failure from `try`/`catch`. Keep `finally` focused on cleanup and avoid new throws there.
- **Overly generic exception types**: throwing `Exception` makes handling and telemetry less actionable. Prefer specific built-in types (`ArgumentException`, `InvalidOperationException`, and related types) that communicate intent.

## Tradeoffs

- **Exceptions vs Result types**: Exceptions are idiomatic for truly unexpected failures and integrate with .NET infrastructure (stack traces, logging middleware, global handlers). Result types (`Result<T, TError>`, `OneOf`) make failure paths explicit at the call site with zero allocation overhead — meaningful in high-throughput hot paths. Use exceptions for infrastructure failures (I/O, network, invariant violation) and result types for expected domain failures (validation, business rule rejections, not-found).
- **Catch width**: catching broad types (`catch (Exception)`) is convenient but hides root causes and encourages accidental error swallowing. Narrow catches force awareness of specific failure modes. As a rule: only catch exceptions you know how to handle; let the rest propagate to a global handler.
- **Exception filters (`when`)**: filters evaluate before stack unwinding, preserving the full original call stack in logging tools (Application Insights, Serilog). They enable observe-and-rethrow without cloning the exception type. Prefer `catch (Exception ex) when (ShouldLog(ex))` over `catch/log/throw` patterns when your goal is observation, not handling.

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
