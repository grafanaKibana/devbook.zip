---
topic:
  - Programming
subtopic:
  - NET
tags:
  - FolderNote
dg-publish: true
level:
  - '4'
priority: High
status: Creation
---

# Intro

C# fundamentals are the language building blocks that appear in every .NET codebase: the type system, method signatures, generics, error handling, namespaces, iteration patterns, and runtime introspection through reflection. Understanding these deeply matters because most bugs and design mistakes in production code trace back to fundamental misunderstandings — incorrect value/reference semantics, swallowed exceptions, reflection misuse, or leaky generic constraints.

These are not beginner topics with a ceiling. A senior developer's edge comes from knowing the mechanics well enough to predict behavior in edge cases: what happens when you box a struct through an interface, why a `foreach` over a custom type requires specific patterns, or when reflection becomes a correctness risk rather than just a performance cost.

## Questions

> [!QUESTION]- Which access modifiers exist in C# and what are the defaults?
> `public`, `private`, `protected`, `internal`, `protected internal`, `private protected`.
> Fields and methods default to `private`. Top-level classes and structs default to `internal`.
> This matters because incorrect access assumptions are a common source of "it compiles locally but fails from another assembly" issues.

> [!QUESTION]- What is implicit typing (`var`) and when should you use it?
> `var` tells the compiler to infer the variable's static type from the initializer expression. The variable is still strongly typed at compile time — only the declaration is shorter.
> Use `var` when the type is obvious from context (e.g., `var list = new List<string>()`). Avoid `var` when the right-hand side does not make the type immediately clear, because it hurts readability for other developers.

> [!QUESTION]- What is a variable in terms of the C# type system?
> A variable is a named, typed storage location that holds either a value (for value types) or a reference to an object (for reference types). The declared type determines what operations are valid and how assignment and parameter passing behave.

## Links

- [C# fundamentals (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/) — Official guide to types, classes, and core language features.
- [C# programming guide (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/) — In-depth coverage of language concepts.
- [Framework design guidelines: member design (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/member) — Design conventions for methods, properties, and constructors.
- [Effective C# (Bill Wagner)](https://www.oreilly.com/library/view/effective-c-50/9780135159941/) — Practitioner guide to idiomatic C# patterns and common mistakes.
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp|CSharp]]
>
> **Topics**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Types|Types]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Exception Handling|Exception Handling]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Foreach|Foreach]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Generics|Generics]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Methods|Methods]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Namespaces|Namespaces]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Reflection|Reflection]]
<!-- whats-next:end -->
