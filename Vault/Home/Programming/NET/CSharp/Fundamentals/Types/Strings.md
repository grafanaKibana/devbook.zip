---
topic:
  - Programming
subtopic:
  - NET
summary: "A string in C# is an immutable reference type where assignment copies references but any text change creates a new value."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
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

Interning can reduce duplicate literal allocations, but it should not be used blindly for large dynamic text. You can intern at runtime with `string.Intern(s)` (and probe with `string.IsInterned(s)`), but **interned strings live for the lifetime of the process** — they're rooted in the intern pool and never collected, so interning high-cardinality dynamic strings is a memory leak. Compile-time constant concatenations (`"a" + "b"`) are folded and interned by the compiler; runtime-built strings are not.

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

## Encoding and Unicode

A .NET `string` is **UTF-16**: each `char` is a 16-bit *code unit*, **not** a full character. Characters outside the Basic Multilingual Plane (emoji, some CJK) are encoded as a **surrogate pair** — two `char`s. So `"👍".Length == 2`, and indexing `s[0]` gives you half a surrogate. To iterate real Unicode scalar values use **`Rune`** (`foreach (Rune r in s.EnumerateRunes())`), and for user-perceived characters (a base letter plus combining marks = one grapheme) use **`StringInfo`/`TextElementEnumerator`**. `string.Normalize()` applies Unicode normalization (NFC/NFD) so that visually identical strings compare equal.

## Low-Allocation String Handling

For hot paths, avoid materializing intermediate strings:

- **`ReadOnlySpan<char>`** — slice and parse without allocating: `text.AsSpan(0, 5)`, and most BCL parse/format APIs accept spans.
- **`string.Create(length, state, callback)`** — build a string of known length by writing directly into its buffer, skipping a `StringBuilder` allocation.
- **Interpolated string handlers (C# 10)** — `$"..."` passed to APIs like ` logger.LogInformation` or `StringBuilder.Append` is lowered to write segments directly into a buffer, avoiding the intermediate `string` entirely (and skipping formatting when the log level is disabled).
- **`ArrayPool<char>`** — rent a scratch buffer for transformations instead of allocating per call.

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
