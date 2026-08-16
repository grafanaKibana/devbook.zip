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
---

The .NET runtime executes managed code and supplies the machinery around it: code generation, type loading, garbage collection, exception dispatch, and shared threading services. These mechanisms shape startup, throughput, latency, and memory use, but a symptom attributed to “the runtime” often begins with an application lifetime or blocking decision.

This folder follows that boundary through three notes. The CLR note covers loading and execution, the garbage-collector note covers managed allocation and reclamation, and the memory-leak note covers reachable data that the collector cannot reclaim. Together they provide the model needed to read a runtime trace without treating every pause or growing heap as the same problem.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

> [!QUESTION]- What does the CLR do when your application starts, and why does startup behavior matter?
> A native host selects and starts the runtime, then the loader resolves the entry assembly and dependencies. Executed methods use ReadyToRun code when available or are JIT-compiled. Tiering can replace those bodies later. Assembly loading, static initialization, JIT work, and dependency setup can all appear in cold-start latency, so traces must separate them.

# References

- [.NET runtime overview](https://learn.microsoft.com/en-us/dotnet/standard/clr)
