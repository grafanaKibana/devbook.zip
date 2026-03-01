---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/fundamentals/types/strings/"}
---


# Intro

`string` in C# is a reference type (`System.String`) with immutable contents. That combination is important: assignment copies references, but any text change creates a new string value. Understanding this helps you choose between plain concatenation, interpolation, and `StringBuilder` in performance-sensitive paths.

## Deeper Explanation

### Core properties

- `string` is a sealed reference type.
- Strings are immutable in safe managed code.
- `==` and `Equals` compare string content, not object identity.

```csharp
var a = "hello";
var b = a;
b = b + "!";

Console.WriteLine(a); // hello
Console.WriteLine(b); // hello!
```

`b = b + "!"` creates a new string object; `a` remains unchanged.

### String interning

String literals are interned by default, so identical literals can share the same instance:

```csharp
var s1 = "dotnet";
var s2 = "dotnet";

Console.WriteLine(object.ReferenceEquals(s1, s2)); // True
```

Interning can reduce duplicate literal allocations, but it should not be used blindly for large dynamic text.

## StringBuilder

Use `StringBuilder` when you perform many appends in loops or build large text incrementally.

```csharp
var sb = new StringBuilder(capacity: 256);
for (var i = 0; i < 5; i++)
{
    sb.Append("item-").Append(i).AppendLine();
}

var result = sb.ToString();
```

Decision rule:

- Use `string` for small/simple composition and readability.
- Use `StringBuilder` for repeated mutations in hot paths.

## Pitfalls

- Repeated `+=` inside loops allocates many temporary strings because each concatenation creates a new instance, which increases GC pressure and latency spikes under load; prefer `StringBuilder` or pre-sized buffers for hot paths.
- Using `ReferenceEquals` for semantic equality can produce flaky logic because interning may return shared references for literals while runtime-built strings with identical content are different objects; compare with APIs that accept `StringComparison` (`string.Equals`, `StartsWith`, `EndsWith`, `IndexOf`) instead.
- Omitting `StringComparison` in comparisons/searches can cause culture-dependent bugs (for example Turkish-I casing behavior) that reproduce only in specific locales; use `Ordinal`/`OrdinalIgnoreCase` for identifiers and protocol values.

## Tradeoffs

- Interpolation/concatenation vs `StringBuilder`: interpolation is clearer for one-off formatting, while `StringBuilder` wins for repeated incremental construction in loops.
- `OrdinalIgnoreCase` vs culture-aware comparison: ordinal is faster and stable for technical keys, while culture-aware options are safer for UI-facing natural-language text.
- Interning vs normal allocation: interning can reduce duplicate literal memory, but forcing interning for dynamic strings can increase long-lived memory retention and hurt throughput.

## Questions

> [!QUESTION]- When should you choose `StringBuilder` over `string`?
> - Use `StringBuilder` for iterative construction (loops, batched appends, streaming transforms) where many intermediate strings would otherwise be allocated.
> - Prefer interpolation/concatenation for one-off formatting with a small number of values because readability is usually better.
> - In hot paths, benchmark both options and pre-size `StringBuilder` capacity to reduce buffer growth and copying.

> [!QUESTION]- Why can `ReferenceEquals(a, b)` be `false` even when `a == b` is `true` for strings?
> - `==` for strings compares content, while `ReferenceEquals` checks object identity.
> - Two strings can contain identical text but be different objects (for example, literal vs runtime-composed value).
> - Use `ReferenceEquals` only for diagnostics/allocation analysis, not for business equality logic.

> [!QUESTION]- How should string comparisons be written in production code?
> - Always call APIs that accept `StringComparison` (`string.Equals`, `StartsWith`, `EndsWith`, `IndexOf`) instead of culture-implicit overloads.
> - Use `Ordinal`/`OrdinalIgnoreCase` for identifiers, protocol values, keys, and security-sensitive comparisons.
> - Use culture-aware comparison only for user-facing natural-language text where locale behavior is expected.
> - Keep the comparison policy explicit and consistent across reads/writes to avoid cross-locale bugs.

## Links

- [System.String class](https://learn.microsoft.com/en-us/dotnet/api/system.string) - API reference and core behavior.
- [How to: Use StringBuilder in C#](https://learn.microsoft.com/en-us/dotnet/standard/base-types/stringbuilder) - Official guidance for incremental text construction.
- [Best practices for strings in .NET](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings) - Performance and correctness recommendations.
- [String comparison in .NET](https://learn.microsoft.com/en-us/dotnet/standard/base-types/comparing) - Culture/ordinal comparison rules.
- [StringBuilder performance best practices (Meziantou)](https://www.meziantou.net/stringbuilder-performance-pitfalls.htm) - Practical optimization patterns and pitfalls.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Fundamentals\|Fundamentals]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Classes\|Classes]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Delegates\|Delegates]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Events\|Events]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Records\|Records]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Structs\|Structs]]
<!-- whats-next:end -->
