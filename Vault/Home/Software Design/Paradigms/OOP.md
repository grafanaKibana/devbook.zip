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

# Intro

Object-oriented programming models a system as objects that own state and expose behavior. Its main value is not class syntax or inheritance: it is putting each invariant beside the operations allowed to change it. Interfaces define capabilities, composition assembles independently varying behavior, and runtime dispatch lets callers use a contract without knowing the concrete type. Inheritance is optional and earns its place only when a genuine subtype shares stable invariants and implementation.

## Abstraction, invariants, composition, subtyping, and dispatch

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

The private setter is not sufficient by itself; the methods are what enforce the invariant. Encapsulation is therefore control over state transitions, not merely wrapping fields in a class.

Abstraction exposes only the contract a caller needs:

```csharp
public interface IPaymentGateway
{
    Task<PaymentResult> ChargeAsync(
        Money amount,
        CancellationToken cancellationToken);
}
```

The caller depends on `IPaymentGateway`, while a Stripe or bank implementation owns protocol details. C# interfaces can include default members, so adding an operation does not mechanically require every implementation to duplicate code. The real cost is contract evolution: a default must have semantics that are valid for every implementer, otherwise the interface has grown beyond one coherent capability.

Composition then supplies the implementation without turning the caller into a subtype:

```csharp
public sealed class CheckoutService(IPaymentGateway gateway)
{
    public Task<PaymentResult> CheckoutAsync(
        Money total,
        CancellationToken cancellationToken) =>
        gateway.ChargeAsync(total, cancellationToken);
}
```

When several implementations satisfy the same contract, interface dispatch selects the active implementation at runtime. That indirection replaces type-based `switch` statements when behavior truly varies by type. It is a poor trade when there is only one stable behavior and no independent reason for a contract.

The two design decisions that need more depth are separated into focused notes:

- [[Inheritance and Composition]] — when shared invariants justify a base class and when delegation avoids fragile coupling.
- [[Subtyping and Polymorphism]] — substitutability, capability interfaces, and runtime dispatch.

## Pitfalls

**Anemic domain model** — a type with public setters while all rules live in services is procedural code wearing class syntax. A public `Order.Status` setter lets any caller skip payment checks; an `Order.Ship()` method can reject an illegal transition at the mutation boundary.

**Interfaces for every class** — a one-to-one `IThing`/`Thing` pair adds navigation and mocking ceremony without creating a useful boundary. Introduce an interface for multiple implementations, a capability consumed across a boundary, or a dependency that tests must replace.

**Inheritance for reuse alone** — deriving `EmailNotifier` from `SmtpClient` exposes the wrong public contract and couples notification behavior to transport internals. Inject an SMTP collaborator instead.

## Tradeoffs

| Choice | Cost | Use it when |
| --- | --- | --- |
| Rich object with guarded methods | More types and transition methods | Identity and legal state transitions dominate the domain |
| Immutable data plus pure functions | State changes become explicit copies | The work is a deterministic transformation or pipeline |
| Interface boundary | Indirection and contract-evolution work | Multiple implementations or an architectural boundary are real |
| Concrete dependency | Tighter coupling | One stable implementation is local and replacement has no value |

Most production C# systems mix styles: objects protect domain invariants, while records, LINQ, and pure functions handle transformations. Use the smallest boundary that makes ownership and failure modes clearer.

## Questions

> [!QUESTION]- What does encapsulation protect beyond field visibility?
> It protects legal transitions. A private field with a public setter still lets callers create invalid state; methods that validate every mutation keep the invariant at one boundary.

> [!QUESTION]- What is the cost of an interface in C#?
> The cost is an extra contract that must remain coherent, discoverable, and evolvable. Default interface members can supply shared fallback behavior, but they do not make every new member safe: a default that is meaningless for some implementers signals that the interface should be split.

> [!QUESTION]- When does polymorphism beat a conditional?
> Use it when behavior varies behind a stable capability and new implementations are expected. Keep a conditional when the cases are closed, local, and easier to inspect together than through several types.

## References

- [C# object-oriented programming](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/oop) — Microsoft’s overview of encapsulation, inheritance, and polymorphism in C#.
- [Interfaces in C#](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/interfaces) — official interface semantics, multiple implementation, and default interface members.
- [C# language specification: classes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes) — normative rules for classes, members, inheritance, and dispatch.
- [ByteByteGo source snapshot: the fundamental pillars of object-oriented programming](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/the-fundamental-pillars-of-object-oriented-programming.md) — the source overview that prompted the stricter treatment of invariants, composition, subtyping, and dispatch.
