---
publish: true
created: 2026-10-28T12:27:02.957Z
modified: 2026-10-28T12:27:15.236Z
published: 2026-10-28T12:27:15.236Z
topic:
  - Programming
subtopic:
  - NET
summary: A restricted delegate member implementing publisher and subscriber communication.
level:
  - "4"
priority: Medium
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/CSharp/Fundamentals/Types/Events
flashcard_uid: 6b17a98d
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
3. **`async void` handlers cannot be awaited by the publisher.** The standard event signature is synchronous, and exceptions after an `await` do not flow back through the event invocation. A safe handler stays small, handles its failures locally, and hands longer work to an awaited or queued path that owns its completion. [[Async Await]] covers the `async void` lifecycle and how its exceptions surface.

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

<!-- qard-id: 7cde4edd-5239-4b9f-99d2-4ae8423cf684 -->

> [!qard]- What is the difference between an event and a public delegate field?
> Outside code can only subscribe to and unsubscribe from an event, and the declaring type alone decides when it is raised. A public delegate field exposes the delegate value itself, so any outside code can also invoke it, overwrite it or clear it.
>
> | What outside code does | `public event EventHandler? Changed;` | `public EventHandler? Changed;` (field) |
> |---|---|---|
> | Add or remove a handler: `feed.Changed += OnChanged;` | Allowed, through the event's `add` and `remove` accessors. | Allowed, by storing a new combined delegate in the field. |
> | Raise it: `feed.Changed?.Invoke(feed, EventArgs.Empty);` | Compile error, so only the publisher can announce the change. | Allowed, so any caller can send a notification for a change that never happened. |
> | Overwrite it: `feed.Changed = OnChanged;` or `= null` | Compile error. | Allowed, so one careless `=` silently removes every other subscriber. |
>
> Inside the declaring type, a field-like event behaves like its backing delegate, so the publisher can still invoke it and check it for `null`. The `event` keyword therefore restricts access to the same delegate mechanism rather than introducing a different one.
>
> [Microsoft: events](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/) · [C# specification: classes (events)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes)

<!-- qard-id: 886d70ca-8fef-4ec6-8c16-3d1101f171f9 -->

> [!qard]- Why can event subscriptions keep an otherwise unused object alive?
> Subscribing stores a delegate in the publisher, and a delegate for an instance method keeps a reference to the subscriber as its target. The garbage collector reclaims only objects that are unreachable from roots. As long as the publisher is reachable, the subscriber is reachable through it, even when nothing else uses the subscriber.
>
> Reference path: GC root → publisher → event delegate → subscriber.
>
> - **Long-lived publisher:** a static event or an application-wide service stays reachable for the life of the process. Every subscriber that never unsubscribes stays in memory, and its handler keeps being called.
> - **Short-lived publisher:** references point from the publisher to its subscribers, not the reverse. Once the publisher becomes unreachable, it no longer keeps its subscribers alive.
>
> The fix is to unsubscribe with `-=` when the subscriber's lifetime ends, commonly in `Dispose`.
>
> [Microsoft: subscribe to and unsubscribe from events](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/how-to-subscribe-to-and-unsubscribe-from-events) · [Microsoft: events](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/) · [Microsoft: GC fundamentals](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals)

# References

- [Standard .NET event patterns](https://learn.microsoft.com/dotnet/csharp/event-pattern)
