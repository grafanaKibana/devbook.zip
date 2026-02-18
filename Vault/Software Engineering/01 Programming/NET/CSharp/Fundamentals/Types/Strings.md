---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Ready To Repeat
dg-publish: true
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

- Repeated `+=` in tight loops creates many temporary strings.
- Assuming `ReferenceEquals` means content equality (it does not in general).
- Forgetting culture/ordinal settings in comparisons (`StringComparison` should be explicit).

## Questions

> [!QUESTION]- What is string interning?
> It is a runtime mechanism that reuses one instance for identical interned strings (especially literals), reducing duplication.

> [!QUESTION]- When should you choose `StringBuilder` over `string`?
> Prefer `StringBuilder` when building text through many append operations, especially in loops or high-throughput paths.

> [!QUESTION]- Why is `string` considered immutable if assignment appears to change it?
> Assignment changes which object a variable points to. The original string object is never modified.

> [!QUESTION]- How should string comparisons be written in production code?
> Use overloads with explicit `StringComparison` (`Ordinal`, `OrdinalIgnoreCase`, or culture-aware options) to avoid hidden globalization bugs.

## Links

- [System.String class](https://learn.microsoft.com/en-us/dotnet/api/system.string)
- [How to: Use StringBuilder in C#](https://learn.microsoft.com/en-us/dotnet/standard/base-types/stringbuilder)
- [Best practices for strings in .NET](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings)
- [String comparison in .NET](https://learn.microsoft.com/en-us/dotnet/standard/base-types/comparing)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Fundamentals|Fundamentals]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Classes|Classes]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Delegates|Delegates]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Events|Events]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Records|Records]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Structs|Structs]]
<!-- whats-next:end -->
