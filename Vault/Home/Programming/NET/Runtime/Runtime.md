---
topic:
  - Programming
subtopic:
  - NET
summary: "The .NET CLR execution engine: JIT compilation, garbage collection, type safety, and threading."
tags: [FolderNote]
publish: true
status: Creation
priority: High
level:
  - "4"
qard-deck: "Programming"
qard-topic: "NET/Runtime/Runtime"
flashcard_uid: "7ed037a5"
---

The .NET runtime executes managed code and supplies the machinery around it: code generation, type loading, garbage collection, exception dispatch, and shared threading services. These mechanisms shape startup, throughput, latency, and memory use, but a symptom attributed to “the runtime” often begins with an application lifetime or blocking decision.

This folder follows that boundary through three notes. The CLR note covers loading and execution, the garbage-collector note covers managed allocation and reclamation, and the memory-leak note covers reachable data that the collector cannot reclaim. Together they provide the model needed to read a runtime trace without treating every pause or growing heap as the same problem.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: 85533752-810c-478c-849a-eb6486511be8 -->
> [!qard]- What does the CLR do when an application starts, and why does startup behavior matter?
> A native host starts a compatible runtime, which loads the entry assembly and its dependencies. Methods execute from usable ReadyToRun code when present or are JIT-compiled when needed; loading, static initialization, and compilation can contribute to cold-start latency. The startup path therefore affects first-request behavior even when steady-state execution is fast. [Microsoft: managed execution process](https://learn.microsoft.com/en-us/dotnet/standard/managed-execution-process) · [Microsoft: CLR overview](https://learn.microsoft.com/en-us/dotnet/standard/clr) · [Microsoft: ReadyToRun](https://learn.microsoft.com/en-us/dotnet/core/deploying/ready-to-run) · [dotnet/runtime: host components](https://github.com/dotnet/runtime/blob/main/docs/design/features/host-components.md)

# References

- [.NET runtime overview](https://learn.microsoft.com/en-us/dotnet/standard/clr)
