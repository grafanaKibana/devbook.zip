---
publish: true
created: 2026-10-17T18:11:50.082Z
modified: 2026-10-17T18:11:50.082Z
published: 2026-10-17T18:11:50.082Z
topic:
  - Programming
subtopic:
  - NET
summary: Handling failures and cleanup during normal control transfer and stack unwinding in C#.
level:
  - "4"
priority: Medium
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/CSharp/Fundamentals/Exception Handling
flashcard_uid: 6e5f7fa4
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

A custom type fits when callers need to distinguish the failure from other exceptions. Such a type derives from `Exception`, keeps useful state immutable, and preserves an inner exception when the custom type translates a lower-level failure.

```csharp
public sealed class OrderNotFoundException(int orderId)
    : Exception($"Order {orderId} was not found.")
{
    public int OrderId { get; } = orderId;
}
```

A built-in type is better when it already communicates the contract (`ArgumentException`, `KeyNotFoundException`, or `TimeoutException`). Legacy binary-serialization constructors do not belong in new exception types unless an old remoting contract still requires them.

# Aggregated and Cross-Boundary Exceptions

- **`AggregateException`** represents multiple failures from parallel or task-based work. Awaiting a faulted `Task.WhenAll` propagates one exception, while the completed task's `Exception` property retains the aggregate. `Flatten()` removes nested aggregates, and `Handle(predicate)` marks selected inner exceptions as handled. [[Tasks]] describes how task-based work aggregates these failures.
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
- **`throw ex;` in `catch`**: this restarts the stack trace at the rethrow point and loses the original call path. `throw;` inside the same `catch` preserves debugging context.
- **Throwing in `finally`**: a new exception from `finally` can mask the original failure from `try`/`catch`. Keeping `finally` focused on cleanup that raises no new exceptions prevents that masking.
- **Overly generic exception types**: throwing `Exception` makes handling and telemetry less actionable. Specific built-in types (`ArgumentException`, `InvalidOperationException`, and related types) communicate intent.

# Tradeoffs

- **Exceptions versus result values.** Exceptions carry unexpected failures naturally through .NET infrastructure. Result values make expected rejection paths explicit in signatures. The useful dividing line is whether the caller is expected to branch on the outcome.
- **Catch width.** A broad catch is appropriate at a host boundary that logs and translates failures. Deeper in the application, a catch belongs only where the failure can be handled, enriched, or rolled back meaningfully.
- **Exception filters.** A `when` filter runs before stack unwinding and can select a handler without catching and rethrowing. Filter logic needs to stay predictable. A filter that returns `false` leaves handler search to continue.

# Questions

> [!qard]- When should a .NET method throw an exception instead of returning a failure result?
> A method throws when it cannot deliver what it promises and callers are not expected to branch on that outcome in normal flow. It returns a failure result when the outcome is common and expected, so callers routinely check it.
>
> | Aspect | Throwing an exception | Returning a failure result |
> |---|---|---|
> | Fits when | The failure is unexpected for this call, such as an invalid argument, an invalid object state or an unavailable dependency. | The outcome is part of normal flow, such as a cache miss, unparsable user input or a rejected validation. |
> | If the caller ignores it | A synchronous throw propagates up the call stack until a handler catches it, so the caller cannot skip it by not checking. A `Task`-returning async method stores the exception on that `Task`; it surfaces only when the code that owns the task awaits or otherwise observes it, so an ignored faulted task can go unnoticed. | The failure can be silently ignored if the caller never checks the result. |
> | Cost when it happens | Throwing and unwinding are expensive, which matters when the outcome occurs on every request. | Reporting the outcome costs about the same as success. |
> | Typical .NET shape | A specific exception type such as `ArgumentException` or `InvalidOperationException`. | A `Try` method such as `int.TryParse` returning `bool`, `null` or default for a common miss, or an explicit result type. |
>
> Many APIs offer both forms: `int.Parse` throws on bad input, while `int.TryParse` returns `false`. The caller then picks the form that matches how often failure is expected.
>
> [Microsoft: Best practices for exceptions](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions) · [Microsoft: TaskScheduler.UnobservedTaskException](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.taskscheduler.unobservedtaskexception?view=net-10.0)

<!-- qard-id: 47c1a77e-18c3-47f2-beec-be36bdb47219 -->

> [!qard]- What is the difference between `throw;` and `throw ex;` inside a `catch` block?
> `throw;` rethrows the current exception while preserving its original stack trace. `throw ex;` starts the visible stack at the rethrow site and loses the original path. [Microsoft: exception handling statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/exception-handling-statements)

<!-- qard-id: 0d4bb361-db0d-4d8f-b57e-1ec0c12ca36e -->

> [!qard]- When should an exception be wrapped instead of rethrown directly?
> An exception should be wrapped when a boundary must add meaning that the original lacks: context about the operation that failed, or translation into a stable failure type that callers of that layer are expected to handle. The original goes into the new exception's `InnerException`, so its type, message and stack trace stay available.
>
> For example, a data-access layer can translate a database provider's exception into a domain-level `OrderStoreUnavailableException`. Callers then handle one stable type and do not depend on the provider.
>
> When the catch block only logs, cleans up or decides it cannot handle the failure, `throw;` rethrows the original with its stack trace intact. Wrapping without adding meaning only lengthens the exception chain. It can also change which outer handlers match. A `catch` matches its declared type and types derived from it, so a handler that caught the original stops matching when the wrapper's type is neither that type nor derived from it.
>
> [Microsoft: Best practices for exceptions](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions) · [Microsoft: Exception-handling statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/exception-handling-statements)

<!-- qard-id: d8eb2954-a6b6-4720-b753-13e6f473ae67 -->

> [!qard]- Why is throwing from `finally` dangerous?
> An exception that escapes `finally` while another exception is already propagating replaces that exception. The original stops propagating, so callers, outer handlers and any later logging see only the cleanup error, which usually says little about the real cause.
>
> For example, a `try` block fails with a timeout, and closing a connection in `finally` then throws an exception that escapes the block. The caller receives the close failure, and the timeout no longer appears in the propagated exception.
>
> Cleanup in `finally` is therefore kept simple, and any failure it can raise is caught and logged inside the `finally` block so the original exception keeps propagating.
>
> [Microsoft: Exception-handling statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/exception-handling-statements) · [Microsoft: Best practices for exceptions](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions)

<!-- qard-id: 9ffe22a9-8db4-43a7-acea-929d5baa0d53 -->

> [!qard]- When might `finally` not execute?
> `finally` runs when control leaves its `try` block while the process keeps executing: normal completion, a jump such as `return` or `break`, or an exception unwinding through it. It does not run when the process ends without unwinding or when control never leaves the `try` block.
>
> - **Immediate process termination:** `Environment.FailFast` ends the process without running pending `finally` blocks or finalizers. A stack overflow, or the process being killed by the operating system or an orchestrator, ends it just as abruptly.
> - **Unhandled exceptions:** cleanup is reliable when a handler exists and the stack unwinds to it. If no handler is found, whether `finally` blocks run depends on how the runtime and operating system end the process.
> - **Control never leaves the `try` block:** an infinite loop or a deadlock inside it means `finally` is never reached.
>
> `finally` is therefore in-process cleanup, not crash recovery. State that must survive a crash relies on durable mechanisms such as transactions or recovery logic that runs on restart.
>
> [Microsoft: Exception-handling statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/exception-handling-statements) · [Microsoft: Environment.FailFast](https://learn.microsoft.com/en-us/dotnet/api/system.environment.failfast?view=net-10.0)

# References

- [Best practices for exceptions](https://learn.microsoft.com/dotnet/standard/exceptions/best-practices-for-exceptions)
