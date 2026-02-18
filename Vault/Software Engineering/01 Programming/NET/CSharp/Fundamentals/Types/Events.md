---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Not-Started
dg-publish: true
---
# Intro

An event is a restricted delegate member that implements publisher-subscriber communication. Outside the declaring type, consumers can only subscribe (`+=`) and unsubscribe (`-=`); they cannot invoke or replace the delegate invocation list. This encapsulation is why events are preferred over raw public delegates in APIs.

## Deeper Explanation

The standard .NET event signature uses `EventHandler` or `EventHandler<TEventArgs>`.

```csharp
public sealed class PriceFeed
{
    public event EventHandler<PriceChangedEventArgs>? PriceChanged;

    private decimal _price;

    public void UpdatePrice(decimal newPrice)
    {
        if (newPrice == _price) return;
        _price = newPrice;
        OnPriceChanged(new PriceChangedEventArgs(newPrice));
    }

    protected virtual void OnPriceChanged(PriceChangedEventArgs e)
        => PriceChanged?.Invoke(this, e);
}

public sealed class PriceChangedEventArgs : EventArgs
{
    public decimal Price { get; }
    public PriceChangedEventArgs(decimal price) => Price = price;
}
```

### Why `event` Instead of Public Delegate Field

With a public delegate field, any caller can do dangerous operations like:

- assign `publisher.Callback = null`
- invoke `publisher.Callback(...)`
- replace all handlers

`event` blocks these operations for external code and exposes only subscription semantics.

### Raising Events Safely

Preferred pattern:

- field-like event declaration
- `protected virtual OnXxx(...)` raiser
- `?.Invoke(this, args)` inside the raiser

`?.Invoke` is thread-safe for the null-check/invocation window because it works on a copied delegate reference.

### Custom `add` and `remove`

You can define explicit accessors for advanced scenarios (thread-safe collections, weak subscriptions, deduplication):

```csharp
private EventHandler? _tick;
private readonly object _gate = new();

public event EventHandler Tick
{
    add
    {
        lock (_gate)
            _tick += value;
    }
    remove
    {
        lock (_gate)
            _tick -= value;
    }
}
```

## Pitfalls

1. **Memory leaks via long-lived publishers**: subscribers stay alive while subscribed.
2. **Forgotten unsubscribe**: common in UI/view-model/service lifetimes.
3. **Lambda unsubscribe bug**: cannot unsubscribe anonymous lambdas unless handler was stored.
4. **Subscriber exceptions bubbling out**: one bad handler can fail the publisher call path.
5. **Wrong sender/args conventions**: use `this` for instance events, `null` for static events, and `EventArgs.Empty` when no data exists.

Example leak-safe subscription pattern:

```csharp
public sealed class Listener : IDisposable
{
    private readonly PriceFeed _feed;

    public Listener(PriceFeed feed)
    {
        _feed = feed;
        _feed.PriceChanged += OnPriceChanged;
    }

    private void OnPriceChanged(object? sender, PriceChangedEventArgs e)
        => Console.WriteLine(e.Price);

    public void Dispose()
        => _feed.PriceChanged -= OnPriceChanged;
}
```

## Tradeoffs

| Choice | Pros | Cons | Use when |
|---|---|---|---|
| `event EventHandler<T>` | Standard conventions, discoverable API | Boilerplate `EventArgs` type | Public framework/library surface |
| Custom delegate event | Precise signature | Less familiar conventions | Domain needs special signature |
| Event bus/message broker | Decoupled and scalable | More complexity and infra | Cross-bounded-context integration |
| Raw delegate field | Very simple | No encapsulation, unsafe API | Private/internal implementation details only |

## Questions

> [!QUESTION]- How is an event different from a delegate field in terms of access control?
> An event exposes only `add`/`remove` from outside the declaring type. A delegate field can be invoked, replaced, or nulled by external callers. Events preserve publisher ownership of invocation.

> [!QUESTION]- Why is `PriceChanged?.Invoke(this, e)` preferred over `if (PriceChanged != null) PriceChanged(this, e)`?
> The null-conditional form avoids the race where another thread unsubscribes between check and call. It uses a copied delegate reference for the invocation expression.

> [!QUESTION]- Why do event leaks happen, and how do you prevent them?
> The publisher keeps strong references to subscriber handlers. If the publisher outlives subscribers, those subscribers cannot be garbage-collected. Prevent with explicit unsubscribe (`Dispose`), weak-event pattern, or scoped subscription helpers.

> [!QUESTION]- Is `EventArgs` inheritance mandatory in modern .NET?
> No. In modern .NET, `EventHandler<T>` no longer requires `T : EventArgs`. You can use any payload type, but `EventArgs`-based design remains the most idiomatic and interoperable style.

> [!QUESTION]- How do you handle exceptions in event subscribers without losing later handlers?
> Copy the invocation list using `GetInvocationList()` and invoke handlers individually in `try/catch`. Direct event invocation stops at first exception.

## Links

- [Standard .NET event patterns](https://learn.microsoft.com/dotnet/csharp/event-pattern)
- [Events - .NET guide](https://learn.microsoft.com/dotnet/standard/events/)
- [Modern events in C#](https://learn.microsoft.com/dotnet/csharp/modern-events)
- [Null-conditional operator and thread-safe delegate invoke](https://learn.microsoft.com/dotnet/csharp/language-reference/operators/member-access-operators#null-conditional-operators--and-)
- [Weak event patterns (WPF)](https://learn.microsoft.com/dotnet/desktop/wpf/events/weak-event-patterns)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Fundamentals|Fundamentals]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Classes|Classes]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Delegates|Delegates]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Records|Records]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Strings|Strings]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Structs|Structs]]
<!-- whats-next:end -->
