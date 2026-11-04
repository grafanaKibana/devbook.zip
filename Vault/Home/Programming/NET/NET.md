---
topic: [Programming]
subtopic: [NET]
summary: "Microsoft's cross-platform runtime and framework for building web, cloud, desktop, and mobile software."
tags: [FolderNote]
publish: true
status: Creation
level: ["4"]
priority: High
qard-deck: "Programming"
qard-topic: "NET/NET"
flashcard_uid: "f0f708ed"
created: "2026-02-10T01:40:47.000Z"
modified: "2026-11-02T09:03:54.806Z"
published: "2026-07-08T13:14:17.329Z"
---

.NET is a cross-platform application stack built from a runtime, base libraries, SDK tooling, languages, and higher-level frameworks. The runtime executes managed code and owns services such as garbage collection. The SDK restores, builds, tests, and publishes projects. C# and F# target the same runtime model, while ASP.NET Core and other frameworks add application-specific abstractions.

These boundaries matter during diagnosis. A memory symptom can begin with application retention and become visible through GC behavior. Slow HTTP work may come from a framework pipeline, synchronous I/O, or generated machine code. “.NET is slow” is not yet a useful hypothesis.

.NET ships annually with separate LTS and STS support tracks. Deployment policy should follow the current support lifecycle rather than assuming that a runtime remains serviced because an application still starts on it.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: 290f9386-ef5a-4148-8677-71811ce19253 -->
> [!qard]- What are the main layers of .NET?
> A practical model splits .NET into languages and compilers, SDK tooling, the runtime, the base libraries and application frameworks.
>
> | Layer | What it owns | Example of a problem it owns |
> |---|---|---|
> | Languages and compilers | Translate C#, F# or Visual Basic source into IL stored in assemblies. | A compile error, or unexpected behavior of a language feature. |
> | SDK and tools | Restore packages, then build, test and publish projects, mainly through the `dotnet` CLI. | A package-restore, build or publish failure. |
> | Runtime (CLR) | Load assemblies and run managed code: JIT compilation, garbage collection, exception handling and threading. | GC pauses, or slow startup while methods are compiled. |
> | Base libraries | Shared APIs such as collections, I/O, networking and threading primitives. | The behavior or cost of a specific API, such as a collection or stream. |
> | Application frameworks | Application models such as ASP.NET Core, WPF or .NET MAUI, including pipelines like HTTP middleware. | A slow or misordered request pipeline. |
>
>
> This is a conceptual map rather than an official fixed taxonomy; component and version boundaries can change.
>
> Sources: [Microsoft Learn: Introduction to .NET](https://learn.microsoft.com/en-us/dotnet/core/introduction) · [Microsoft Learn: Common Language Runtime overview](https://learn.microsoft.com/en-us/dotnet/standard/clr)

> [!qard]- Why does identifying the owning .NET layer help diagnose a symptom?
> Each layer owns different behavior, so naming the owning layer turns a vague symptom into a testable hypothesis. A symptom can appear elsewhere from its cause: rising memory appears as GC activity even when application code keeps objects reachable; a slow HTTP request can come from the framework pipeline, synchronous application I/O, or generated machine code. The diagnosis follows the responsible mechanism rather than treating all of .NET as one component.
>
> Sources: [Microsoft Learn: Introduction to .NET](https://learn.microsoft.com/en-us/dotnet/core/introduction) · [Microsoft Learn: Common Language Runtime overview](https://learn.microsoft.com/en-us/dotnet/standard/clr)

# References

- [.NET documentation](https://learn.microsoft.com/en-us/dotnet/)
- [.NET runtime source](https://github.com/dotnet/runtime)
- [.NET release lifecycle](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
