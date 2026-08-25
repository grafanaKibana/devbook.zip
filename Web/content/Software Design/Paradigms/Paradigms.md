---
publish: true
title: Programming Paradigms
created: 2026-08-20T20:41:15.706Z
modified: 2026-08-25T10:26:27.088Z
published: 2026-08-25T10:26:27.088Z
tags:
  - FolderNote
topic:
  - Software Design
subtopic:
  - Paradigms
summary: Mental models adopted before writing code — the programming paradigms that shape how you structure it (OOP, functional, event-driven).
status: Creation
level:
  - "4"
priority: Medium
---

A programming paradigm is a model for organizing state and control flow. It determines which unit carries behavior, how larger operations compose, and where side effects appear. C# supports several of these models in the same program. An order can be an object with guarded invariants, its lines can pass through pure transformations, and the completed transaction can emit an event.

The practical test is visibility: which model makes the state transition and its effects easiest to inspect? [[Software Design/Paradigms/OOP]] fits behavior tied to identity and invariants. [[Software Design/Paradigms/Functional Programming]] fits deterministic transformations. Event-driven code fits work triggered by facts or signals, while imperative code remains the clearest choice for a short, explicit sequence.

<nav style="--card-accent: 132, 204, 22;" class="folder-structure-map" aria-label="Paradigms section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Event-driven">Event-driven</span></span></div><p class="db-card-summary">Systems built around immutable events and reactions, decoupling producers from consumers.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Software Design/Paradigms/Event-driven.md" data-tooltip-position="top" aria-label="Event-driven">Event-driven</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Functional Programming">Functional Programming</span></span></div><p class="db-card-summary">Models computation as the evaluation of pure functions over immutable data.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Software Design/Paradigms/Functional Programming.md" data-tooltip-position="top" aria-label="Functional Programming">Functional Programming</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="OOP">OOP</span></span></div><p class="db-card-summary">Models state and behavior as objects whose methods protect invariants and satisfy explicit contracts.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Software Design/Paradigms/OOP.md" data-tooltip-position="top" aria-label="OOP">OOP</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

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
