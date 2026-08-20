---
publish: true
created: 2026-08-20T20:41:15.706Z
modified: 2026-08-20T20:41:15.706Z
published: 2026-08-20T20:41:15.706Z
topic:
  - Software Design
subtopic:
  - Paradigms
summary: Models state and behavior as objects whose methods protect invariants and satisfy explicit contracts.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

Object-oriented programming places state beside the operations allowed to change it. The useful boundary is an object that owns an invariant, not a class that merely groups fields. Interfaces name capabilities, composition assembles behavior that can vary independently, and runtime dispatch lets a caller depend on a contract instead of a concrete implementation. Inheritance is optional. It earns its place only when a genuine subtype can preserve the base contract.

# Abstraction and Invariants

An object should make invalid transitions difficult to express. A bank account exposes `Deposit` and `Withdraw` rather than a public balance setter that lets any caller bypass its rules.

```csharp
public sealed class BankAccount
{
    public decimal Balance { get; private set; }

    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        Balance += amount;
    }

    public void Withdraw(decimal amount)
    {
        if (amount <= 0 || amount > Balance)
            throw new InvalidOperationException("The withdrawal is not valid.");

        Balance -= amount;
    }
}
```

The private setter only limits access. The methods establish what counts as a legal transition. Encapsulation is control over those transitions, not the mechanical act of wrapping fields in a class.

Abstraction exposes only the contract a caller needs:

```csharp
public interface IPaymentGateway
{
    Task<PaymentResult> ChargeAsync(
        Money amount,
        CancellationToken cancellationToken);
}

public sealed class CheckoutService(IPaymentGateway gateway)
{
    public Task<PaymentResult> CheckoutAsync(
        Money total,
        CancellationToken cancellationToken) =>
        gateway.ChargeAsync(total, cancellationToken);
}
```

The caller depends on the ability to charge a payment. An implementation owns the remote protocol and credentials. C# interfaces can provide default members, but the default still needs semantics that make sense for every implementer. A fallback that exists only to avoid changing implementations usually means the interface contains more than one coherent capability.

# Inheritance and Composition

Inheritance binds a derived type to both a base contract and part of its implementation. Composition binds an object to a collaborator's contract and delegates a capability. A real subtype shares stable expectations with its base. A composed behavior can vary on its own or at runtime. Borrowing code is not, by itself, a reason to publish a subtype relationship.

```csharp
public interface IMovementStrategy
{
    Task MoveToAsync(string destination, CancellationToken cancellationToken);
}

public abstract class Robot
{
    protected Robot(IMovementStrategy movement) => Movement = movement;

    protected IMovementStrategy Movement { get; }
    public abstract Task PerformTaskAsync(CancellationToken cancellationToken);
}

public sealed class WaiterRobot(IMovementStrategy movement) : Robot(movement)
{
    public override Task PerformTaskAsync(CancellationToken cancellationToken) =>
        Movement.MoveToAsync("serving-counter", cancellationToken);
}
```

`WaiterRobot` is a `Robot` only if callers can rely on the same robot lifecycle and invariants for every subtype. Movement is composed because A\*, waypoints, and direct movement vary independently. Encoding both dimensions in inheritance would create a class for every combination.

| Signal | Prefer inheritance | Prefer composition |
| --- | --- | --- |
| Relationship | A durable “is-a” subtype | A “has-a” collaborator |
| Shared state | Base class protects a real invariant | State belongs to the delegated capability |
| Variation | Fixed by the concrete type | Swappable by configuration or request |
| Change cost | Base changes are safe for every subtype | Implementations should evolve independently |
| Reuse | Consequence of the hierarchy | Explicit delegation is the intended reuse |

A derived class can quietly depend on call order, protected state, or a virtual method invoked during construction. A later base-class change may compile cleanly and still break that dependency. Keep extension points small, document their preconditions and postconditions, and seal classes that were not designed and tested for derivation.

Deep hierarchies multiply the risk. An override that suppresses required base behavior, rejects a supported operation, or needs knowledge of base internals is evidence of a false subtype. Capability interfaces and composed policies usually expose the real variation more directly.

# Subtyping and Polymorphism

Inheritance and interface implementation create assignability relationships in C#. Sound design also requires behavioral substitutability: a value used through the base contract must preserve the expectations available to callers that know only that contract.

```csharp
public abstract class Account
{
    public abstract void Withdraw(decimal amount);
}

public sealed class FixedTermAccount : Account
{
    public override void Withdraw(decimal amount) =>
        throw new InvalidOperationException("Funds are locked.");
}
```

The code is assignable, but `FixedTermAccount` makes `Withdraw` unavailable for an otherwise valid account. That is a stronger precondition than the base contract advertises. The model should expose the real capabilities instead.

```csharp
public interface IAccount
{
    decimal Balance { get; }
}

public interface IWithdrawableAccount : IAccount
{
    void Withdraw(decimal amount);
}
```

A reporting service accepts `IAccount`. A transfer service requires `IWithdrawableAccount`. Neither must discover capability failure at runtime.

The substitution rule can be read operationally:

- Do not require more than the base contract requires.
- Do not promise less than the base contract promises.
- Preserve invariants visible to callers.
- Keep failures within the contract’s documented semantics.

Subtype polymorphism dispatches an operation through a base type or interface to the concrete implementation:

```csharp
public interface IDiscountPolicy
{
    decimal Calculate(Order order);
}

decimal discount = policy.Calculate(order);
```

At runtime, an interface call is resolved against the concrete type's implementation, while virtual class methods dispatch through the type's virtual method table. The JIT can devirtualize calls when it proves the target. Contract clarity is therefore a better design criterion than assumed dispatch overhead. Performance-sensitive paths still need measurement.

Overloading is different. The compiler selects an overload from the static argument types, so it does not provide runtime substitution behind one contract.

Polymorphism pays off when each implementation owns coherent behavior and implementations evolve independently. A closed `switch` can be clearer when the cases form one finite workflow. Spreading a small, closed decision across several types can hide the state machine without creating useful extensibility.

# Pitfalls

**Anemic domain model** — a type with public setters while every rule lives in services is procedural code wearing class syntax. A public `Order.Status` setter lets any caller skip payment checks. An `Order.Ship()` method can reject an illegal transition where the state changes.

**Interfaces for every class** — a one-to-one `IThing`/`Thing` pair adds navigation and mocking ceremony without defining a useful boundary. An interface is justified when it names a capability across an architectural boundary, supports meaningful alternatives, or isolates an external dependency that tests must replace.

**Inheritance for reuse alone** — deriving `EmailNotifier` from `SmtpClient` exposes the wrong public contract and couples notification behavior to transport internals. Inject an SMTP collaborator instead.

**Assignable but not substitutable** — a subtype that throws for a base operation or strengthens its preconditions satisfies the method shape while breaking the behavioral contract.

# Tradeoffs

| Choice | Cost | Use it when |
| --- | --- | --- |
| Rich object with guarded methods | More types and transition methods | Identity and legal state transitions dominate the domain |
| Immutable data plus pure functions | State changes become explicit copies | The work is a deterministic transformation or pipeline |
| Interface boundary | Indirection and contract-evolution work | Multiple implementations or an architectural boundary are real |
| Concrete dependency | Tighter coupling | One stable implementation is local and replacement has no value |
| Inheritance | Base-class coupling and fragile extension points | A genuine subtype shares a stable lifecycle and invariant |
| Composition | Constructor wiring and delegation | Capabilities vary independently or at runtime |

Most production C# systems mix styles. Objects protect identity and legal state transitions. Records, LINQ, and pure functions express transformations. The right boundary is the smallest one that makes state ownership, substitution, and failure behavior obvious.

# References

- [C# object-oriented programming](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/oop)
- [A Behavioral Notion of Subtyping](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf)
