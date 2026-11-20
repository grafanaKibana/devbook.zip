---
topic: [Programming]
subtopic: [NET]
tags: [FolderNote]
publish: true
status: New
priority: High
level: ["4"]
qard-deck: "Programming"
qard-topic: "NET/Runtime/Runtime"
flashcard_uid: "7ed037a5"
created: "2026-02-10T01:40:47.000Z"
modified: "2026-11-17T09:54:57.676Z"
published: "2026-07-08T13:14:17.332Z"
---

The .NET runtime executes managed code and supplies the machinery around it: code generation, type loading, garbage collection, exception dispatch, and shared threading services. These mechanisms shape startup, throughput, latency, and memory use, but a symptom attributed to “the runtime” often begins with an application lifetime or blocking decision.

This folder follows that boundary through three notes. The CLR note covers loading and execution, the garbage-collector note covers managed allocation and reclamation, and the memory-leak note covers reachable data that the collector cannot reclaim. Together they provide the model needed to read a runtime trace without treating every pause or growing heap as the same problem.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: 85533752-810c-478c-849a-eb6486511be8 -->
> [!qard]- What happens when a .NET application starts?
> When a .NET application starts, a small native host starts the CLR, which then loads the app's entry assembly, compiles `Main` and runs it. Only that minimum is done up front, while everything else happens lazily, the first time running code needs it, so startup pays only for code that actually runs.
>
> 1. **The host starts.** The operating system can run only native code, so what launches first is a small native program, the app's executable or the `dotnet` command, which finds the right .NET runtime and starts the CLR.
> 2. **The entry assembly loads.** The CLR loads the assembly that contains `Main`, because that is where the app's own code begins.
> 3. **`Main` is compiled and runs.** `Main` is still IL at this point, so the JIT compiler turns it into machine code before it can run, unless the app was published with precompiled code.
> 4. **The rest happens on first use.** Other assemblies load when code first needs a type from them, each method is JIT-compiled on its first call, and a type's static fields are initialized before they are first used.
>
> [dotnet/runtime: Host components](https://github.com/dotnet/runtime/blob/main/docs/design/features/host-components.md) · [Microsoft: Managed execution process](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process)

> [!qard]- Why can early .NET calls have more latency than steady-state calls?
> Assembly loading, first-use code generation, and static initialization are performed as needed. The first call that reaches each mechanism pays its cost. That can happen during the first requests after deployment or scale-out, or later when a previously unused path is first exercised.
>
> ReadyToRun reduces JIT work at startup and later first use, at the cost of larger binaries. Native AOT removes runtime JIT work but restricts features such as runtime code generation. Traces identify which cost matters in the actual deployment.
>
> [dotnet/runtime: Host components](https://github.com/dotnet/runtime/blob/main/docs/design/features/host-components.md) · [Microsoft: Managed assembly loading algorithm](https://learn.microsoft.com/en-us/dotnet/core/dependency-loading/loading-managed) · [Microsoft: Managed execution process](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process) · [Microsoft: ReadyToRun compilation](https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run) · [Microsoft: Native AOT deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/) · [C# specification: Classes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes)

# References

- [.NET runtime overview](https://learn.microsoft.com/en-us/dotnet/standard/clr)
