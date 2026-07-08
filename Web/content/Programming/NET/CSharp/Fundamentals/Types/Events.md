---
publish: true
created: 2026-07-08T16:14:17.327+03:00
modified: 2026-07-08T16:14:17.328+03:00
published: 2026-07-08T16:14:17.328+03:00
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

An event is a restricted delegate member that implements publisher-subscriber communication. Outside the declaring type, consumers can only subscribe (`+=`) and unsubscribe (`-=`); they cannot invoke or replace the delegate invocation list. This encapsulation is why events are preferred over raw public delegates in APIs.

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

> [!INFO]
> **The default (field-like) event is already thread-safe to subscribe/unsubscribe.** When you write `public event EventHandler Tick;`, the compiler generates `add`/`remove` accessors that update the backing delegate with a lock-free `Interlocked.CompareExchange` loop. So you only need a custom `add`/`remove` (like above) for _extra_ behavior — weak references, deduplication, logging — not merely for thread safety. Note this protects the subscription list, not the _raising_ of the event.

## Pitfalls

1. **Memory leaks via long-lived publishers**: subscribers stay alive while subscribed.
2. **Forgotten unsubscribe**: common in UI/view-model/service lifetimes.
3. **`async void` event handlers**: the standard event signature is synchronous, so an `async` handler must be `async void` — which means exceptions can't be caught by the publisher and crash the process, and the publisher can't await completion. Keep the handler body minimal, wrap it in its own `try/catch`, and offload real async work to a properly awaited path (a queue/channel). See [[Async Await]].

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

- **Events vs public delegate fields**: A public delegate field lets any external caller replace, null out, or directly invoke the handler. The `event` keyword restricts external callers to `+=`/`-=` only, preserving publisher control. Always use `event` in public APIs.
- **Events vs `IObservable<T>` (Rx)**: Events are synchronous, single-publisher, multicast notifications with no composition support. `IObservable<T>` from Reactive Extensions supports filtering, merging, debouncing, retrying, and async continuations — at the cost of a dependency and a steeper learning curve. Use `IObservable<T>` when you need stream operators; events for simple point-to-point notifications.
- **Custom `add`/`remove` overhead**: The default event implementation stores handlers in a multicast delegate (immutable; every `+=`/`-=` allocates a new list). In high-frequency subscribe/unsubscribe scenarios, custom accessors backed by a `ConcurrentDictionary` or locked collection reduce per-operation allocation.

## Questions

> [!QUESTION]- How is an event different from a delegate field in terms of access control?
> An event exposes only `add`/`remove` from outside the declaring type. A delegate field can be invoked, replaced, or nulled by external callers. Events preserve publisher ownership of invocation.

> [!QUESTION]- Why do event leaks happen, and how do you prevent them?
> The publisher keeps strong references to subscriber handlers. If the publisher outlives subscribers, those subscribers cannot be garbage-collected. Prevent with explicit unsubscribe (`Dispose`), weak-event pattern, or scoped subscription helpers.

> [!QUESTION]- How do you handle exceptions in event subscribers without losing later handlers?
> Copy the invocation list using `GetInvocationList()` and invoke handlers individually in `try/catch`. Direct event invocation stops at first exception.

## Links

- [Standard .NET event patterns](https://learn.microsoft.com/dotnet/csharp/event-pattern) — official guide to `EventHandler<T>`, `EventArgs`, and the raise/subscribe pattern.
- [Events - .NET guide](https://learn.microsoft.com/dotnet/standard/events/) — conceptual overview of the event model, delegates, and multicast invocation.
- [Modern events in C#](https://learn.microsoft.com/dotnet/csharp/modern-events) — covers relaxed `EventArgs` constraint and modern subscription patterns.
- [Null-conditional operator and thread-safe delegate invoke](https://learn.microsoft.com/dotnet/csharp/language-reference/operators/member-access-operators#null-conditional-operators--and-) — explains why `?.Invoke` is safer than null-check + call.
- [Weak event patterns (WPF)](https://learn.microsoft.com/dotnet/desktop/wpf/events/weak-event-patterns) — pattern for preventing memory leaks when subscriber lifetime is shorter than publisher lifetime.
