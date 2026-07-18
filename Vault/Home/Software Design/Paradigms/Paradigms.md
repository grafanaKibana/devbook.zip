---
topic:
  - Software Design
subtopic:
  - Paradigms
summary: "Mental models adopted before writing code — the programming paradigms that shape how you structure it (OOP, functional, event-driven)."
tags:
  - FolderNote
publish: true
status: Creation
level:
  - '4'
priority: Medium
---

# Intro

A programming paradigm is a set of choices about where state lives, how control moves, and what unit composes into a larger program. C# is multi-paradigm: a service can model an order as an object, transform its lines with pure functions, react to events, and coordinate concurrent work without committing the entire codebase to one style.

The useful question is not “which paradigm wins?” It is “which model makes the state transitions and effects easiest to see?” Use [[OOP]] when identity and invariants dominate, [[Functional Programming]] for deterministic transformations, event-driven code when control should follow events, and imperative code when an explicit sequence is the clearest description.

## Programming paradigms by state, control, effects, and concurrency

| Style | Control flow | State model | Composition unit | Effects | Concurrency semantics | Representative support |
| --- | --- | --- | --- | --- | --- | --- |
| Imperative | Statements execute in an explicit order | Usually mutable variables | Procedure or method | Performed inline | Must be coordinated explicitly | C#, Go, C |
| Object-oriented | Calls dispatch through objects and interfaces | Encapsulated behind object methods | Object and interface | Owned by collaborating objects | Synchronization follows shared object state | C#, Java, Smalltalk |
| Functional | Expressions transform values | Prefer immutable values | Function | Isolated at boundaries | Immutable values reduce shared-state coordination | F#, Haskell, C# with LINQ |
| Logic/declarative | State the result or constraints, not the steps | Engine-managed facts or relations | Rule, query, or expression | Delegated to the runtime | Defined by the query or rule engine | Prolog, SQL |
| Event-driven | A producer publishes an event; registered handlers run according to the runtime or broker | Subscriber state and event-derived projections | Event and handler | At publication and handler boundaries | Delivery and ordering depend on the runtime; handlers may still run synchronously and block | .NET events, message brokers, UI event loops |
| Reactive streams | Values flow through operators after a subscription establishes demand | Stream state and accumulated projections | Stream operator | At subscription and terminal-observer boundaries | Demand and backpressure are explicit only when the chosen protocol supports them | Reactive Streams, `IAsyncEnumerable<T>`, Rx operators |
| Concurrent | Several tasks make progress over overlapping time | Shared, isolated, or message-passed | Task, actor, or channel | Coordinated across tasks | Progress can interleave even on one core | C# tasks/channels, Erlang actors, Go goroutines |

Event-driven describes how control is triggered and how producers are decoupled from handlers. It does not imply asynchronous or non-blocking delivery: a C# event invokes its handlers synchronously unless the handler explicitly starts asynchronous work. Reactive streams describe value flow through a stream protocol; backpressure exists only when that protocol carries demand or provides a bounded consumption mechanism. These choices can combine, but they answer different questions.

Concurrency is about overlapping progress; parallelism is about simultaneous execution on multiple cores. An async HTTP request is concurrent while the thread is free to do other work, even if no two instructions run at once. A CPU-bound `Parallel.For` is parallel when iterations execute on different cores. Treating the terms as synonyms leads to the wrong synchronization and capacity assumptions.

## Imperative, functional, and object-oriented styles

All three examples reject negative invoice lines and total the rest. The result is identical; the ownership of state and behavior changes.

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

The imperative version exposes the sequence and accumulator. It is the easiest version to step through, but correctness depends on every mutation path preserving the rule.

```csharp
static decimal TotalFunctional(IReadOnlyList<decimal> amounts) =>
    amounts.Any(amount => amount < 0)
        ? throw new ArgumentOutOfRangeException(nameof(amounts))
        : amounts.Sum();
```

The functional version expresses validation and reduction as transformations. The caller owns no mutable accumulator, which makes the function deterministic for the same input.

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

The object-oriented version protects the invariant once and keeps the behavior beside the state. That extra type pays off when an invoice has identity and more legal transitions; it is ceremony when the operation is a one-off transformation.

| Question | Imperative | Functional | Object-oriented |
| --- | --- | --- | --- |
| Where is state? | Local mutable accumulator | Input and derived values | Private object fields |
| What composes? | Statements and procedures | Functions | Objects and interfaces |
| Where is the invariant checked? | In the procedure | At the transformation boundary | At construction and methods |
| Best fit | Short explicit workflows | Data pipelines and calculations | Domains with identity and legal transitions |
| Main cost | Mutation paths grow hard to track | Effect boundaries need discipline | Types and indirection can outgrow the problem |

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [C# language specification: statements](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/statements) — the normative statement and control-flow rules behind imperative C#.
- [Task-based asynchronous pattern](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap) — Microsoft's contract for task-based concurrency and asynchronous completion.
- [ByteByteGo source snapshot: imperative vs functional vs object-oriented programming](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/imperative-vs-functional-vs-object-oriented-programming.md) — the comparison that prompted the symmetric C# example; the note narrows its broad labels into explicit state and composition choices.
- [ByteByteGo source snapshot: top 8 programming paradigms](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-8-programming-paradigms.md) — the source catalog reconciled here with a strict concurrency-versus-parallelism distinction.
