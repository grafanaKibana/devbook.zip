---
topic:
  - Development Practices
subtopic:
  - Paradigms
summary: "OOP models a system as interacting objects that combine state and behaviour via encapsulation, abstraction, inheritance, and polymorphism."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Object-Oriented Programming (OOP)

OOP is a programming paradigm where a system is modeled as interacting objects that combine state (fields) and behavior (methods). The four pillars — encapsulation, abstraction, inheritance, and polymorphism — are tools for managing complexity, not goals in themselves. Each pillar solves a specific problem: encapsulation prevents invalid state, abstraction hides irrelevant detail, inheritance reuses shared behavior across related types, and polymorphism replaces many type-based conditionals with dispatch.

## The Four Pillars

### Encapsulation

Hide internal state behind a controlled API so callers cannot put the object into an invalid state. The mechanism: access modifiers control visibility, and properties/methods enforce invariants at every mutation point.

C# access modifiers — what each controls:

| Modifier | Visible To | Typical Use |
|---|---|---|
| `private` | Same class only | Fields, helper methods — default for state |
| `protected` | Same class + derived classes | Extension points in base classes |
| `internal` | Same assembly | Implementation details shared within a library |
| `protected internal` | Same assembly OR derived classes | Rarely needed — wider than most designs require |
| `private protected` | Derived classes in same assembly only | Framework extension points not for external consumers |
| `public` | Everyone | The contract — what callers depend on |

Fields are `private` by default. Expose state through read-only properties or methods that validate transitions — never a public setter on state that has invariants.

```csharp
public class BankAccount
{
    private decimal _balance;
    public decimal Balance => _balance; // read-only — callers observe, never mutate directly

    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new ArgumentException("Amount must be positive.");
        _balance += amount;
    }

    public void Withdraw(decimal amount)
    {
        if (amount <= 0) throw new ArgumentException("Amount must be positive.");
        if (amount > _balance) throw new InvalidOperationException("Insufficient funds.");
        _balance -= amount;
    }
    // Invariant: balance is never negative — enforced here, not scattered across callers
}
```

In practice, encapsulation decides who controls transitions. In the [[Composite]] pattern, `DirectoryItem._children` is a `private List` exposed through a read-only view (e.g., `_children.AsReadOnly()` returning `ReadOnlyCollection<T>`) — callers read the tree but cannot bypass `Add()`/`Remove()` and break structural invariants. Returning the raw list typed as `IReadOnlyList<T>` is weaker: a caller can downcast back to `List<T>` and mutate it, so prefer wrapping or copying. In [[State]], `Robot.State` uses `protected set` so only the robot and its state objects control transitions — external code cannot force an invalid state.

### Abstraction

Model only the contract a caller needs and hide everything else behind that boundary. In C#, the two primary tools are **interfaces** and **abstract classes**.

**Interfaces** define a contract — what operations exist — without instance state. Since C# 8, interfaces can include default method implementations, but they still cannot hold per-instance fields. A class can implement multiple interfaces. Use interfaces when unrelated types share a capability.

```csharp
public interface IMovementStrategy
{
    List<Position> FindPath(Position from, Position to, Restaurant layout);
}
// AStarMovement, WaypointMovement, DirectMovement all implement this
// They typically share no implementation — only the contract
```

**Abstract classes** define a contract plus shared implementation. Derived classes inherit the common behavior and override specific steps. Use abstract classes when related types share invariants and implementation.

```csharp
public abstract class Robot : IMovable
{
    private readonly Restaurant _restaurant;

    public Position CurrentPosition { get; protected set; }
    protected IMovementStrategy MovementStrategy { get; }

    protected Robot(Restaurant restaurant, IMovementStrategy movementStrategy)
    {
        _restaurant = restaurant;
        MovementStrategy = movementStrategy;
    }

    // Shared implementation — all robots move the same way
    public void MoveTo(Position destination)
    {
        var path = MovementStrategy.FindPath(CurrentPosition, destination, _restaurant);
        foreach (var step in path) CurrentPosition = step;
    }

    // Subclass-specific — each robot type handles tasks differently
    public abstract void PerformTask(RobotTask task);
}
```

When to use which:

| Use | When | Example |
|---|---|---|
| Interface | Unrelated types share a capability | `IOrderTaker` — both a WaiterRobot and a future HumanWaiter could implement it |
| Abstract class | Related types share implementation + invariants | `Robot` base — all robots share movement, position, and state tracking |
| Both together | Base class implements interface, subclasses specialize | `Robot : IMovable` — interface for external consumers, abstract class for the hierarchy |

The abstraction boundary is what makes [[SOLID|Dependency Inversion]] work: `RobotDispatcher` depends on `Robot` (abstraction), never on `WaiterRobot` or `CleanerRobot` (details). Swap implementations without touching consumers.

### Inheritance

Derive a new type from an existing one to reuse and extend behavior. The CLR mechanism: each class has a method table with virtual slots mapping to implementations. When a derived class uses `override`, it replaces the slot entry — callers dispatching through the base type get the derived behavior automatically. Interface dispatch uses a separate interface map to resolve calls. The JIT may devirtualize calls when it can prove the concrete type at compile time, eliminating the dispatch overhead.

Keywords involved in polymorphic dispatch and member binding:

```csharp
public class Base
{
    public virtual void Process() => Console.WriteLine("Base");
    public void Helper() => Console.WriteLine("Base helper");
}

public class Derived : Base
{
    public override void Process() => Console.WriteLine("Derived"); // replaces method table slot
    public new void Helper() => Console.WriteLine("Derived helper"); // hides — does NOT replace
}

Base obj = new Derived();
obj.Process(); // "Derived" — virtual dispatch through method table
obj.Helper();  // "Base helper" — non-virtual, resolved at compile time
```

| Keyword | Effect | When to Use |
|---|---|---|
| `virtual` | Declares the method can be overridden | Stable extension points ([[Template Method]] hooks) |
| `override` | Replaces the base implementation in the method table | Specializing behavior while honoring the base contract |
| `new` | Hides the base member — compile-time binding to the declaring type | Almost never — breaks polymorphic expectations and surprises callers |
| `sealed` | On a class: prevents derivation. On an override: prevents further overriding | When the class or method is not designed for extension |

**Inheritance vs Composition** — the core OOD design decision. Inheritance creates an "is-a" relationship with tight coupling: derived classes depend on the base's implementation, not just its contract. A change to a base method can silently break subclasses (fragile base class problem). Composition creates a "has-a" relationship: the object delegates to a collaborator through an interface, swappable without touching the owner.

```csharp
// Inheritance: WaiterRobot IS-A Robot — shared invariants justify the hierarchy
public class WaiterRobot : Robot, IOrderTaker, IDeliverer { }

// Composition: Robot HAS-A movement strategy — varies independently
public abstract class Robot
{
    protected IMovementStrategy MovementStrategy { get; } // injected, swappable
}

// Anti-pattern: Robot IS-A AStarPathfinder — hard-codes pathfinding dependency
public class Robot : AStarPathfinder { } // can't swap algorithms without changing the type hierarchy
```

**Heuristic**: if you override methods to make them no-ops or to fundamentally change base behavior, you chose inheritance when composition fits better. Prefer 1–2 levels of depth; go deeper only when every level adds genuine shared invariants (e.g., ASP.NET's `Controller` → `ControllerBase`).

### Polymorphism

Call a method on a base type or interface and get behavior determined by the runtime type. This is the mechanism that makes [[Strategy]], [[State]], [[Template Method]], and every interface-based design work.

**Runtime polymorphism** — resolved at runtime through the method table or interface dispatch map:

```csharp
Robot robot = GetNextIdleRobot(); // could be WaiterRobot or CleanerRobot
robot.PerformTask(task);          // dispatches to the actual type's implementation

IMovementStrategy strategy = new AStarMovement();
strategy.FindPath(from, to, layout); // interface dispatch — resolved at runtime
```

**Compile-time polymorphism** — statically selected (no runtime dispatch involved in the selection):

```csharp
// Method overloading — compiler picks the overload by argument types
public void Log(string message) { /* text only */ }
public void Log(string message, Exception ex) { /* text + stack trace */ }

// Generics — type parameters resolved at compile time; JIT specializes per value type at runtime
public T Max<T>(T a, T b) where T : IComparable<T>
    => a.CompareTo(b) >= 0 ? a : b;
```

**Why polymorphism replaces type-based conditionals**: without it, behavior that varies by type requires if/switch chains that grow with every new type — a direct Open/Closed violation.

```csharp
// Without polymorphism — editing existing code for every new type
decimal discount = customer.Type switch
{
    "Premium" => order.Total * 0.2m,
    "Employee" => order.Total * 0.3m,
    "VIP" => order.Total * 0.4m, // added later — modified existing code
    _ => 0m
};

// With polymorphism — new type = new class, zero changes to existing code
public interface IDiscountStrategy { decimal Calculate(Order order); }
decimal discount = discountStrategy.Calculate(order); // runtime dispatches
```

[[Strategy]], [[State]], and [[Template Method]] all exist to convert conditional logic into polymorphic dispatch. The caller works with `IEnumerable<IPaymentGateway>` and calls `ChargeAsync()` — the runtime routes to Stripe or PayPal without the caller knowing which.

## Pitfalls

**Deep inheritance hierarchies** — each level of inheritance adds coupling. Common failure mode: a payment processing system with `PaymentBase` → `CardPayment` → `AuthorizedCardPayment` → `RefundableAuthorizedCardPayment`. Adding retry logic to `PaymentBase.Process()` breaks `RefundableAuthorizedCardPayment` because it overrides `Process()` and assumes a specific call order. Flattening to `IPayment` interface + composition eliminates the fragile coupling. Prefer interfaces and composition; keep hierarchies to 1–2 levels unless every level adds genuine shared invariants.

**Anemic domain model** — objects with only getters/setters and no behavior. All logic lives in service classes. This is procedural programming with OOP syntax — invariants are enforced in service code (scattered, easy to miss), and objects can be put into invalid states. Common failure mode: an `Order` class with public `Status` setter allows any service to set `Status = Shipped` without checking whether payment was confirmed. Moving the transition to `Order.Ship()` with a guard (`if (Status != PaymentConfirmed) throw`) eliminates an entire category of invalid-state bugs.

**Overusing inheritance for code reuse** — inheriting from a class just to reuse a method creates an "is-a" relationship that may not be semantically correct. Example: `EmailNotifier : SmtpClient` just to get `Send()` — now `EmailNotifier` IS an SMTP client and exposes 40+ public methods from `SmtpClient` that callers shouldn't use. Use composition (`EmailNotifier` has an `ISmtpClient` field) or extension methods instead.
## Tradeoffs

| Decision | OOP Approach | Alternative | When OOP Wins | When Alternative Wins |
| --- | --- | --- | --- | --- |
| **State management** | Mutable state encapsulated in objects | Immutable data + pure functions (FP) | Complex domain invariants that must be enforced at every mutation (banking, inventory, workflow engines) | Data transformation pipelines, ETL, event processing where immutability prevents race conditions |
| **Code reuse** | Inheritance (shared base implementation) | Composition + interfaces | Genuine type hierarchies with shared invariants (ASP.NET `Controller` → `ControllerBase`) — limit to 2 levels | Everything else — composition is more flexible, testable, and doesn't create fragile base class coupling |
| **Extensibility** | Virtual methods + override | Strategy/delegate injection | Stable extension points with well-defined contracts (middleware pipelines, template method) | High-variance behavior that changes at runtime or per-request (feature flags, A/B routing) |
| **Testability** | Interface-based DI + mocking | Pure functions (no mocking needed) | Services with external dependencies (DB, HTTP, queues) where mocking isolates the unit under test | Pure computation where input → output is deterministic and mocking adds ceremony for no benefit |

**Decision rule**: use OOP for domain modeling with complex invariants and state transitions (DDD aggregates, workflow engines). Use functional patterns (LINQ, records, pure functions) for data transformation and stateless computation. Most production C# codebases use both — OOP for the domain layer, functional style for the application/infrastructure layers.

## Questions

> [!QUESTION]- When should you prefer composition over inheritance?
> - Prefer composition when the relationship is "has-a" rather than "is-a"
> - Use composition when you need to combine behaviors from multiple sources (C# has no multiple class inheritance)
> - Use composition when the base class is not designed for extension (`sealed` or has complex internal invariants)
> - Inheritance creates tight coupling: a change to the base class can break all derived classes
> - Composition lets you swap implementations at runtime and test components in isolation via interfaces
> - Heuristic: if you override methods to suppress or fundamentally change base behavior, composition fits better
> - Tradeoff: composition requires more explicit wiring (constructor injection, delegation) but buys flexibility and testability; inheritance is less boilerplate but creates coupling that compounds with depth

> [!QUESTION]- What is the Anemic Domain Model and why is it considered an anti-pattern?
> - Objects have only getters/setters with no behavior — all logic lives in service classes
> - Violates encapsulation: services reach into objects to get data, compute, and set results back
> - This is procedural programming with OOP syntax — invariants are enforced in scattered service code
> - Objects can be put into invalid states because there is no guard at the mutation point
> - Fix: move behavior that depends on an object's data into the object itself (Information Expert principle from GRASP)
> - Tradeoff: rich domain models enforce invariants at the source but require more upfront design investment; anemic models are simpler to write initially but accumulate inconsistency bugs as the system grows

> [!QUESTION]- How does polymorphism reduce conditional complexity?
> - Without polymorphism, varying behavior by type requires if/switch chains that grow with every new type
> - Each new type forces editing existing code — a direct Open/Closed violation
> - With polymorphism, each type implements a shared interface and handles its own behavior
> - Adding a new type means adding a new class, not modifying existing code
> - The caller iterates over `IEnumerable<IReportGenerator>` and calls `Generate()` — the runtime dispatches to the correct implementation
> - Tradeoff: polymorphism adds indirection — debugging requires knowing which concrete type is active, and navigating call hierarchies takes extra IDE steps. Worth paying when you have 3+ variant types or expect new types over time

> [!QUESTION]- What is the difference between an interface and an abstract class in C#?
> - Interface: defines a contract without instance state; can include default method implementations (C# 8+); a class can implement many interfaces
> - Abstract class: defines a contract plus shared implementation and instance state; a class can inherit from only one abstract class
> - Use interfaces when unrelated types share a capability (`IDisposable`, `IComparable`)
> - Use abstract classes when related types form a genuine hierarchy with shared invariants
> - In practice, most OOD designs use both: interface for external consumers, abstract class for the internal hierarchy (`Robot : IMovable`)
> - Tradeoff: interfaces are more flexible (no coupling to shared state, multiple implementation) but force every implementer to write the full implementation; abstract classes reduce duplication but create a single coupling point that all derived classes depend on
## References

- [Microsoft — Object-oriented programming in C#](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/oop) — official C# OOP tutorial covering classes, inheritance, interfaces, and polymorphism with runnable examples.
- [Microsoft — Inheritance in C#](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/inheritance) — virtual/override/sealed mechanics, base class constructor chaining, and inheritance design guidelines.
- [Microsoft — Interfaces in C#](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/interfaces) — interface declaration, explicit implementation, default interface methods (C# 8+), and design guidance.
- [Microsoft — Composition over inheritance](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles#prefer-composition-over-inheritance) — .NET architecture guidance explaining when and why to prefer composition over class inheritance.
- [Anemic Domain Model (Martin Fowler)](https://martinfowler.com/bliki/AnemicDomainModel.html) — Fowler's critique of the anti-pattern: why separating data from behavior loses the benefits of OOP and how to fix it.
