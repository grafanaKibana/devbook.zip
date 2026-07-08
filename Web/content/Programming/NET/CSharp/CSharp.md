---
publish: true
created: 2026-07-08T16:14:17.319+03:00
modified: 2026-07-08T16:14:17.320+03:00
published: 2026-07-08T16:14:17.320+03:00
tags:
  - FolderNote
topic:
  - Programming
subtopic:
  - NET
status: Creation
level:
  - "4"
priority: High
---

# Intro

C# is a statically typed, multi-paradigm language designed for the .NET platform. It combines object-oriented fundamentals with functional programming features — pattern matching, LINQ, expression-bodied members, immutable records — and evolves with annual releases tied to .NET versions. For backend and enterprise development, C# is the primary language choice because of its type safety, mature tooling (Visual Studio, Rider, OmniSharp), and native integration with the .NET runtime.

What makes C# distinct in practice: the type system enforces correctness at compile time (nullable reference type analysis, generic constraints, pattern matching exhaustiveness), async/await is a first-class language feature wired directly into the runtime's task scheduler, and the language design committee publishes rationale for every feature on GitHub. This means you can trace _why_ a feature works the way it does, which matters when debugging edge cases or choosing between overlapping features.

The notes in this folder cover two areas: **language fundamentals** (type system, generics, methods, error handling, reflection) and **concurrency** (async/await, tasks, synchronization, thread pool behavior). Fundamentals are prerequisite knowledge for everything else in .NET; concurrency is where most production bugs and performance issues live.

## Questions

> [!QUESTION]- What makes C# a multi-paradigm language, and why does that matter for API design?
> C# supports object-oriented (classes, interfaces, inheritance), functional (LINQ, pattern matching, immutable records, expression-bodied members), and procedural styles.
> This matters because you can choose the paradigm that fits the problem: OOP for domain modeling, functional for data transformation pipelines, procedural for scripts and glue code.
> In API design, mixing paradigms intentionally (e.g., immutable records for DTOs, interfaces for extensibility, LINQ for queries) produces cleaner, more testable code than forcing everything into one style.

> [!QUESTION]- How does C#'s type system help prevent bugs at compile time?
>
> - Nullable reference types flag potential null dereferences before runtime.
> - Generic constraints enforce type relationships without casting.
> - Pattern matching with exhaustiveness checks catch missing cases in switch expressions.
> - Strong typing prevents accidental type confusion that would be runtime errors in dynamic languages.
>   The practical impact: many bugs that surface as runtime exceptions in Python or JavaScript are caught during compilation in C#.

## Links

- [C# documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/) — Official language reference and tutorials.
- [C# language specification](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/introduction) — Formal spec for edge-case behavior.
- [What's new in C# (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13) — Feature changelog per version.
- [C# language design proposals (GitHub)](https://github.com/dotnet/csharplang/tree/main/proposals) — Design rationale and discussion for language features.
- [C# in Depth (Jon Skeet)](https://csharpindepth.com/) — Practitioner deep-dive into language mechanics and evolution.
