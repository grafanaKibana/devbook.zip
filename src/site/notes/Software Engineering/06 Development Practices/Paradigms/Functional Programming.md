---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/paradigms/functional-programming/","dg-note-properties":{"topic":["Development Practices"],"subtopic":["Paradigms"],"level":["3"],"priority":"Medium","status":"Ready to Repeat"}}
---


# Functional Programming

Functional programming (FP) is a paradigm that models computation as the evaluation of pure functions over immutable data. Instead of describing *how* to mutate state step by step (imperative), you describe *what* to compute through function composition and data transformations. The payoff: code that is easier to reason about, test in isolation, and parallelize — because a pure function with the same inputs always produces the same output and never touches shared state.

C# is not a pure FP language, but it has absorbed enough FP features (LINQ, records, pattern matching, lambdas, `ImmutableList<T>`) that senior .NET engineers are expected to apply FP thinking selectively alongside OOP.

## Core Concepts

### Pure Functions

A pure function has no side effects and is referentially transparent — you can replace a call with its return value without changing program behavior.

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

**Why it matters**: pure functions are trivially unit-testable (no mocks needed), safe to cache (memoize), and safe to run in parallel.

### Immutability

Immutable data cannot be changed after creation. Mutations produce new values instead of modifying existing ones.

```csharp
// C# record — value-based equality, non-destructive mutation via `with`
public sealed record Order(string Id, decimal Total, string Status);

var order = new Order("ord-1", 99.99m, "Pending");
var paid  = order with { Status = "Paid" };  // new instance; original unchanged
```

**Why it matters**: eliminates a whole class of bugs caused by shared mutable state — race conditions, unexpected aliasing, and hard-to-trace mutations.

### Higher-Order Functions

Functions that take other functions as arguments or return functions. LINQ is built entirely on this idea.

```csharp
var orders = new[] { 100m, 50m, 200m, 30m };

// Filter → Transform → Aggregate: no mutation, no loop variable
decimal highValueTotal = orders
    .Where(o => o > 60)
    .Select(o => o * 1.1m)   // apply 10% markup
    .Sum();
// Result: (100 * 1.1) + (200 * 1.1) = 330
```

### Function Composition

Building complex behavior by chaining small, single-purpose functions. Each function does one thing; composition wires them together.

```csharp
// Compose two transformations into one pipeline
Func<string, string> normalize = s => s.Trim().ToLowerInvariant();
Func<string, bool>   isValid   = s => s.Length >= 3 && s.All(char.IsLetterOrDigit);

Func<string, bool> isValidInput = s => isValid(normalize(s));

Console.WriteLine(isValidInput("  Hello123  ")); // true
Console.WriteLine(isValidInput("  Hi  "));       // false (length < 3 after trim)
```

### Pattern Matching and Discriminated Unions

C# pattern matching (switch expressions, `is` patterns) approximates the algebraic data types common in pure FP languages like F# or Haskell.

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

The compiler warns if you miss a case — exhaustive matching eliminates null-check bugs.

## Pitfalls

### Overusing Immutability in Hot Paths

**What goes wrong**: replacing every `List<T>` with `ImmutableList<T>` in a tight loop causes O(n) allocations per operation and GC pressure.

**Why it happens**: `ImmutableList<T>` uses a tree internally; `Add` is O(log n) and allocates. `ImmutableArray<T>` is better for read-heavy scenarios but still allocates on mutation.

**Mitigation**: use immutable collections at domain boundaries (DTOs, events, value objects). Inside algorithms or builders, use mutable structures and expose an immutable snapshot at the end.

### Chaining LINQ Without Understanding Deferred Execution

**What goes wrong**: a LINQ chain is evaluated multiple times (e.g., `Count()` then `foreach`) causing double enumeration — or worse, double database queries.

**Why it happens**: LINQ is lazy by default. Each terminal operator (`ToList`, `Count`, `First`) re-executes the chain from the source.

**Mitigation**: materialize with `.ToList()` or `.ToArray()` when you need to iterate more than once. Be explicit about when evaluation happens.

```csharp
// BAD: two DB round-trips if source is IQueryable
var count = query.Count();
var items = query.ToList();

// GOOD: one round-trip
var items = query.ToList();
var count = items.Count;
```

### Ignoring Exceptions in Functional Pipelines

**What goes wrong**: a pure-looking LINQ chain throws mid-pipeline, leaving partial state or swallowing errors silently.

**Why it happens**: FP languages use `Result`/`Option` types to make failure explicit; C# doesn't enforce this.

**Mitigation**: for error-prone pipelines, use a `Result<T, TError>` pattern (or a library like `LanguageExt`) to make failure a first-class value rather than an exception.

## Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Pure FP (immutable + pure functions) | Testable, parallelizable, predictable | Verbose in C#, GC pressure at scale | Domain logic, data transformations, event handlers |
| Imperative (mutable state, loops) | Familiar, low overhead, direct | Hard to test, race-prone in concurrent code | Performance-critical inner loops, algorithms |
| Mixed (FP at boundaries, OOP inside) | Pragmatic, idiomatic C# | Requires discipline to keep boundaries clean | Most production .NET codebases |

**Decision rule**: default to immutable records and LINQ pipelines for domain logic and data transformations. Switch to mutable structures only when profiling shows a real allocation bottleneck. Never mix mutation and FP-style pipelines in the same method — pick one style per scope.

## Questions

> [!QUESTION]- What makes a function "pure" and why does purity matter for testing?
> - A pure function has no side effects and is referentially transparent: same inputs always produce the same output.
> - No side effects means no I/O, no global state reads/writes, no exceptions from external dependencies.
> - Testing cost: pure functions need zero mocks — just call with inputs and assert outputs.
> - Parallelism: pure functions are safe to run concurrently without locks.
> - Tradeoff: real systems need side effects (DB writes, HTTP calls). The FP discipline is to push side effects to the edges and keep the core logic pure.

> [!QUESTION]- How does immutability prevent bugs in concurrent code?
> - Shared mutable state is the root cause of race conditions: two threads read-modify-write the same object.
> - Immutable objects can be shared freely across threads — no lock needed because no mutation is possible.
> - In C#: `record` types with `init`-only properties, `ImmutableDictionary<K,V>`, `string` (already immutable).
> - Cost: every "mutation" allocates a new object. Acceptable for domain events and DTOs; expensive for high-frequency data structures.
> - Tradeoff: immutability shifts cost from runtime synchronization to GC pressure. Profile before applying everywhere.

> [!QUESTION]- When would you choose LINQ over a manual loop in production code?
> - LINQ: when the transformation is a pipeline of filter/map/reduce steps and readability matters more than micro-performance.
> - Manual loop: when you need early exit with complex state, when profiling shows LINQ overhead is significant, or when you need to avoid multiple enumerations.
> - Key risk with LINQ: deferred execution — materializing with `.ToList()` at the right point is non-obvious and a common source of double-query bugs.
> - Tradeoff: LINQ is more declarative and composable; loops are more explicit about control flow and allocation. In hot paths (>10k iterations/sec), benchmark both.

## References

- [Functional programming concepts in C# (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/) — official overview of FP features in C#: LINQ, records, pattern matching, immutability.
- [LINQ documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/linq/) — complete reference for LINQ operators, deferred execution, and query syntax.
- [C# records (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) — value semantics, non-destructive mutation with `with`, and positional records.
- [Functional Programming in C# (Enrico Buonanno, Manning)](https://www.manning.com/books/functional-programming-in-c-sharp-second-edition) — practitioner book covering Option/Either types, railway-oriented programming, and applying FP patterns in real .NET codebases.
- [Why Functional Programming Matters (John Hughes)](https://www.cs.kent.ac.uk/people/staff/dat/miranda/whyfp90.pdf) — foundational paper explaining the composability benefits of higher-order functions and lazy evaluation.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Paradigms/Event-driven\|Event-driven]]
> - [[Software Engineering/06 Development Practices/Paradigms/Integration Testing\|Integration Testing]]
> - [[Software Engineering/06 Development Practices/Paradigms/OOP\|OOP]]
> - [[Software Engineering/06 Development Practices/Paradigms/Test-Driven Development\|Test-Driven Development]]
> - [[Software Engineering/06 Development Practices/Paradigms/Unit Testing\|Unit Testing]]
<!-- whats-next:end -->
