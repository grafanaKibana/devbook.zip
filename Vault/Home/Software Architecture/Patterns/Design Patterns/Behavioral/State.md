---
topic: [Software Architecture]
subtopic: [Patterns]
summary: "Extracts state-specific behavior into separate classes. The context delegates to its current state, which drives transitions."
level: ["3"]
priority: High
status: Done
publish: true
qard-deck: "Software Architecture"
qard-topic: "Patterns/Design Patterns/Behavioral/State"
flashcard_uid: "79f8c824"
created: "2026-03-05T22:12:46.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

A vending machine responds to the same button differently while idle, holding credit, or out of stock. The input stays the same. Its current state decides what the input means.

The State pattern moves state-dependent behavior into objects that share one interface. A context such as `Order` holds its current state and delegates operations to it. Replacing `PendingState` with `PaidState` changes how `Ship()` behaves without spreading a status switch across every operation. Transitions may be initiated by the context or by a state object. The important boundary is that callers ask for domain operations instead of setting state directly. C# compiler-generated `IAsyncStateMachine` types use the same broad idea—saved state determines where `MoveNext()` resumes—though their generated switch is an implementation technique rather than a textbook object-oriented State hierarchy.

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Paid : Payment confirmed
    Pending --> Cancelled : Customer cancels
    Paid --> Shipped : Warehouse dispatches
    Paid --> Cancelled : Refund before shipping
    Shipped --> Delivered : Carrier confirms
    Delivered --> Returned : Return window open
```

> [!NOTE] State vs Strategy
> The class diagrams can look alike, but the reasons for change differ. State represents an internal mode and its valid transitions. [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Strategy|Strategy]] represents a replaceable algorithm, usually selected from outside the context.

# Problem

`Order.Ship()`, `Order.Cancel()`, `Order.Refund()` each have a massive switch on `Status` — scattered validation, easy to miss a transition:

```csharp
public class Order
{
    public OrderStatus Status { get; private set; } = OrderStatus.Pending;

    // ⚠️ Every method repeats the same switch — adding a new status means editing all methods
    public void Ship()
    {
        switch (Status)
        {
            case OrderStatus.Paid:
                Status = OrderStatus.Shipped;
                break;
            case OrderStatus.Pending:
                throw new InvalidOperationException("Cannot ship unpaid order");
            case OrderStatus.Shipped:
                throw new InvalidOperationException("Order already shipped");
            case OrderStatus.Delivered:
                throw new InvalidOperationException("Order already delivered");
            case OrderStatus.Cancelled:
                throw new InvalidOperationException("Cannot ship cancelled order");
            // ⚠️ Adding OrderStatus.OnHold requires editing Ship(), Cancel(), Refund(), Deliver()
        }
    }

    public void Cancel()
    {
        switch (Status) // ⚠️ same switch, different transitions
        {
            case OrderStatus.Pending:
            case OrderStatus.Paid:
                Status = OrderStatus.Cancelled;
                break;
            case OrderStatus.Shipped:
                throw new InvalidOperationException("Cannot cancel shipped order — use return");
            // ...
        }
    }
}
```

Adding `OrderStatus.OnHold` means finding every operation that switches on status. Missing one leaves an inconsistent transition rule.

# Solution

Each state becomes a class that knows its valid transitions:

```csharp
// State interface — defines all operations the order can perform
public interface IOrderState
{
    void Pay(Order order);
    void Ship(Order order);
    void Deliver(Order order);
    void Cancel(Order order);
    void Return(Order order);
    string StatusName { get; }
}

// Concrete states — each knows only its own valid transitions
public class PendingState : IOrderState
{
    public string StatusName => "Pending";

    public void Pay(Order order) => order.TransitionTo(new PaidState()); // ✅ valid transition
    public void Ship(Order order) => throw new InvalidOperationException("Pay first");
    public void Deliver(Order order) => throw new InvalidOperationException("Pay and ship first");
    public void Cancel(Order order) => order.TransitionTo(new CancelledState()); // ✅ valid
    public void Return(Order order) => throw new InvalidOperationException("Order not yet delivered");
}

public class PaidState : IOrderState
{
    public string StatusName => "Paid";

    public void Pay(Order order) => throw new InvalidOperationException("Already paid");
    public void Ship(Order order) => order.TransitionTo(new ShippedState()); // ✅ valid
    public void Deliver(Order order) => throw new InvalidOperationException("Ship first");
    public void Cancel(Order order) => order.TransitionTo(new CancelledState()); // ✅ valid (with refund)
    public void Return(Order order) => throw new InvalidOperationException("Not yet delivered");
}

public class ShippedState : IOrderState
{
    public string StatusName => "Shipped";

    public void Pay(Order order) => throw new InvalidOperationException("Already paid");
    public void Ship(Order order) => throw new InvalidOperationException("Already shipped");
    public void Deliver(Order order) => order.TransitionTo(new DeliveredState()); // ✅ valid
    public void Cancel(Order order) => throw new InvalidOperationException("Use return process");
    public void Return(Order order) => throw new InvalidOperationException("Not yet delivered");
}

public class DeliveredState : IOrderState
{
    public string StatusName => "Delivered";

    public void Pay(Order order) => throw new InvalidOperationException("Already paid");
    public void Ship(Order order) => throw new InvalidOperationException("Already delivered");
    public void Deliver(Order order) => throw new InvalidOperationException("Already delivered");
    public void Cancel(Order order) => throw new InvalidOperationException("Use return process");
    public void Return(Order order) => order.TransitionTo(new ReturnedState()); // ✅ valid
}

// CancelledState and ReturnedState are omitted; they reject or define any later transitions.

// Adding OnHoldState = one new class plus edits to states that transition to or from it
public class OnHoldState : IOrderState
{
    public string StatusName => "OnHold";

    public void Pay(Order order) => throw new InvalidOperationException("Resolve hold first");
    public void Ship(Order order) => throw new InvalidOperationException("Resolve hold first");
    public void Deliver(Order order) => throw new InvalidOperationException("Resolve hold first");
    public void Cancel(Order order) => order.TransitionTo(new CancelledState());
    public void Return(Order order) => throw new InvalidOperationException("Not yet delivered");
}

// Context — delegates to current state
public class Order
{
    private IOrderState _state = new PendingState();

    public string Status => _state.StatusName;

    internal void TransitionTo(IOrderState newState)
    {
        _state = newState;
        // ✅ Raise event, log transition, etc.
    }

    // ✅ Delegates to state — no switch statements
    public void Pay() => _state.Pay(this);
    public void Ship() => _state.Ship(this);
    public void Deliver() => _state.Deliver(this);
    public void Cancel() => _state.Cancel(this);
    public void Return() => _state.Return(this);
}
```

`OnHoldState` localizes the new behavior. Existing states still need edits if they gain transitions to or from the new state, so the pattern does not eliminate all change. It keeps each change near the state that owns it.

# Familiar state machines

**Compiler-generated `IAsyncStateMachine`** stores a numeric state and resumes `MoveNext()` at the corresponding continuation point. It demonstrates state-driven control flow, but it does so with generated fields and branching rather than interchangeable state objects.

**Circuit breakers** move among closed, open, and half-open modes. The same execution request is admitted, rejected, or used as a probe according to the current mode and transition policy.

**`TaskStatus`** exposes a task's lifecycle state. It is an enum-backed state machine, which is often the better design when the transition table is small and behavior does not warrant separate classes.

# Pitfalls

**State explosion.** Ten states behind an eight-method interface can produce 80 method bodies, many of which only reject an operation. A default base state can centralize rejection, while a library such as `Stateless` can express a transition-heavy machine as a table.

**Incomplete transition effects.** Changing `Paid` to `Cancelled` without arranging the refund creates a valid-looking state with broken business meaning. The transition boundary must define whether effects complete atomically, run through an outbox, or leave the machine in an intermediate state.

**Persistence coupling.** A stable state identifier is persisted, and behavior is reconstructed from it after loading. Serializing concrete state objects ties stored data to the class hierarchy and makes refactoring much harder.

# Tradeoffs

| Concern | State pattern | Enum + switch |
|---|---|---|
| Adding a new state | Add one class, then edit existing states whose transitions reference it | Edit every switch that handles the state |
| Adding a new operation | Add method to interface + all state classes | Add one method with a switch |
| Valid transition enforcement | Each state class defines its own | Switch in each method |
| Complexity | Many small classes | Few large methods |
| Readability | State behavior is localized | All behavior in one class |

State earns its classes when state-dependent rules are scattered across several operations and each mode owns meaningful behavior. A compact enum and one transition function remain easier to audit for a small machine. `Stateless` is useful when the transition table matters more than rich behavior inside each state.

# Questions

> [!qard]- What is the State pattern?
> The State pattern moves state-dependent behavior into separate state objects that share one interface. A context object holds its current state and delegates each operation to it, so replacing the state object changes how the same operation behaves.
>
> For example, `Order.Ship()` delegates to the order's current state:
>
> - `PendingState` rejects the call because the order is unpaid.
> - `PaidState` transitions the order to `ShippedState`.
> - `ShippedState` rejects the call because the order has already shipped.
> 
> In this example, each state decides which transitions it allows. That ownership is a design choice: either the context or a concrete state may decide which state comes next and when. In both forms, callers request domain operations such as `Pay()` or `Ship()` instead of setting a status directly.
>
> The pattern replaces the same `switch` on a status repeated across many operations. A new state becomes one new class, plus edits wherever transitions to or from it are defined. The cost is many small classes, and a new operation must be implemented in every state. A small machine with few state-dependent rules is often clearer as an enum with one transition function.
>
> [Gamma et al.: Design Patterns, State chapter](https://cs.gonzaga.edu/faculty/crandall/misc/GoF.pdf) · [MSDN Magazine: Solidify your C# application architecture with design patterns](https://learn.microsoft.com/en-us/archive/msdn-magazine/2001/july/design-patterns-solidify-your-csharp-application-architecture-with-design-patterns) · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/State#Solution|State pattern implementation]] · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/State#Tradeoffs|State tradeoffs]]

<!-- qard-id: 1c479114-9836-446c-88c8-e0ea73be8a6e -->
> [!qard]- How does a compiler-generated async state machine relate to the State pattern?
> Both let stored state decide what happens next, but the async state machine is a compiler implementation technique, not the GoF State pattern.
>
> | Aspect | Compiler-generated async state machine | GoF State pattern |
> |---|---|---|
> | What the state means | Where the method paused, meaning which incomplete `await` it is waiting on. | The object's current mode in the domain, such as `Pending` or `Paid`. |
> | How state is stored | A generated state field, plus fields for the locals that must survive the `await`. | The context holds a reference to a state object that implements a shared interface. |
> | How behavior changes | When the awaited operation completes, its continuation calls `MoveNext()`, which branches on the state field and resumes after that `await`. | The context delegates each operation to its current state object; replacing that object changes behavior. |
> | Who designs it | The compiler generates it from an `async` method. | Developers design the state classes and the transitions between them. |
>
> The async machine therefore shows state-driven control flow built from generated fields and branching, not from interchangeable state objects.
>
> [C#: async scenarios](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios) · [Stephen Toub: How Async/Await Really Works in C#](https://devblogs.microsoft.com/dotnet/how-async-await-really-works/) · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/State#Familiar state machines|Familiar state machines]] · [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/State#Solution|State pattern implementation]]

# References

- [State pattern](https://refactoring.guru/design-patterns/state)
- [State Pattern — Christopher Okhravi](https://www.youtube.com/watch?v=N12L5D78MAA&list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc&index=17)
- [Async/await state machine — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/task-asynchronous-programming-model)
- [Stateless — declarative state machine library for .NET](https://github.com/dotnet-state-machine/stateless)
