---
topic: [Programming]
subtopic: [NET]
summary: "The .NET CLR execution engine: JIT compilation, garbage collection, type safety, and threading."
tags: [FolderNote]
publish: true
status: Creation
priority: High
level: ["4"]
qard-deck: "Programming"
qard-topic: "NET/Runtime/Runtime"
flashcard_uid: "7ed037a5"
created: "2026-02-10T01:40:47.000Z"
modified: "2026-11-02T09:03:54.806Z"
---

The .NET runtime executes managed code and supplies the machinery around it: code generation, type loading, garbage collection, exception dispatch, and shared threading services. These mechanisms shape startup, throughput, latency, and memory use, but a symptom attributed to “the runtime” often begins with an application lifetime or blocking decision.

This folder follows that boundary through three notes. The CLR note covers loading and execution, the garbage-collector note covers managed allocation and reclamation, and the memory-leak note covers reachable data that the collector cannot reclaim. Together they provide the model needed to read a runtime trace without treating every pause or growing heap as the same problem.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: 85533752-810c-478c-849a-eb6486511be8 -->
> [!qard]- What does the CLR do when an application starts?
> A native host first locates and initializes a compatible runtime and asks it to run the app. Most of the remaining work then happens on demand rather than in fixed phases. Assemblies load as code needs them. Each method runs from usable ReadyToRun precompiled code or is JIT-compiled when first needed. Static type initialization runs no later than the first use that requires it, and its exact timing depends on whether the class has an explicit static constructor.
>
> - **Host:** for an app running on CoreCLR, the app's executable or the `dotnet` command acts as a native host. It reads the runtime configuration, selects a compatible runtime, resolves the paths of the app's dependencies, initializes the CLR and requests that it run the app.
> - **Assembly loading:** the CLR loads the entry assembly in order to run it. Referenced assemblies load as needed, not necessarily before the entry point runs. Their exact load timing is unspecified and can vary with the runtime version and optimizations.
> - **Code generation:** a method needs native code before it runs, including the entry point. If its assembly contains usable ReadyToRun code for the method, that code runs. Otherwise the JIT compiler compiles the method's IL. Some methods still need the JIT in a ReadyToRun app, and tiered compilation can later replace frequently called code with more optimized code.
> - **Type initialization:** in C#, a class with an explicit static constructor is initialized when its first instance is created or a static member is first referenced. Without one, static field initializers run at an implementation-dependent time before the first use of a static field. Expensive static setup adds its cost to whichever operation reaches that boundary first.
>
>
> [dotnet/runtime: Host components](https://github.com/dotnet/runtime/blob/main/docs/design/features/host-components.md) · [Microsoft: Managed assembly loading algorithm](https://learn.microsoft.com/en-us/dotnet/core/dependency-loading/loading-managed) · [Microsoft: Managed execution process](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process) · [Microsoft: ReadyToRun compilation](https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run) · [Microsoft: Native AOT deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/) · [C# specification: Classes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes)

> [!qard]- Why can early .NET calls have more latency than steady-state calls?
> Assembly loading, first-use code generation, and static initialization are performed as needed. The first call that reaches each mechanism pays its cost. That can happen during the first requests after deployment or scale-out, or later when a previously unused path is first exercised.
>
> ReadyToRun reduces JIT work at startup and later first use, at the cost of larger binaries. Native AOT removes runtime JIT work but restricts features such as runtime code generation. Traces identify which cost matters in the actual deployment.
>
> [dotnet/runtime: Host components](https://github.com/dotnet/runtime/blob/main/docs/design/features/host-components.md) · [Microsoft: Managed assembly loading algorithm](https://learn.microsoft.com/en-us/dotnet/core/dependency-loading/loading-managed) · [Microsoft: Managed execution process](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process) · [Microsoft: ReadyToRun compilation](https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run) · [Microsoft: Native AOT deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/) · [C# specification: Classes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes)

# References

- [.NET runtime overview](https://learn.microsoft.com/en-us/dotnet/standard/clr)
