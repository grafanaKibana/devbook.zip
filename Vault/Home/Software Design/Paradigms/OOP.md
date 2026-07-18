---
topic:
  - Software Design
subtopic:
  - Paradigms
summary: "Models state and behavior as objects whose methods protect invariants and satisfy explicit contracts."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

Object-oriented programming models a system as objects that own state and expose behavior. Its main value is not class syntax or inheritance: it is putting each invariant beside the operations allowed to change it. Interfaces define capabilities, composition assembles independently varying behavior, and runtime dispatch lets callers use a contract without knowing the concrete type. Inheritance is optional and earns its place only when a genuine subtype shares stable invariants and implementation.

# Abstraction and invariants

An object should make invalid transitions difficult to express. A bank account exposes `Deposit` and `Withdraw`; it does not expose a public balance setter that any caller can bypass.

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

The private setter is not sufficient by itself; the methods enforce the invariant. Encapsulation is control over state transitions, not merely wrapping fields in a class.

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

The caller depends on a payment capability, while a Stripe or bank implementation owns protocol details. C# interfaces can include default members, but a default must have semantics valid for every implementer. A meaningless fallback signals that the interface has grown beyond one coherent capability.

# Inheritance and composition

Inheritance binds a derived type to a base type’s contract and implementation. Composition binds an object to a collaborator’s contract and delegates work to it. Use inheritance when the relationship is a genuine subtype with stable shared invariants; use composition when behavior varies independently or may change at runtime. Reuse alone is not enough to justify a type hierarchy.

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

`WaiterRobot` is a `Robot`: callers can rely on the robot lifecycle and every subtype shares its invariants. Movement is composed because A*, waypoints, or direct movement can vary without creating `AStarWaiterRobot`, `WaypointWaiterRobot`, and every other cross-product subtype.

| Signal | Prefer inheritance | Prefer composition |
| --- | --- | --- |
| Relationship | A durable “is-a” subtype | A “has-a” collaborator |
| Shared state | Base class protects a real invariant | State belongs to the delegated capability |
| Variation | Fixed by the concrete type | Swappable by configuration or request |
| Change cost | Base changes are safe for every subtype | Implementations should evolve independently |
| Reuse | Consequence of the hierarchy | Explicit delegation is the intended reuse |

A derived class can depend on undocumented call order, protected state, or a virtual method invoked from a constructor. A later base-class change can compile cleanly and still break the subtype. Keep extension points small, document their preconditions and postconditions, and prefer `sealed` when a class was not designed for derivation.

Deep hierarchies multiply this risk. If an override suppresses base behavior, throws for a supported operation, or needs knowledge of base internals, the subtype is probably false. Flatten the hierarchy into capability interfaces and composed policies.

# Subtyping and polymorphism

Inheritance or interface implementation creates a type-system subtype in C#. Sound design additionally requires behavioral substitutability: a value used through the base contract must preserve the expectations of callers that know only that contract.

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

The code is assignable, but `FixedTermAccount` strengthens the precondition of `Withdraw`: the operation is not generally supported. Model the real capabilities instead.

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

A reporting service accepts `IAccount`; a transfer service requires `IWithdrawableAccount`. Neither must discover capability failure at runtime.

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

The CLR resolves an interface call through the concrete type’s interface map; virtual class calls use virtual slots. The JIT can devirtualize a call when it proves the concrete type, so choose the design for contract value rather than assumed dispatch overhead.

Overloading is different: the compiler selects an overload from static argument types. It is sometimes called compile-time polymorphism, but it does not provide runtime substitution.

Polymorphism helps when each implementation owns coherent behavior and new implementations arrive independently. A closed `switch` over three states can be clearer when the cases form one finite workflow. Splitting a small closed decision across types can hide the state machine without adding useful extensibility.

# Pitfalls

**Anemic domain model** — a type with public setters while all rules live in services is procedural code wearing class syntax. A public `Order.Status` setter lets any caller skip payment checks; an `Order.Ship()` method can reject an illegal transition at the mutation boundary.

**Interfaces for every class** — a one-to-one `IThing`/`Thing` pair adds navigation and mocking ceremony without creating a useful boundary. Introduce an interface for multiple implementations, a capability consumed across a boundary, or a dependency tests must replace.

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

Most production C# systems mix styles: objects protect domain invariants, while records, LINQ, and pure functions handle transformations. Use the smallest boundary that makes ownership and failure modes clearer.

# Questions

> [!QUESTION]- Why is “composition over inheritance” a preference rather than a ban?
> Framework base classes and genuine domain taxonomies can provide stable lifecycle and invariants. The rule rejects inheritance used only to borrow implementation, because that creates a public subtype contract the design did not intend.

> [!QUESTION]- Why can a subtype compile and still violate its base contract?
> The type system proves member shape and assignability, not behavioral promises. Throwing for an operation that the base presents as generally supported satisfies the signature while breaking callers’ expectations.

> [!QUESTION]- When does polymorphism beat a conditional?
> Use it when behavior varies behind a stable capability and new implementations are expected. Keep a conditional when the cases are closed, local, and easier to inspect together than through several types.

# References

- [C# object-oriented programming](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/oop) — Microsoft’s overview of encapsulation, inheritance, and polymorphism in C#.
- [Inheritance in C#](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/inheritance) — official mechanics for base classes, overrides, sealing, and constructor behavior.
- [Interfaces in C#](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/interfaces) — official interface semantics, multiple implementation, and default interface members.
- [C# language specification: interfaces](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/interfaces) — normative interface inheritance, implementation, and member rules.
- [C# language specification: classes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes) — normative rules for classes, members, inheritance, and dispatch.
- [A behavioral notion of subtyping](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf) — Liskov and Wing’s primary paper defining behavioral substitutability.
- [Prefer composition over inheritance](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles#prefer-composition-over-inheritance) — Microsoft guidance on the coupling behind the recommendation.
- [ByteByteGo source snapshot: the fundamental pillars of object-oriented programming](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/the-fundamental-pillars-of-object-oriented-programming.md) — the source overview reconciled with explicit invariant, composition, subtyping, and dispatch boundaries.
