---
topic:
  - Programming
subtopic:
  - NET
summary: "Statically typed, multi-paradigm .NET language pairing OOP, functional features, and first-class async."
tags: [FolderNote]
publish: true
status: Creation
level:
  - "4"
priority: High
---

C# is a statically typed language for .NET with object-oriented, functional, and low-level features in one type system. Its practical strength is not the number of paradigms. It is the ability to express a high-level domain model while keeping allocation, copying, asynchronous suspension, and interop costs visible when they matter.

Compile-time analysis covers definite assignment, generic constraints, pattern compatibility, and nullable-reference warnings. Those checks reduce entire classes of mistakes, but they do not prove runtime nullability, thread safety, or domain correctness. `async` and `await` are language transformations over awaitable operations. They do not send work to the thread pool by definition.

This folder separates language fundamentals from concurrency and parallelism. The first group explains types, methods, generics, errors, and reflection. The second follows work across tasks, threads, synchronization, cancellation, and shared-state boundaries.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# References

- [C# documentation](https://learn.microsoft.com/en-us/dotnet/csharp/)
- [C# language specification](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/introduction)
- [C# in Depth](https://csharpindepth.com/)
