---
topic: [Software Architecture]
subtopic: [Patterns]
summary: "Encapsulates a request as an object bundling action, parameters, and receiver, so it can be queued, logged, undone, and replayed."
level: ["2"]
priority: High
status: Done
publish: true
qard-deck: "Software Architecture"
qard-topic: "Patterns/Design Patterns/Behavioral/Command"
flashcard_uid: "dd0e4ff8"
created: "2026-03-05T22:12:46.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

A restaurant ticket is a command in paper form. It records the requested meal, waits in the kitchen queue, and tells the chef what to prepare. The waiter does not cook and the chef does not take the order. The ticket keeps the request separate from its execution.

The Command pattern represents a request as an object containing the action and its input. An invoker calls `Execute()` without knowing the receiver or the implementation. Once a request has object identity, it can enter a queue, an audit log, or a retry policy. Some commands also carry enough state to undo or compensate for the operation.

```mermaid
sequenceDiagram
    participant Client
    participant Invoker as Command Queue
    participant Command as PlaceOrderCommand
    participant Receiver as OrderService
    Client->>Command: Create with order data
    Client->>Invoker: Submit command
    Invoker->>Command: Execute
    Command->>Receiver: Process order
    Receiver-->>Command: Result
    Note over Invoker: Can also Undo or Retry
```

> [!NOTE] Command vs Strategy
> **Command** represents work to perform, including the input needed for that invocation. [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Strategy]] represents an interchangeable way to perform a kind of work. A `PlaceOrderCommand` carries one order request. A `ShippingCostStrategy` supplies a reusable calculation.

# Problem

`OrderService` exposes operations directly. There is no object to queue, record, or place in an undo history:

```csharp
public class OrderService
{
    // ⚠️ No undo — once placed, can't roll back without a separate cancel call
    public async Task PlaceOrderAsync(Order order)
    {
        await _repository.SaveAsync(order);
        await _inventory.ReserveAsync(order.Items);
        await _payment.ChargeAsync(order.Total, order.Customer.PaymentMethod);
    }

    // ⚠️ No record of who cancelled, when, or why
    public async Task CancelOrderAsync(Guid orderId)
    {
        var order = await _repository.GetAsync(orderId);
        order.Status = OrderStatus.Cancelled;
        await _repository.UpdateAsync(order);
        await _inventory.ReleaseAsync(order.Items);
        await _payment.RefundAsync(order.PaymentTransactionId, order.Total);
    }

    // ⚠️ Retry logic scattered — if refund fails, caller must retry manually
    public async Task RefundOrderAsync(Guid orderId, decimal amount) { /* ... */ }
}
```

An "undo last action" feature needs both the executed request and its reversal. The service calls leave neither behind.

# Solution

Each operation becomes a command with `ExecuteAsync()` and, where meaningful, `UndoAsync()`:

```csharp
// Command interface
public interface IOrderCommand
{
    Task ExecuteAsync();
    Task UndoAsync();
    string Description { get; } // for audit trail
}

// Concrete commands
public class PlaceOrderCommand(
    Order order,
    IOrderRepository repository,
    IInventoryService inventory,
    IPaymentService payment) : IOrderCommand
{
    private string? _transactionId;

    public string Description => $"Place order #{order.Id} for {order.Total:C}";

    public async Task ExecuteAsync()
    {
        await repository.SaveAsync(order);
        await inventory.ReserveAsync(order.Items);
        _transactionId = await payment.ChargeAsync(order.Total, order.Customer.PaymentMethod);
        order.Status = OrderStatus.Paid;
        await repository.UpdateAsync(order);
    }

    public async Task UndoAsync()
    {
        // ✅ Undo knows exactly what to reverse
        if (_transactionId is not null)
            await payment.RefundAsync(_transactionId, order.Total);
        await inventory.ReleaseAsync(order.Items);
        order.Status = OrderStatus.Cancelled;
        await repository.UpdateAsync(order);
    }
}

public class CancelOrderCommand(
    Guid orderId,
    string reason,
    IOrderRepository repository,
    IInventoryService inventory,
    IPaymentService payment) : IOrderCommand
{
    private Order? _cancelledOrder;

    public string Description => $"Cancel order #{orderId}: {reason}";

    public async Task ExecuteAsync()
    {
        _cancelledOrder = await repository.GetAsync(orderId);
        _cancelledOrder.Status = OrderStatus.Cancelled;
        _cancelledOrder.CancellationReason = reason;
        await repository.UpdateAsync(_cancelledOrder);
        await inventory.ReleaseAsync(_cancelledOrder.Items);
        await payment.RefundAsync(_cancelledOrder.PaymentTransactionId, _cancelledOrder.Total);
    }

    public async Task UndoAsync()
    {
        if (_cancelledOrder is null) return;
        _cancelledOrder.Status = OrderStatus.PaymentPending;
        await repository.UpdateAsync(_cancelledOrder);
        await inventory.ReserveAsync(_cancelledOrder.Items);
        // The refund already completed; a successful new charge can move the order to Paid.
    }
}

// In-memory invoker for one UI session; it is not a durable workflow engine
public class OrderCommandInvoker
{
    private readonly Stack<IOrderCommand> _history = new();
    private readonly ICommandAuditLog _auditLog;

    public OrderCommandInvoker(ICommandAuditLog auditLog) => _auditLog = auditLog;

    public async Task ExecuteAsync(IOrderCommand command)
    {
        await command.ExecuteAsync();
        _history.Push(command);
        await _auditLog.RecordAsync(command.Description, DateTime.UtcNow); // ✅ automatic audit trail
    }

    public async Task UndoLastAsync()
    {
        if (_history.TryPeek(out var command))
        {
            await command.UndoAsync();
            await _auditLog.RecordAsync($"UNDO: {command.Description}", DateTime.UtcNow);
            _history.Pop();
        }
    }
}

// Usage
var placeCommand = new PlaceOrderCommand(order, repository, inventory, payment);
await invoker.ExecuteAsync(placeCommand);

// Customer service agent undoes the last action
await invoker.UndoLastAsync();
```

A `PartialRefundCommand` can use the same invoker and audit path. Only its execution and compensation rules are new.

This in-memory history fits a local UI action whose execution and undo each complete as one owned operation. Command represents a request; it does not make the save, inventory reservation, charge, or audit write atomic. A production workflow with partial external effects needs durable command state, stable idempotency keys, and saga-style compensation or forward recovery. An outbox makes the resulting messages durable. Recovery must record progress before executing the next side effect, because a failure before `_history.Push` leaves this sketch with nothing to undo.

# Commands in UI, Messaging, and Data Access

**`ICommand` (WPF/MAUI)** exposes `Execute(parameter)` and `CanExecute(parameter)`. A bound button knows when it may invoke the command, but it does not know the operation behind it.

**MediatR `IRequest<T>` with a handler** separates request data from execution. `PlaceOrderCommand` carries intent and the handler performs the work. The mediator supplies dispatch.

**`IDbCommand` / `SqlCommand`** packages a SQL statement with its parameters and connection. Execution can be delayed until the caller chooses to run it.

**`Action<T>` / `Func<T>` delegates** are lightweight commands when a named type, serialization, and undo are unnecessary. `Task.Run(() => ProcessOrder(order))` queues behavior together with captured input.

# Questions

> [!qard]- What is the Command pattern?
> The Command pattern turns a request into an object that holds the action to perform and the input it needs. An invoker triggers the command, typically through an `Execute` method, without knowing which object does the work or how.
>
> - **Command:** an object such as `PlaceOrderCommand` that carries the request data and knows which receiver to call.
> - **Receiver:** the object that actually performs the work, such as an `OrderService`.
> - **Invoker:** the code that calls `Execute`, such as a button, a queue or a scheduler.
> - **Client:** creates the command and passes it to the invoker.
> 
> A restaurant ticket works the same way: it records the order, waits in the kitchen queue and tells the chef what to cook, so the waiter never cooks and the chef never takes orders.
>
> Because the request becomes an object, it can be queued, logged, retried or delayed, and a command that records enough state can also undo or compensate for its effect. Wrapping a request in an object does not make its side effects atomic or durable. An in-memory undo history disappears with the process, and steps with external effects still need durable state, idempotency keys and compensation. A plain delegate such as `Action` is enough when naming, serialization and undo are not needed.
>
> [GoF: Design Patterns](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/) · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Command#Solution|Command: solution and limits]] · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Command#Commands in UI, Messaging, and Data Access|Command: delegates and .NET examples]]

<!-- qard-id: 559a25cf-a9b0-4267-850e-0575572aa65b -->
> [!qard]- How does MediatR implement the Command pattern, and what does it add?
> MediatR represents a command as a request object that carries the operation's data, and `Send` dispatches it to the one handler registered for that request type. It splits classic Command into parts: the request holds the data, the handler holds the execution logic that a classic command would put in `Execute`, and the mediator acts as the invoker that finds the right handler.
>
> What it adds:
>
> - **Decoupled callers:** a controller or other sender depends only on the mediator and the request type, not on the handler or the services the handler uses.
> - **Pipeline behaviors:** shared policies such as validation or logging wrap every handler call without being repeated in each handler.
> 
> The cost is indirection: following a call from sender to handler requires knowing the registrations. A direct service call stays clearer for one small, fixed interaction. MediatR is one way to realize a command-style design, not a requirement of the Command pattern.
>
> [MediatR: behaviors](https://github.com/LuckyPennySoftware/MediatR/wiki/Behaviors) · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Command#Commands in UI, Messaging, and Data Access|Command: MediatR request and handler]]

# References

- [Command pattern](https://refactoring.guru/design-patterns/command)
- [Command Pattern — Christopher Okhravi](https://www.youtube.com/watch?v=9qA5kw8dcSU&list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc&index=7)
