---
topic: [Programming]
subtopic: [NET]
summary: "Selects behavior by an input's type, value, properties, or sequence shape."
level: ["4"]
priority: Medium
status: In Progress
publish: true
qard-deck: "Programming"
qard-topic: "NET/CSharp/Fundamentals/Pattern Matching"
created: "2026-11-02T09:03:54.806Z"
modified: "2026-11-12T10:29:34.513Z"
published: "2026-11-02T09:04:02.378Z"
---

Pattern matching tests an input's shape and can bind values from a successful match. An `is` expression returns a Boolean; a `switch` expression selects the first arm whose pattern and optional guard match. The patterns describe the case, while arm order decides which matching case wins.

Type and property patterns combine naturally when behavior depends on both runtime type and state:

```csharp
static string Describe(Shape shape) => shape switch
{
    Circle { Radius: > 10 } => "large circle",
    Circle                 => "small circle",
    Rectangle { Width: > 0, Height: > 0 } => "positive rectangle",
    null => "missing shape",
    _    => "other shape"
};

public abstract record Shape;
public record Circle(double Radius) : Shape;
public record Rectangle(double Width, double Height) : Shape;
```

A circle with radius 5 skips the first arm and matches the next. Moving the broad `Circle` arm before the specialized circle arm would make that specialized arm unreachable. Declaration, type, and property patterns do not match null; the null and discard arms make that handling explicit.

Patterns describe selection, not a closed type system. An open record hierarchy can gain another subtype. [[Home/Software Design/Paradigms/Functional Programming|Functional Programming]] discusses the design implications of representing alternatives with such hierarchies.

# List Patterns

List patterns, available from C# 11, match a sequence's length and element patterns. They work with an appropriate count/length and indexer shape, including arrays and spans; an arbitrary `IEnumerable<T>` is not sufficient.

```csharp
static string DescribeValues(ReadOnlySpan<int> values) => values switch
{
    []                    => "empty",
    [var value]           => $"one: {value}",
    [var first, var second] => $"pair: {first}, {second}",
    _                     => "many"
};
```

The two-element pattern requires exactly two elements. A slice pattern such as `[var first, ..]` allows the remaining elements without naming them. Matching does not by itself create a collection copy; [[Home/Computer Science/Data Structures/Linear Structures/Span|Span]] explains the storage and lifetime of a span view.

A switch expression needs a matching arm at run time. A missing case can produce `SwitchExpressionException`; compiler exhaustiveness diagnostics help but do not turn an open hierarchy into a closed set. A discard arm matches every remaining input, including null, so it should implement a deliberate fallback rather than conceal unsupported cases.

# Questions

> [!qard]- Why does a circle with radius 5 select `Circle` after skipping `Circle { Radius: > 10 }`?
> A switch expression selects the first arm whose complete pattern matches. The first arm requires both the Circle runtime type and a radius greater than 10. A radius of 5 fails that property condition, then satisfies the broader Circle type pattern. The broad arm must follow the specialized arm; putting it first makes the specialized arm unreachable.
>
> [Microsoft: pattern matching](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns)

> [!qard]- What sequence shape does the list pattern `[var first, var second]` require?
> Exactly two elements, which are bound to first and second. The pattern checks length as well as the individual element patterns. It can match an array or span with the required indexable shape, but not an arbitrary IEnumerable merely because it can enumerate two values. A slice pattern such as `[var first, ..]` admits any remaining number of elements.
>
> [Microsoft: list patterns](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns#list-patterns)

# References

- [C# patterns](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/patterns)
