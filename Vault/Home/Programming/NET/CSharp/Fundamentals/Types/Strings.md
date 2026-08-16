---
topic:
  - Programming
subtopic:
  - NET
summary: "An immutable C# reference type where any text change creates a new value."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

`string` is the C# alias for the sealed reference type `System.String`. Its contents are immutable. Assignment copies a reference, while an operation that changes text produces a different string. That boundary explains most string behavior, including when concatenation is clear and when incremental construction starts wasting allocations.

# Core Properties

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

`b = b + "!"` creates a new string object. `a` remains unchanged.

# String Interning

String literals can share an interned instance, and identical literals typically do. Object identity is not contractual. Compilation can request `NoStringInterning`, and runtime behavior may still vary:

```csharp
var s1 = "dotnet";
var s2 = "dotnet";

Console.WriteLine(object.ReferenceEquals(s1, s2)); // Typically True; identity is not contractual
```

Runtime interning is available through `string.Intern(s)`, and `string.IsInterned(s)` checks whether an equivalent value is already present. Interned entries are generally retained until the runtime terminates. Feeding the pool high-cardinality dynamic text trades ordinary garbage collection for long-lived retention, usually a bad deal. Compile-time constant concatenations (`"a" + "b"`) are folded by the compiler. Runtime-built strings are not automatically interned.

# StringBuilder

`StringBuilder` fits text assembled through repeated appends, especially in a loop or another hot path.

```csharp
var sb = new StringBuilder(capacity: 256);
for (var i = 0; i < 5; i++)
{
    sb.Append("item-").Append(i).AppendLine();
}

var result = sb.ToString();
```

The usual decision is small:

- Use interpolation or concatenation for small, one-off composition.
- Use `StringBuilder` for repeated incremental construction after the allocation cost matters.

# Encoding and Unicode

A .NET `string` stores UTF-16 code units. A `char` is one 16-bit code unit, not necessarily a complete Unicode scalar value. Characters outside the Basic Multilingual Plane use a surrogate pair, so `"👍".Length == 2` and `s[0]` returns only half of that pair.

`Rune` and `EnumerateRunes()` operate on Unicode scalar values. User-perceived characters are a different boundary again: one grapheme may contain a base character plus combining marks, so text-element APIs such as `StringInfo` are needed. `string.Normalize()` can put canonically equivalent sequences into the same normalization form before comparison.

# Low-Allocation String Handling

Hot paths sometimes need construction without intermediate strings:

- **`ReadOnlySpan<char>`** slices and parses existing text without allocating another string. Many BCL parse APIs accept spans directly.
- **`string.Create(length, state, callback)`** fills a new string of known length directly, avoiding a separate builder buffer.
- **Interpolated string handlers (C# 10)** let an API consume interpolation pieces without first creating the final string. The benefit applies only when the receiving overload accepts a handler, as `StringBuilder.Append` does.
- **`ArrayPool<char>`** rents scratch buffers for transformations. Pooling is worthwhile only when buffer allocations show up in measurement. Every rental adds ownership and clearing rules.

# Pitfalls

- Repeated `+=` in a loop creates intermediate strings. In a measured hot path, use `StringBuilder` or a pre-sized buffer to cut that churn.
- `ReferenceEquals` checks identity, and interning makes identity depend on how the string was created. Semantic comparison should use APIs that accept `StringComparison`, including `string.Equals`, `StartsWith`, `EndsWith`, and `IndexOf`.
- Culture-implicit comparison can change with the current culture. Identifiers and protocol values normally need `Ordinal` or `OrdinalIgnoreCase`. Natural-language UI text may need a culture-aware comparison instead.

# Tradeoffs

- **Interpolation or concatenation vs `StringBuilder`:** interpolation is clearer for one-off formatting. A builder pays off when text grows through repeated appends.
- **Ordinal vs culture-aware comparison:** ordinal rules are stable for technical keys. Culture-aware comparison belongs to natural-language text where locale behavior is intentional.
- **Interning vs ordinary allocation:** literals can share interned instances, but code must not depend on their identity. Forcing dynamic values into the pool can save duplicates at the price of process-long retention, so it needs a bounded value set and evidence.

# Questions

> [!QUESTION]- When should you choose `StringBuilder` over `string`?
> - Use `StringBuilder` for iterative construction (loops, batched appends, streaming transforms) where many intermediate strings would otherwise be allocated.
> - Prefer interpolation/concatenation for one-off formatting with a small number of values because readability is usually better.
> - In hot paths, benchmark both options and pre-size `StringBuilder` capacity to reduce buffer growth and copying.

> [!QUESTION]- Why can `ReferenceEquals(a, b)` be `false` even when `a == b` is `true` for strings?
> - `==` for strings compares content, while `ReferenceEquals` checks object identity.
> - Two strings can contain identical text but be different objects (for example, literal vs runtime-composed value).
> - Use `ReferenceEquals` only for diagnostics/allocation analysis, not for business equality logic.

# References

- [Best practices for strings in .NET](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings)
