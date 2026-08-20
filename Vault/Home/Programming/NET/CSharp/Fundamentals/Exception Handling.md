---
topic:
  - Programming
subtopic:
  - NET
summary: "Handling failures and cleanup during normal control transfer and stack unwinding in C#."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

Exceptions carry failures across method boundaries when normal execution cannot continue. A `try` block marks code whose failure may be handled nearby. A matching `catch` decides whether recovery is possible, and `finally` protects cleanup that must happen while the stack unwinds. For disposable resources, `using` and `await using` usually express that cleanup more directly.

- `try` contains code that may throw.
- `catch` handles exceptions for which local recovery or translation is defined.
- `finally` normally runs when leaving the `try` block (success or failure) and is used for cleanup.
- `throw;` rethrows the current exception and preserves the original stack trace.
- If no matching `catch` exists in the current method, the runtime searches up caller frames for a compatible handler (including `when` filters). After a handler is selected, the stack is unwound and `finally` blocks run on the path to that handler.

# Handler Boundaries

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

# `throw` Keyword

`throw` reports that the current operation cannot produce its promised result. The exception type is part of the API contract: it tells callers whether the problem is a bad argument, invalid state, timeout, cancellation, or something domain-specific.

## What a Throw Preserves

- The stack trace identifies the path to the failure.
- A specific type lets a boundary select the failures it can handle.
- An inner exception keeps the lower-level cause when a boundary adds domain context.

## Choosing an Exception

- Public argument validation normally uses `ArgumentNullException`, `ArgumentException`, or `ArgumentOutOfRangeException`.
- `InvalidOperationException` fits a call that is valid in general but invalid for the object's current state.
- A domain exception is useful when callers need a stable, catchable failure contract that built-in types cannot express.
- A throw expression keeps a small guard clause close to the value it protects.

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

# Custom Exceptions

Create a custom type when callers need to distinguish the failure from other exceptions. Derive from `Exception`, keep useful state immutable, and preserve an inner exception when the custom type translates a lower-level failure.

```csharp
public sealed class OrderNotFoundException(int orderId)
    : Exception($"Order {orderId} was not found.")
{
    public int OrderId { get; } = orderId;
}
```

A built-in type is better when it already communicates the contract (`ArgumentException`, `KeyNotFoundException`, or `TimeoutException`). Legacy binary-serialization constructors do not belong in new exception types unless an old remoting contract still requires them.

# Aggregated and Cross-Boundary Exceptions

- **`AggregateException`** represents multiple failures from parallel or task-based work. Awaiting a faulted `Task.WhenAll` propagates one exception, while the completed task's `Exception` property retains the aggregate. `Flatten()` removes nested aggregates, and `Handle(predicate)` marks selected inner exceptions as handled. See [[Tasks]].
- **`ExceptionDispatchInfo`** captures an exception so it can be thrown later without replacing its original throw-site information:

  ```csharp
  ExceptionDispatchInfo? captured = null;
  try { Work(); } catch (Exception ex) { captured = ExceptionDispatchInfo.Capture(ex); }
  // ...later, elsewhere...
  captured?.Throw(); // original throw-site preserved
  ```

  This is useful when infrastructure must move a failure across an asynchronous or queue boundary without pretending the later throw site caused it.

# Global / Last-Chance Handlers

Unhandled exceptions need an application boundary that records the failure and converts it only when the host has a valid response model.

- ASP.NET Core can use `app.UseExceptionHandler(...)` to log a failure and return a Problem Details response.
- `AppDomain.CurrentDomain.UnhandledException` offers last-chance observation before termination. It is not a recovery hook.
- `TaskScheduler.UnobservedTaskException` reports a fault whose task exception was never observed. It does not make fire-and-forget work reliable.
- `AppDomain.CurrentDomain.FirstChanceException` runs for every throw before handler selection, which makes it a diagnostic instrument rather than ordinary production logging.

# Pitfalls

- **Exceptions as routine branching.** A cache miss or validation rejection may be an expected result. A `Try*` method, nullable result, or explicit domain result makes that path visible and avoids paying for stack capture on normal traffic.
- **`throw ex;` in `catch`**: this restarts the stack trace at the rethrow point and loses the original call path. Use `throw;` inside the same `catch` to preserve debugging context.
- **Throwing in `finally`**: a new exception from `finally` can mask the original failure from `try`/`catch`. Keep `finally` focused on cleanup and avoid new throws there.
- **Overly generic exception types**: throwing `Exception` makes handling and telemetry less actionable. Prefer specific built-in types (`ArgumentException`, `InvalidOperationException`, and related types) that communicate intent.

# Tradeoffs

- **Exceptions versus result values.** Exceptions carry unexpected failures naturally through .NET infrastructure. Result values make expected rejection paths explicit in signatures. The useful dividing line is whether the caller is expected to branch on the outcome.
- **Catch width.** A broad catch is appropriate at a host boundary that logs and translates failures. Deeper in the application, catch only what can be handled, enriched, or rolled back meaningfully.
- **Exception filters.** A `when` filter runs before stack unwinding and can select a handler without catching and rethrowing. Keep filters predictable. A filter that returns `false` leaves handler search to continue.

# Questions

> [!QUESTION]- What is the difference between `throw;` and `throw ex;` inside a `catch` block?
> `throw;` rethrows the current exception without changing its original stack trace. `throw ex;` throws the same exception object from the current line and resets the stack trace, which hides the calls that led to the original failure. Use `throw;` when the same exception is rethrown from its `catch` block.

> [!QUESTION]- When should an exception be wrapped instead of rethrown directly?
> Wrap an exception when code crosses a boundary and the caller needs context that the original failure does not provide. For example, a repository can translate a database exception into an order-saving exception that the application layer understands. The original exception should remain in `InnerException` so its stack trace and details are still available. If the wrapper adds no useful meaning, `throw;` is clearer.

> [!QUESTION]- Why is throwing from `finally` considered dangerous?
> If the `try` block throws one exception and `finally` throws another, the exception from `finally` can replace the original failure. The caller then sees the cleanup error while the real cause is hidden. A `finally` block should normally perform cleanup that is safe to run during stack unwinding, while failure handling stays in `catch` or at a higher boundary.

> [!QUESTION]- When might `finally` not execute?
> `finally` normally runs when control leaves the protected block, including during exception-driven stack unwinding. It may not run when the process stops without normal unwinding, such as an operating-system kill, `Environment.FailFast()`, a severe runtime failure, or a `StackOverflowException`. It is an in-process cleanup guarantee, not a crash-recovery mechanism.

# References

- [Best practices for exceptions](https://learn.microsoft.com/dotnet/standard/exceptions/best-practices-for-exceptions)
