---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Defines a one-to-many dependency where a subject's state change automatically notifies all subscribers."
level:
  - "3"
priority: High
status: Done
publish: true
qard-deck: "Software Architecture"
qard-topic: "Patterns/Design Patterns/Behavioral/Observer"
flashcard_uid: "a91c4462"
---

A newspaper subscription has the shape of Observer. The publisher keeps a subscriber list and sends each new issue to that list. Subscribers can leave independently, and the publisher does not know how any recipient uses the issue.

Observer defines one publisher with many independently registered subscribers. A state change triggers notification through a stable callback contract, so the publisher does not depend on subscriber types. C# events provide this mechanism directly: `+=` subscribes, `-=` unsubscribes, and invoking the event notifies the current delegate list.

```mermaid
sequenceDiagram
    participant Order as Order - Subject
    participant Email as EmailNotifier
    participant Sms as SmsNotifier
    participant Analytics as AnalyticsTracker
    participant Warehouse as WarehouseNotifier
    Order->>Email: StatusChanged - Shipped
    Order->>Sms: StatusChanged - Shipped
    Order->>Analytics: StatusChanged - Shipped
    Order->>Warehouse: StatusChanged - Shipped
```

# Problem

`OrderService.UpdateStatus()` calls every downstream system itself. Notification policy is mixed into order state changes:

```csharp
public class OrderService
{
    private readonly IEmailService _email;
    private readonly ISmsService _sms;
    private readonly IAnalyticsService _analytics;
    private readonly IWarehouseService _warehouse;

    // ⚠️ OrderService knows every subscriber — tight coupling
    public async Task UpdateStatusAsync(Guid orderId, OrderStatus newStatus)
    {
        var order = await _repository.GetAsync(orderId);
        order.Status = newStatus;
        await _repository.UpdateAsync(order);

        // ⚠️ Adding a new subscriber (push notification, ERP system) requires editing this method
        await _email.SendStatusUpdateAsync(order.Customer.Email, order.Id, newStatus);
        await _sms.SendStatusUpdateAsync(order.Customer.Phone, order.Id, newStatus);
        await _analytics.TrackStatusChangeAsync(order.Id, newStatus);
        await _warehouse.NotifyStatusChangeAsync(order.Id, newStatus);
    }
}
```

A push notification requires another `OrderService` dependency and another call. The publisher has become a registry of notification channels.

# Solution

C# events work for synchronous notifications. An explicit observer interface gives server-side code an awaitable contract and clearer failure handling:

```csharp
// Approach 1: C# event — the idiomatic .NET Observer
public class Order
{
    public Guid Id { get; set; }
    public OrderStatus Status { get; private set; }
    public Customer Customer { get; set; } = null!;

    // ✅ event IS the Observer pattern — subscribers register independently
    public event EventHandler<OrderStatusChangedEventArgs>? StatusChanged;

    public void UpdateStatus(OrderStatus newStatus)
    {
        var previous = Status;
        Status = newStatus;
        // ✅ Raise event — Order doesn't know who's listening
        StatusChanged?.Invoke(this, new OrderStatusChangedEventArgs(Id, previous, newStatus));
    }
}

public record OrderStatusChangedEventArgs(Guid OrderId, OrderStatus Previous, OrderStatus New);

// Synchronous UI subscriber
public class StatusBadge
{
    public string Text { get; private set; } = "Pending";

    public void Subscribe(Order order) =>
        order.StatusChanged += (_, e) => Text = e.New.ToString();
}

// Approach 2: awaitable observers discovered through DI
public interface IOrderStatusObserver
{
    Task OnStatusChangedAsync(Order order, OrderStatus previous, OrderStatus current);
}

public class EmailNotifier(IEmailService email) : IOrderStatusObserver
{
    public Task OnStatusChangedAsync(Order order, OrderStatus previous, OrderStatus current) =>
        email.SendStatusUpdateAsync(order.Customer.Email, order.Id, current);
}

public class AnalyticsTracker(IAnalyticsService analytics) : IOrderStatusObserver
{
    public Task OnStatusChangedAsync(Order order, OrderStatus previous, OrderStatus current) =>
        analytics.TrackStatusChangeAsync(order.Id, current);
}

public class PushNotifier(IPushService push) : IOrderStatusObserver
{
    public Task OnStatusChangedAsync(Order order, OrderStatus previous, OrderStatus current) =>
        push.SendAsync(order.Customer.DeviceToken, $"Order {order.Id}: {current}");
}

public class OrderStatusService(IEnumerable<IOrderStatusObserver> observers)
{
    public async Task UpdateStatusAsync(Order order, OrderStatus newStatus)
    {
        var previous = order.Status;
        order.UpdateStatus(newStatus);
        await Task.WhenAll(
            observers.Select(o => o.OnStatusChangedAsync(order, previous, newStatus)));
    }
}

// DI registration for explicit observer approach
builder.Services.AddScoped<IOrderStatusObserver, EmailNotifier>();
builder.Services.AddScoped<IOrderStatusObserver, AnalyticsTracker>();
// ✅ Adding push notifications = register new observer, zero code changes
builder.Services.AddScoped<IOrderStatusObserver, PushNotifier>();
```

A push subscriber is registered alongside the others. The publisher contract does not change.

# Events and Observable APIs in .NET

**C# `event` / `delegate`** supplies the language-native subscription list. `button.Click += handler` registers a callback and `-=` removes it.

**`IObservable<T>` / `IObserver<T>`** model push streams through `OnNext`, `OnError`, and `OnCompleted`. Reactive Extensions builds composition operators over that protocol.

**`INotifyPropertyChanged`** lets binding infrastructure observe ViewModel property changes without the ViewModel knowing which controls display them.

**`ObservableCollection<T>`** raises `CollectionChanged` after mutations. UI collection views subscribe and update their projection.

**`IChangeToken` / `ChangeToken.OnChange()`** exposes one-shot change notifications, including configuration reload signals.

# Pitfalls

**Unsubscribed event handlers.** A long-lived publisher retains its delegate targets. A closed view can stay alive because its handler is still attached to a surviving ViewModel. The handler is removed when its owning lifetime ends; a weak-event mechanism is the fallback where that ownership cannot be aligned.

**One observer breaks the notification loop.** A synchronous event invocation stops when a handler throws. Explicit async observers can isolate failures or aggregate them with `Task.WhenAll`, but the policy must say whether one subscriber may fail the whole operation.

**Hidden ordering dependencies.** `Task.WhenAll` starts independent observers together and gives no completion order. When `WarehouseNotifier` must finish before `ShippingNotifier`, an explicit workflow or chain awaits the observers sequentially.

# Tradeoffs

| Concern | C# `event` | DI-discovered observers |
|---|---|---|
| Async support | Awkward (`async void` or fire-and-forget) | Natural (`Task`-returning interface) |
| Error handling | Exceptions propagate to publisher | Can wrap each observer independently |
| Subscriber discovery | Manual registration | DI container can inject all implementations |
| Completion order | Invocation-list order for synchronous handlers | None with `Task.WhenAll`. A sequential awaited loop preserves order when it matters |
| Lifetime and removal | Must hold the handler delegate and unsubscribe | Governed by DI registration and the containing scope |

C# events fit synchronous UI notifications. Server-side async subscribers need a `Task`-returning interface so completion and failure remain observable. `IObservable<T>` with Rx becomes worthwhile when the event stream itself needs composition over time.

# Questions

> [!qard]- What is the Observer pattern?
> The Observer pattern defines a one-to-many relationship: a publisher keeps a list of independently registered subscribers and notifies all of them when its state changes. The publisher depends only on a notification contract, not on the subscribers' concrete types, so a subscriber can be added or removed without changing the publisher.
> 
> - **Publisher (subject):** owns the changing state, keeps the subscription list and sends the notifications.
> - **Subscribers (observers):** register through the contract and decide how to react.
> - **Notification contract:** a callback signature or interface, such as an order's `StatusChanged` event or an `IOrderStatusObserver` interface.
> 
> C# events provide this directly: `+=` subscribes a handler, `-=` removes it, and raising the event invokes the handlers currently subscribed. Event handlers are invoked synchronously, so asynchronous server-side subscribers fit better behind a `Task`-returning interface that keeps their completion and failures observable.
> 
> [.NET events](https://learn.microsoft.com/en-us/dotnet/standard/events/) · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Observer#Solution|Observer implementation]] · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Observer#Events and Observable APIs in .NET|Events and observable APIs in .NET]]

<!-- qard-id: 83b4f765-ae00-4359-8df6-6cc015fa3cd6 -->
> [!qard]- How should event subscriptions be managed to avoid retaining subscribers after their lifetime ends?
> Each subscription needs an owner that removes it when the subscriber's lifetime ends, usually the component that added it. Weak events are a fallback when a longer-lived publisher has no clear owner to unsubscribe.
> 
> **Why retention happens:** subscribing stores a delegate in the publisher, and that delegate usually references the subscriber. While the publisher stays reachable, so does the subscriber. This becomes a leak when the publisher outlives the subscriber, such as a closed view whose handler is still attached to a surviving view model.
> 
> - **Explicit ownership:** the component that subscribes with `+=` unsubscribes with `-=` when its lifetime ends, such as when a view closes or the subscriber is disposed.
> - **Keeping the handler:** unsubscribing needs the same delegate that was added, so a lambda handler has to be stored if it will be removed later.
> - **Weak events:** the publisher's reference no longer keeps the subscriber alive, so no unsubscribe owner is required. The extra machinery is worthwhile only when ownership cannot be aligned with the subscriber's lifetime.
> 
> When an owner exists, explicit unsubscription is simpler and more predictable.
> 
> [.NET events](https://learn.microsoft.com/en-us/dotnet/standard/events/) · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Observer#Pitfalls|Observer pitfalls]] · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Observer#Tradeoffs|Observer tradeoffs]]

# References

- [Observer pattern](https://refactoring.guru/design-patterns/observer)
- [Observer Pattern — Christopher Okhravi](https://www.youtube.com/watch?v=_BpmfnqjgzQ&list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc&index=2)
