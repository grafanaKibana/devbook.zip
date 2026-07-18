---
topic:
  - Software Design
subtopic:
  - Paradigms
summary: "Designing substitutable contracts and dispatching behavior through base types and interfaces."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

Subtyping says a value can be used through another type’s contract. Polymorphism is the mechanism that dispatches an operation to the value’s concrete implementation. Assignability is checked by the compiler; substitutability is a semantic obligation: the subtype must preserve the expectations of callers that know only the base contract.

## Substitutability before syntax

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

## Runtime dispatch

```csharp
public interface IDiscountPolicy
{
    decimal Calculate(Order order);
}

decimal discount = policy.Calculate(order);
```

The CLR resolves an interface call through the concrete type’s interface map; virtual class calls use virtual slots. The JIT can devirtualize a call when it proves the concrete type, so the design decision should be driven by contract value rather than assumed dispatch overhead.

Overloading is different: the compiler chooses an overload from the static argument types. It is sometimes called compile-time polymorphism, but it does not provide runtime substitution.

## Polymorphism or a conditional

Polymorphism helps when each implementation owns coherent behavior and new implementations arrive independently. A closed `switch` over three states can be clearer when the cases form one finite workflow. Splitting a small closed decision across types can hide the whole state machine without adding extensibility.

## Questions

> [!QUESTION]- Why can a subtype compile and still violate its base contract?
> The type system proves member shape and assignability, not behavioral promises. Throwing for an operation that the base presents as generally supported satisfies the method signature while breaking callers’ expectations.

> [!QUESTION]- What does runtime polymorphism buy?
> A caller depends on one capability while the active implementation varies. That isolates provider, strategy, or domain-specific behavior, at the cost of indirection and a contract that must remain valid for every implementation.

## References

- [A behavioral notion of subtyping](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf) — Liskov and Wing’s primary paper defining behavioral substitutability.
- [C# language specification: interfaces](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/interfaces) — normative interface inheritance, implementation, and member rules.
- [C# language specification: classes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes) — normative virtual-member and override semantics.
