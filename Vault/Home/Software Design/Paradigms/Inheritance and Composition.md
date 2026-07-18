---
topic:
  - Software Design
subtopic:
  - Paradigms
summary: "Choosing between a shared base-class contract and delegated collaborators that vary independently."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

Inheritance binds a derived type to a base type’s contract and implementation. Composition binds an object to a collaborator’s contract and delegates work to it. Use inheritance when the relationship is a genuine subtype with stable shared invariants; use composition when behavior varies independently or may change at runtime. Reuse alone is not enough to justify a type hierarchy.

## The decision

```csharp
public abstract class Robot
{
    protected Robot(IMovementStrategy movement) => Movement = movement;

    protected IMovementStrategy Movement { get; }
    public abstract Task PerformTaskAsync(CancellationToken cancellationToken);
}

public sealed class WaiterRobot(IMovementStrategy movement) : Robot(movement)
{
    public override Task PerformTaskAsync(CancellationToken cancellationToken) =>
        DeliverOrderAsync(cancellationToken);
}
```

`WaiterRobot` is a `Robot`: callers can rely on the robot lifecycle and every subtype shares its invariants. Movement is composed because A*, waypoints, or direct movement can vary without creating `AStarWaiterRobot`, `WaypointWaiterRobot`, and every other cross-product subtype.

| Signal | Prefer inheritance | Prefer composition |
| --- | --- | --- |
| Relationship | A durable “is-a” subtype | A “has-a” collaborator |
| Shared state | Base class protects a real invariant | State belongs to the delegated capability |
| Variation | Fixed at type construction | Swappable by configuration or request |
| Change cost | Base changes are safe for every subtype | Implementations should evolve independently |
| Reuse | Consequence of the hierarchy | Explicit delegation is the intended reuse |

## Fragile base classes

A derived class can depend on undocumented call order, protected state, or a virtual method invoked from a constructor. A later base-class change can compile cleanly and still break the subtype. Keep extension points small, document their preconditions and postconditions, and prefer `sealed` when a class was not designed for derivation.

Deep hierarchies multiply this risk. If an override suppresses base behavior, throws for a supported operation, or needs knowledge of base internals, the subtype is probably false. Flatten the hierarchy into capability interfaces and composed policies.

## Tradeoffs

Composition needs constructor wiring and delegation methods. Inheritance can be concise and lets a framework supply a template lifecycle. Pay the inheritance coupling only when callers benefit from the subtype relation and the base owns stable invariants; otherwise the explicit wiring is cheaper than a fragile hierarchy.

## Questions

> [!QUESTION]- Why is “composition over inheritance” a preference rather than a ban?
> Framework base classes and genuine domain taxonomies can provide stable lifecycle and invariants. The rule rejects inheritance used only to borrow implementation, because that creates a public subtype contract the design did not intend.

## References

- [Inheritance in C#](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/inheritance) — official mechanics for base classes, overrides, sealing, and constructor behavior.
- [Prefer composition over inheritance](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles#prefer-composition-over-inheritance) — Microsoft’s .NET architecture guidance and the coupling behind the recommendation.
- [C# language specification: classes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes) — normative inheritance and member-binding rules.
