---
title: Programming Paradigms
topic:
  - Software Design
subtopic:
  - Paradigms
summary: "Mental models adopted before writing code — the programming paradigms that shape how you structure it (OOP, functional, event-driven)."
tags: [FolderNote]
publish: true
status: Creation
level:
  - "4"
priority: Medium
---

A programming paradigm is a model for organizing state and control flow. It determines which unit carries behavior, how larger operations compose, and where side effects appear. C# supports several of these models in the same program. An order can be an object with guarded invariants, its lines can pass through pure transformations, and the completed transaction can emit an event.

The practical test is visibility: which model makes the state transition and its effects easiest to inspect? [[Home/Software Design/Paradigms/OOP]] fits behavior tied to identity and invariants. [[Home/Software Design/Paradigms/Functional Programming]] fits deterministic transformations. Event-driven code fits work triggered by facts or signals, while imperative code remains the clearest choice for a short, explicit sequence.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Programming Paradigms by State, Control, Effects, and Concurrency

| Style | Control flow | State model | Composition unit | Effects | Concurrency semantics | Representative support |
| --- | --- | --- | --- | --- | --- | --- |
| Imperative | Statements execute in an explicit order | Usually mutable variables | Procedure or method | Performed inline | Must be coordinated explicitly | C#, Go, C |
| Object-oriented | Calls dispatch through objects and interfaces | Encapsulated behind object methods | Object and interface | Owned by collaborating objects | Synchronization follows shared object state | C#, Java, Smalltalk |
| Functional | Expressions transform values | Prefer immutable values | Function | Isolated at boundaries | Immutable values reduce shared-state coordination | F#, Haskell, C# with LINQ |
| Logic/declarative | State the result or constraints, not the steps | Engine-managed facts or relations | Rule, query, or expression | Delegated to the runtime | Defined by the query or rule engine | Prolog, SQL |
| Event-driven | A producer publishes an event. Registered handlers run according to the runtime or broker | Subscriber state and event-derived projections | Event and handler | At publication and handler boundaries | Delivery and ordering depend on the runtime. Handlers may still run synchronously and block | .NET events, message brokers, UI event loops |
| Reactive streams | Values flow through operators after a subscription establishes demand | Stream state and accumulated projections | Stream operator | At subscription and terminal-observer boundaries | Demand and backpressure are explicit only when the chosen protocol supports them | Reactive Streams, `IAsyncEnumerable<T>`, Rx operators |
| Concurrent | Several tasks make progress over overlapping time | Shared, isolated, or message-passed | Task, actor, or channel | Coordinated across tasks | Progress can interleave even on one core | C# tasks/channels, Erlang actors, Go goroutines |

Event-driven code moves control to handlers when an event occurs. Delivery may still be synchronous: ordinary C# events invoke handlers on the publishing thread unless the handler starts other work. Reactive streams describe values flowing through a stream contract. Backpressure is present only when that contract exposes demand or otherwise bounds production against consumption. The two styles often meet in one design, but they solve different problems.

Concurrency allows operations to make progress during overlapping periods. Parallelism executes work simultaneously, usually across cores. An asynchronous HTTP operation provides concurrency because its thread can return to the pool while I/O is pending. A CPU-bound `Parallel.For` becomes parallel when iterations run at the same time. The distinction determines whether a design needs shared-state synchronization, capacity limits, or both.

# Imperative, Functional, and Object-oriented Styles

All three examples reject negative invoice lines and total the rest. The result is identical. The ownership of state and behavior changes.

```csharp
static decimal TotalImperative(IEnumerable<decimal> amounts)
{
    var total = 0m;

    foreach (var amount in amounts)
    {
        if (amount < 0) throw new ArgumentOutOfRangeException(nameof(amounts));
        total += amount;
    }

    return total;
}
```

The imperative version exposes both the sequence and the accumulator. It is easy to step through. Correctness still depends on every mutation path preserving the rule.

```csharp
static decimal TotalFunctional(IReadOnlyList<decimal> amounts) =>
    amounts.Any(amount => amount < 0)
        ? throw new ArgumentOutOfRangeException(nameof(amounts))
        : amounts.Sum();
```

The functional version expresses validation and reduction as transformations. No mutable accumulator escapes the function, and the same values produce the same result.

```csharp
public sealed class Invoice
{
    private readonly IReadOnlyList<decimal> _amounts;

    public Invoice(IReadOnlyList<decimal> amounts)
    {
        if (amounts.Any(amount => amount < 0))
            throw new ArgumentOutOfRangeException(nameof(amounts));

        _amounts = amounts.ToArray();
    }

    public decimal Total() => _amounts.Sum();
}
```

The object-oriented version protects the invariant at construction and keeps behavior beside the state. The type earns its keep when an invoice has identity and several legal transitions. For a one-off calculation, it adds machinery without adding much clarity.

| Question | Imperative | Functional | Object-oriented |
| --- | --- | --- | --- |
| Where is state? | Local mutable accumulator | Input and derived values | Private object fields |
| What composes? | Statements and procedures | Functions | Objects and interfaces |
| Where is the invariant checked? | In the procedure | At the transformation boundary | At construction and methods |
| Best fit | Short explicit workflows | Data pipelines and calculations | Domains with identity and legal transitions |
| Main cost | Mutation paths grow hard to track | Effect boundaries need discipline | Types and indirection can outgrow the problem |

# References

- [Structure and Interpretation of Computer Programs](https://ocw.mit.edu/courses/6-001-structure-and-interpretation-of-computer-programs-spring-2005/)
