---
publish: true
created: 2026-08-20T20:41:15.705Z
modified: 2026-08-20T20:41:15.706Z
published: 2026-08-20T20:41:15.706Z
topic:
  - Software Design
subtopic:
  - Paradigms
summary: Models computation as the evaluation of pure functions over immutable data.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

Functional programming makes data flow explicit. Calculations are expressed as functions whose results depend on their inputs, while database calls, clocks, logging, and other effects stay at the system's edges. That separation reduces the amount of code whose behavior depends on hidden state.

C# is a multi-paradigm language rather than a pure functional one. LINQ, lambdas, records, pattern matching, and immutable collections make functional techniques practical where they clarify a design. Mutable objects and loops remain useful when identity, state transitions, or allocation cost are the real concern.

# Core Concepts

## Pure Functions

For inputs in its defined domain, a pure function returns the same value, has no observable side effects, and is referentially transparent: replacing a call with its result does not change program behavior. The function neither reads hidden inputs nor changes state outside its return value.

```csharp
// Pure: same input → same output, no side effects
static decimal CalculateTax(decimal amount, decimal rate) => amount * rate;

// Impure: reads external state, has side effect (logging)
static decimal CalculateTaxImpure(decimal amount)
{
    _logger.Log("calculating");          // side effect
    return amount * _config.TaxRate;    // depends on external state
}
```

Pure functions are easy to test because every dependency is an argument. They can also run concurrently without coordinating shared writes. Memoization is possible when inputs have stable equality and hashing, although cache lifetime and memory growth still need an explicit policy. A function that throws outside its defined domain is partial; when totality matters, expected invalid inputs should be encoded as returned values such as `Result<T>` or an option type.

## Immutability

Immutable data is replaced rather than modified. Each state transition produces a new value, so existing references continue to observe the old one.

```csharp
// C# record — value-based equality, non-destructive mutation via `with`
public sealed record Order(string Id, decimal Total, string Status);

var order = new Order("ord-1", 99.99m, "Pending");
var paid  = order with { Status = "Paid" };  // new instance; original unchanged
```

This removes write races and unexpected aliasing for the immutable state itself. C# records do not guarantee deep immutability: a record property can still refer to a mutable list, and a `with` expression makes a shallow copy. The boundary is reliable only when the values reachable through it are immutable or treated as such.

## Higher-Order Functions

A higher-order function accepts a function, returns one, or does both. LINQ operators use delegates to separate the operation from the rule applied to each element.

```csharp
var orders = new[] { 100m, 50m, 200m, 30m };

// Filter → Transform → Aggregate: no mutation, no loop variable
decimal highValueTotal = orders
    .Where(o => o > 60)
    .Select(o => o * 1.1m)   // apply 10% markup
    .Sum();
// Result: (100 * 1.1) + (200 * 1.1) = 330
```

## Function Composition

Composition connects small transformations so that the output of one becomes the input to the next. The useful boundary is not function size by itself. Each step should express one decision that can be understood and tested independently.

```csharp
// Compose two transformations into one pipeline
Func<string, string> normalize = s => s.Trim().ToLowerInvariant();
Func<string, bool>   isValid   = s => s.Length >= 3 && s.All(char.IsLetterOrDigit);

Func<string, bool> isValidInput = s => isValid(normalize(s));

Console.WriteLine(isValidInput("  Hello123  ")); // true
Console.WriteLine(isValidInput("  Hi  "));       // false (length < 3 after trim)
```

## Pattern Matching and Discriminated Unions

C# records and pattern matching can model a closed set of alternatives in a style similar to algebraic data types. The type hierarchy itself remains open unless the design controls every subtype.

```csharp
public abstract record Shape;
public sealed record Circle(double Radius)    : Shape;
public sealed record Rectangle(double W, double H) : Shape;

static double Area(Shape shape) => shape switch
{
    Circle c        => Math.PI * c.Radius * c.Radius,
    Rectangle r     => r.W * r.H,
    _               => throw new ArgumentOutOfRangeException(nameof(shape))
};
```

The compiler reports a non-exhaustive switch expression when it can see an uncovered input. An open class hierarchy still needs a discard arm because another subtype can appear, and null remains a separate case unless the contract and nullable analysis exclude it. Exhaustiveness catches missing alternatives. It does not eliminate null-related bugs in general.

# Pitfalls

## Overusing Immutability in Hot Paths

Replacing every `List<T>` with `ImmutableList<T>` inside a tight update loop creates persistent-tree nodes on each change and can increase GC pressure. `Add` is O(log n) and copies the path to the changed node. `ImmutableArray<T>` is compact for read-heavy snapshots but copies its backing storage when changed.

Use immutable collections where snapshots and safe sharing matter, such as domain events or published state. A local algorithm can build with mutable storage and expose an immutable result once construction is complete. Benchmark before changing a hot path.

## Chaining LINQ Without Understanding Deferred Execution

Many LINQ operators use deferred execution, so each enumeration starts the pipeline again. Enumerating an `IQueryable<T>` twice may issue two database queries.

Materialize with `.ToList()` or `.ToArray()` when a stable snapshot will be consumed more than once. Keep the query deferred when streaming, changing source data, or provider translation is intentional.

```csharp
// BAD: two DB round-trips if source is IQueryable
var repeatedCount = query.Count();
var repeatedItems = query.ToList();

// GOOD: one round-trip
var items = query.ToList();
var count = items.Count;
```

## Ignoring Exceptions in Functional Pipelines

C# permits exceptions anywhere and does not require a result type for expected failure. A fluent pipeline can therefore look total while hiding validation or I/O failure. Partial state appears only after a step has already performed a side effect.

Represent expected outcomes with a result type, nullable value, or small domain-specific union. Reserve exceptions for failures the current operation cannot handle, and keep side effects at a boundary where retry and partial completion are visible.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Pure core (immutable values + pure functions) | Explicit inputs, deterministic tests, safe concurrent evaluation | Can be awkward in C#. Persistent updates allocate | Domain calculations and data transformations |
| Imperative local state | Direct control flow and predictable mutation cost | Hidden or shared state makes reasoning harder | Builders, parsers, and measured inner loops |
| Functional core with effectful shell | Keeps decisions separate from I/O | Requires a deliberate boundary between values and effects | Services that validate, calculate, then persist or publish |

The practical C# pattern is a functional core with an effectful shell: read external state, pass plain values through deterministic logic, then apply the result. Local mutation is still reasonable when it stays contained and makes an algorithm clearer. The decision turns on ownership and observability, not on forcing one style into every method.

# Questions

> [!QUESTION]- What makes a function "pure" and why does purity matter for testing?
> For inputs in its defined domain, its observable result depends only on explicit inputs, and evaluating it does not change external state. Tests therefore pass values and assert values instead of arranging clocks, databases, or global configuration. A throwing input makes the function partial rather than supplying a substitutable result; expected invalid inputs can be modeled as returned values when totality matters. Real systems keep I/O and external state in a surrounding shell and pass their results into the pure core.

# References

- [Functional programming vs. imperative programming](https://learn.microsoft.com/en-us/dotnet/standard/linq/functional-vs-imperative-programming)
- [Functional Programming in C#](https://www.manning.com/books/functional-programming-in-c-sharp-second-edition)
- [Why Functional Programming Matters](https://www.cs.kent.ac.uk/people/staff/dat/miranda/whyfp90.pdf)
