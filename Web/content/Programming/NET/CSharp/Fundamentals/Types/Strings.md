---
publish: true
created: 2026-10-21T13:29:32.445Z
modified: 2026-10-21T13:29:32.445Z
published: 2026-10-21T13:29:32.445Z
topic:
  - Programming
subtopic:
  - NET
summary: An immutable C# reference type where any text change creates a new value.
level:
  - "4"
priority: Medium
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/CSharp/Fundamentals/Types/Strings
flashcard_uid: d65a72cc
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

- Interpolation or concatenation fits small, one-off composition.
- `StringBuilder` fits repeated incremental construction after the allocation cost matters.

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

- Repeated `+=` in a loop creates intermediate strings. In a measured hot path, `StringBuilder` or a pre-sized buffer cuts that churn.
- `ReferenceEquals` checks identity, and interning makes identity depend on how the string was created. Semantic comparison should use APIs that accept `StringComparison`, including `string.Equals`, `StartsWith`, `EndsWith`, and `IndexOf`.
- Culture-implicit comparison can change with the current culture. Identifiers and protocol values normally need `Ordinal` or `OrdinalIgnoreCase`. Natural-language UI text may need a culture-aware comparison instead.

# Tradeoffs

- **Interpolation or concatenation vs `StringBuilder`:** interpolation is clearer for one-off formatting. A builder pays off when text grows through repeated appends.
- **Ordinal vs culture-aware comparison:** ordinal rules are stable for technical keys. Culture-aware comparison belongs to natural-language text where locale behavior is intentional.
- **Interning vs ordinary allocation:** literals can share interned instances, but code must not depend on their identity. Forcing dynamic values into the pool can save duplicates at the price of process-long retention, so it needs a bounded value set and evidence.

# Questions

<!-- qard-id: e73d1e16-6636-4fa5-966c-6c12bab1222c -->

> [!qard]- When is `StringBuilder` a better choice than string concatenation?
> `StringBuilder` is the better choice when text is built through many appends, especially in a loop or another frequently executed path where allocations matter. For a small, fixed expression, interpolation or concatenation is clearer.
>
> The difference comes from string immutability:
>
> - **Repeated concatenation:** a `string` cannot change, so each `result += part` allocates a new string holding the accumulated text plus the new part. Each loop step leaves behind an intermediate string, and the growing text is copied again every time.
> - **`StringBuilder`:** each append writes into a mutable buffer, and `ToString()` creates the final string once. The buffer reallocates only when it runs out of capacity, so an initial capacity close to the expected final size avoids that growth.
>
> No fixed number of appends marks the switch point. The signal for a builder is repeated construction in code where measured allocation cost matters.
>
> Sources: [Microsoft Learn: Using the StringBuilder class](https://learn.microsoft.com/en-us/dotnet/standard/base-types/stringbuilder)

<!-- qard-id: cbfb80da-9ddd-4625-8352-7a13aa6b2474 -->

> [!qard]- Why can `ReferenceEquals(a, b)` be false when `a == b` is true for strings?
> They test different things. For strings, `==` compares contents: it returns true when both strings hold the same characters in the same order, using an ordinal, case-sensitive comparison. `ReferenceEquals` returns true only when both references point to the same object.
>
> Equal text can therefore live in two separate objects. Strings built at run time are not interned automatically, so two strings built from the same pieces are normally distinct instances: `==` returns true while `ReferenceEquals` returns false.
>
> Interning can make identity coincide through two different mechanisms:
>
> - **Explicit `String.Intern`:** it returns the intern pool's reference for a string with that value, adding the argument to the pool if no equal string is there yet. Equal strings passed through `String.Intern` therefore always come back as the same reference.
> - **Automatic literal interning:** identical string literals typically share one pooled instance, so `ReferenceEquals` often returns true for them. A compilation can request `NoStringInterning`, and runtime behavior may vary, so literal identity is not a dependable contract.
>
> Because identity depends on how each string was produced, `ReferenceEquals` is not a test of content. Content comparisons belong to `==` or `string.Equals`, with an explicit `StringComparison` stating the rule the data needs: ordinal comparison (`Ordinal` or `OrdinalIgnoreCase`) for protocol keys and identifiers, and culture-aware comparison for natural-language text shown to users.
>
> Sources: [Microsoft Learn: Object.ReferenceEquals](https://learn.microsoft.com/en-us/dotnet/api/system.object.referenceequals?view=net-10.0) · [Microsoft Learn: String equality operator](https://learn.microsoft.com/en-us/dotnet/api/system.string.op_equality?view=net-10.0) · [Microsoft Learn: String.Intern](https://learn.microsoft.com/en-us/dotnet/api/system.string.intern?view=net-10.0) · [Microsoft Learn: Best practices for comparing strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings)

# References

- [Best practices for strings in .NET](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings)
