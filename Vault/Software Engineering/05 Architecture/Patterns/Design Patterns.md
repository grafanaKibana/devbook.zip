---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "4"
priority: High
status: Ready To Repeat

dg-publish: true
---
# Intro
Design patterns are reusable solutions to recurring object-oriented design problems. They are a shared vocabulary for design intent, not copy-paste code, so teams can discuss tradeoffs quickly and keep systems flexible as requirements change. In interviews, patterns show that you can model change, not only produce a one-off solution. GoF patterns are grouped into Creational (object creation), Structural (type composition), and Behavioral (interaction and responsibility flow).

## Pattern Catalog (Interview Focused)
### Creational
#### Factory Method
Factory Method delegates concrete object creation to a creator abstraction so clients depend on product interfaces.
```csharp
public interface IStartableRobot { void Start(); }
public class WaiterRobot : IStartableRobot { public void Start() { } }
public abstract class RobotCreator { public abstract IStartableRobot CreateRobot(); }
public class WaiterCreator : RobotCreator { public override IStartableRobot CreateRobot() => new WaiterRobot(); }
```
#### Abstract Factory
Abstract Factory creates related object families that should remain compatible.
```csharp
public interface IRobotFamilyFactory
{
    IMovementStrategy CreateMovement();
    ITaskPlanner CreatePlanner();
}
```
#### Builder
Builder constructs complex objects step by step and separates construction logic from the final object.
```csharp
var robot = new RobotBuilder()
    .WithName("R2-Waiter")
    .WithBattery(100)
    .WithMovement(new WheelsMovement())
    .Build();
```
#### Singleton
Singleton provides one shared instance per process (or per DI container singleton lifetime); use carefully for stateless infrastructure.
```csharp
public sealed class RobotRegistry
{
    public static RobotRegistry Instance { get; } = new();
    private RobotRegistry() { }
}
```
### Structural
#### Adapter
Adapter converts one interface into another expected by clients so incompatible components can collaborate.
```csharp
public interface IKitchenNotifier { void Notify(string message); }
public class LegacyPager { public void SendPage(string text) { } }
public class PagerAdapter : IKitchenNotifier
{
    private readonly LegacyPager _pager = new();
    public void Notify(string message) => _pager.SendPage(message);
}
```
#### Decorator
Decorator adds behavior by wrapping an object with the same interface instead of subclassing.
```csharp
public interface IOrderHandler { Task HandleAsync(Order order); }
public class LoggingOrderHandler(IOrderHandler inner) : IOrderHandler
{
    public async Task HandleAsync(Order order) { Console.WriteLine(order.Id); await inner.HandleAsync(order); }
}
```
#### Proxy
Proxy controls access to another object and can add lazy loading, caching, auth, or remote indirection.
```csharp
public class RobotTelemetryProxy : IRobotTelemetry
{
    private readonly IRobotTelemetry _real;
    public RobotTelemetryProxy(IRobotTelemetry real) => _real = real;
    public Task<Telemetry> GetAsync(string id) => _real.GetAsync(id);
}
```
#### Facade
Facade exposes a simpler API over a complex subsystem to align APIs with use cases.
```csharp
public class RestaurantFacade
{
    private readonly KitchenService _kitchen = new();
    private readonly RobotDispatch _robot = new();
    public Task ServeOrderAsync(Order order) => Task.WhenAll(_kitchen.Cook(order), _robot.Dispatch(order));
}
```
### Behavioral
#### Strategy
Strategy encapsulates interchangeable algorithms behind one interface so behavior can vary independently from clients.
```csharp
public interface IMovementStrategy { void MoveTo(Table target); }
public class WheelsMovement : IMovementStrategy { public void MoveTo(Table target) { } }
public class TracksMovement : IMovementStrategy { public void MoveTo(Table target) { } }
```
#### Observer
Observer implements one-to-many notification so publishers and subscribers evolve independently.
```csharp
public class Kitchen
{
    public event Action<Order>? OrderReady;
    public void Complete(Order order) => OrderReady?.Invoke(order);
}
```
#### Template Method
Template Method defines a stable algorithm skeleton while subclasses provide variable steps.
```csharp
public abstract class RobotTask
{
    public void Execute() { Validate(); Perform(); Report(); }
    protected virtual void Validate() { }
    protected abstract void Perform();
    protected virtual void Report() { }
}
```
#### Command
Command packages a request as an object for queueing, retry, logging, and deferred execution.
```csharp
public interface ICommand { Task ExecuteAsync(); }
public class StartCleaningCommand(IRobot robot) : ICommand
{
    public Task ExecuteAsync() => robot.StartCleaningAsync();
}
```
#### Chain of Responsibility
Chain of Responsibility passes a request through handlers until one handles it or the chain ends.
```csharp
public abstract class Handler
{
    public Handler? Next { get; init; }
    public virtual bool Handle(Order o) => Next?.Handle(o) ?? false;
}
```

## Deep Dive: 4 Critical Patterns for Class Design Interviews

### Strategy Pattern
Use Strategy when the algorithm varies independently from clients. In Robot Restaurant, movement behavior (wheels, tracks, flying) varies by robot type while robot workflow stays stable.

```csharp
public interface IMovementStrategy { void MoveTo(Table target); }

public class WheelsMovement : IMovementStrategy
{
    public void MoveTo(Table target) => Console.WriteLine($"Rolling to {target.Number}");
}

public class FlyingMovement : IMovementStrategy
{
    public void MoveTo(Table target) => Console.WriteLine($"Flying to {target.Number}");
}

public class Robot
{
    private readonly IMovementStrategy _movement;
    public Robot(IMovementStrategy movement) => _movement = movement;
    public void Deliver(Table target) => _movement.MoveTo(target);
}
```

Why interviewers like it:
- Add behavior via new strategy classes instead of editing core robot logic.
- Test behavior with fake strategies.
- Shows OCP + DIP in practical class design.

### Observer Pattern
Use Observer for one-to-many notifications where producers should not depend on concrete consumers. In Robot Restaurant, kitchen completion should notify dispatch, UI, and analytics independently.

```csharp
public interface IKitchenObserver { void OnOrderReady(Order order); }

public class Kitchen
{
    private readonly List<IKitchenObserver> _observers = new();
    public void Subscribe(IKitchenObserver observer) => _observers.Add(observer);
    public void Unsubscribe(IKitchenObserver observer) => _observers.Remove(observer);
    public void MarkReady(Order order)
    {
        foreach (var observer in _observers) observer.OnOrderReady(order);
    }
}
```

Why interviewers like it:
- Publisher and subscribers evolve independently.
- New subscribers are added without changing kitchen logic.
- Maps naturally to event-driven design.
In .NET, both `event` and explicit subscriber lists implement Observer. Events are idiomatic and concise; explicit lists expose lifecycle control more directly. The practical tradeoff is subscriber lifecycle management, so long-lived publishers need explicit unsubscribe behavior.

### Factory Method and Abstract Factory
Use Factory Method when a creator decides which concrete product to instantiate. Use Abstract Factory when a whole family of related products must vary together.

```csharp
public interface IRobot { void Serve(Order order); }
public class WaiterRobot(IMovementStrategy movement) : IRobot
{
    public void Serve(Order order) => movement.MoveTo(order.Table);
}

public abstract class RobotCreator
{
    public abstract IRobot CreateRobot();
}

public sealed class WaiterRobotCreator : RobotCreator
{
    public override IRobot CreateRobot() => new WaiterRobot(new WheelsMovement());
}
```

```csharp
public interface IRobotFamilyFactory
{
    IMovementStrategy CreateMovement();
    ITaskPlanner CreatePlanner();
}
```

When to use each:
- Factory Method: one product varies; creator subclasses choose concrete products.
- Abstract Factory: multiple related products vary together by family.

### Template Method
Use Template Method when the high-level algorithm is stable but some steps vary by subtype. In Robot Restaurant, every robot order follows one lifecycle with specialized movement/task steps.

```csharp
public abstract class RobotBase
{
    public void ExecuteOrder(Order order)
    {
        Validate(order);
        Move(order);
        PerformTask(order);
        Report(order);
    }

    protected virtual void Validate(Order order) { }
    protected abstract void Move(Order order);
    protected abstract void PerformTask(Order order);
    protected virtual void Report(Order order) { }
}
```

Why interviewers like it:
- Removes duplicate orchestration code.
- Makes extension points explicit.
- Preserves substitutability when subclasses keep base invariants.

## SOLID Connection
- Strategy supports OCP (new algorithms via new classes) and DIP (depend on `IMovementStrategy`).
- Observer supports OCP because new subscribers are added without modifying publishers.
- Factory patterns support SRP (construction centralized) and DIP (depend on product/factory abstractions).

## Pitfalls
1. Over-engineering simple problems with many patterns can hide intent. This happens when variation is hypothetical; as a heuristic, introduce a pattern once real change pressure appears (often when a second variant appears or the roadmap makes variation certain).
2. Pattern obsession creates abstractions with no immediate consumer, increasing maintenance cost. Tie each pattern to an explicit change scenario and remove speculative layers.
3. Wrong pattern choice adds unnecessary complexity. Example: forcing Template Method for highly variable behavior builds rigid inheritance trees; use Strategy + composition when steps vary independently.
4. Observer with long-lived publishers can leak memory because event subscriptions keep subscribers alive. Always define unsubscribe paths (or weak subscriptions) and verify with memory profiling and heap snapshots that transient listeners are collectible.

## Questions
> [!QUESTION]- What are design patterns and why do we need them?
> Design patterns are proven, repeatable approaches to common design problems (not copy-paste code). They communicate intent, reduce accidental complexity, and improve maintainability through loose coupling.
> Expected answer:
> - Named reusable design templates.
> - Shared team vocabulary.
> - Better extensibility and testability.
> Why this matters: interviewers check whether you think in reusable design decisions instead of ad-hoc classes.
> [!QUESTION]- What categories of patterns exist?
> For GoF patterns, the classic categories are:
> - Creational: object creation (how instances are constructed)
> - Structural: object composition (how classes/objects are arranged)
> - Behavioral: object interaction (how responsibilities and communication are organized)
> Expected answer:
> - Creational, Structural, Behavioral.
> - Classify by where change pressure appears.
> Why this matters: category mapping shows fast architectural reasoning and helps justify pattern choice under time pressure.
> [!QUESTION]- What is an anti-pattern?
> An anti-pattern is a recurring solution that appears useful but repeatedly causes high coupling, low testability, or operational problems.
> Expected answer:
> - Recognize recurring harmful design choices.
> - Explain why they fail over time.
> - Propose a safer alternative.
> Why this matters: strong candidates avoid cargo-cult patterns and can explain failure mechanisms, not only definitions.
> [!QUESTION]- Name a few patterns from each category and the basic idea behind them.
> Creational:
> - Factory Method: delegate creation to creators/factories to decouple callers from concrete types.
> - Builder: construct complex objects step-by-step.
>
> Structural:
> - Adapter: make incompatible interfaces work together.
> - Decorator: add behavior by wrapping instead of subclassing.
>
> Behavioral:
> - Strategy: swap algorithms behind a common interface.
> - Observer: publish/subscribe notifications.
> Expected answer:
> - Give one concrete use-case per chosen pattern.
> Why this matters: interviewers score practical mapping from pattern names to real design problems.
> [!QUESTION]- You need to add a new robot type to an existing system without modifying existing code. Which patterns enable this?
> Combine Factory Method (instantiate new robot implementation), Strategy (inject new movement/task behavior), and Template Method (reuse stable execution skeleton).
> Expected answer:
> - Factory Method for creation extension.
> - Strategy for algorithm variation.
> - Template Method for stable lifecycle.
> - Tradeoff: extra classes and abstraction overhead.
> Why this matters: this question tests OCP-driven design and whether you can combine patterns coherently.
> [!QUESTION]- How do you choose between Strategy and Template Method in robot behavior design?
> Prefer Strategy when behavior slices vary independently and should be swapped by composition. Prefer Template Method when algorithm order is fixed and only selected steps should vary.
> Expected answer:
> - Strategy: composition and runtime swap, with more object wiring.
> - Template Method: inheritance with a fixed skeleton and tighter base-class coupling.
> - Tradeoff: flexibility vs orchestration simplicity.
> Why this matters: this is a common class-design tradeoff where poor choice leads to either rigid inheritance or excessive object churn.

## Links
- [Refactoring.Guru - Design Patterns](https://refactoring.guru/design-patterns)
- [Wikipedia - Design pattern](https://en.wikipedia.org/wiki/Design_pattern)
- [Microsoft Learn - Subscribe to and unsubscribe from events](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/how-to-subscribe-to-and-unsubscribe-from-events)
- [Martin Fowler - Patterns of Enterprise Application Architecture Catalog](https://martinfowler.com/eaaCatalog/)
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.pearson.com/en-us/subject-catalog/p/design-patterns-elements-of-reusable-object-oriented-software/P200000009480/9780321700698)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Patterns/Circut Breaker|Circut Breaker]]
> - [[Software Engineering/05 Architecture/Patterns/CQRS|CQRS]]
> - [[Software Engineering/05 Architecture/Patterns/CQS|CQS]]
> - [[Software Engineering/05 Architecture/Patterns/Dependency Injection|Dependency Injection]]
> - [[Software Engineering/05 Architecture/Patterns/Domain-Driven Development|Domain-Driven Development]]
> - [[Software Engineering/05 Architecture/Patterns/Event Sourcing|Event Sourcing]]
> - [[Software Engineering/05 Architecture/Patterns/Event-Driven Architecture|Event-Driven Architecture]]
> - [[Software Engineering/05 Architecture/Patterns/GRASP|GRASP]]
> - [[Software Engineering/05 Architecture/Patterns/Rate Limiting|Rate Limiting]]
> - [[Software Engineering/05 Architecture/Patterns/Repository & UoW|Repository & UoW]]
<!-- whats-next:end -->
