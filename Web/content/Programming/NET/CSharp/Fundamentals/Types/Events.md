---
publish: true
created: 2026-08-20T20:41:15.658Z
modified: 2026-08-20T20:41:15.658Z
published: 2026-08-20T20:41:15.658Z
topic:
  - Programming
subtopic:
  - NET
summary: A restricted delegate member implementing publisher and subscriber communication.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

An event is a delegate-backed member with restricted access. Code outside the declaring type may subscribe with `+=` or unsubscribe with `-=`, but it cannot raise the event or replace its invocation list. The publisher keeps control of notification, which is the reason public APIs expose events instead of delegate fields.

The standard .NET shape uses `EventHandler` or `EventHandler<TEventArgs>`.

```csharp
public class PriceFeed
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

# Why `event` Instead of Public Delegate Field

With a public delegate field, an external caller can:

- assign `publisher.Callback = null`
- invoke `publisher.Callback(...)`
- replace all handlers

The `event` keyword blocks all three operations outside the declaring type. Only subscription remains public.

# Custom `add` and `remove`

Explicit accessors are useful when subscription needs extra behavior such as weak references or deduplication:

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
> **Field-like event accessors perform thread-safe subscription updates.** The compiler-generated `add` and `remove` accessors protect changes to the backing delegate, though the language does not require a particular locking or compare-exchange implementation. Custom accessors are needed for different storage or added policy, not merely to protect `+=` and `-=`. Raising the event is a separate operation. Subscriber code can still race with publication and with other handlers.

# Pitfalls

1. **Long-lived publishers retain subscribers.** A handler keeps its target alive until it is removed or the publisher becomes unreachable.
2. **Unsubscription follows lifetime.** UI objects and scoped services commonly leak when their subscription outlives the scope.
3. **`async void` handlers cannot be awaited by the publisher.** The standard event signature is synchronous, and exceptions after an `await` do not flow back through the event invocation. Keep the handler small, handle its failures locally, and hand longer work to an awaited or queued path. See [[Async Await]].

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

# Tradeoffs

- **Events vs public delegate fields:** A field lets external code replace, clear, or invoke the delegate. An event restricts that code to subscription and leaves publication with the declaring type. Public notification APIs should use `event`.
- **Events vs `IObservable<T>`:** Events are synchronous multicast notifications with little composition. Reactive Extensions adds stream operators such as filtering and retry, along with another abstraction and dependency. Events fit simple notifications. An observable stream earns its cost when operators define the workflow.
- **Custom accessors:** A field-like event stores handlers in an immutable multicast delegate, so changing the subscription list creates another delegate value. Alternative storage only helps after measurement shows subscription churn itself is a problem. It also adds ordering and concurrency rules that the event now owns.

# Questions

> [!QUESTION]- What is the difference between an event and a public delegate field?
> Outside code can only subscribe to or unsubscribe from an event. The type that declares the event keeps control over when it is raised. A public delegate field also lets outside code invoke the delegate, replace its handlers, or set it to `null`, which can break the publisher's notification logic.

> [!QUESTION]- Why can event subscriptions cause memory leaks, and how can they be prevented?
> The publisher stores each handler, and the handler normally holds a strong reference to its subscriber. If the publisher lives longer, that reference keeps the subscriber alive even when the rest of the application no longer uses it. The subscription should be removed when the subscriber's lifetime ends, commonly through `Dispose`. Weak-event patterns or scoped subscription helpers are alternatives when explicit ownership is difficult.

# References

- [Standard .NET event patterns](https://learn.microsoft.com/dotnet/csharp/event-pattern)
