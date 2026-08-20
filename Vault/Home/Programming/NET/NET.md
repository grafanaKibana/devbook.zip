---
topic:
  - Programming
subtopic:
  - NET
summary: "Microsoft's cross-platform runtime and framework for building web, cloud, desktop, and mobile software."
tags: [FolderNote]
publish: true
status: Creation
level:
  - "4"
priority: High
---

.NET is a cross-platform application stack built from a runtime, base libraries, SDK tooling, languages, and higher-level frameworks. The runtime executes managed code and owns services such as garbage collection. The SDK restores, builds, tests, and publishes projects. C# and F# target the same runtime model, while ASP.NET Core and other frameworks add application-specific abstractions.

These boundaries matter during diagnosis. A memory symptom can begin with application retention and become visible through GC behavior. Slow HTTP work may come from a framework pipeline, synchronous I/O, or generated machine code. “.NET is slow” is not yet a useful hypothesis.

.NET ships annually with separate LTS and STS support tracks. Deployment policy should follow the current support lifecycle rather than assuming that a runtime remains serviced because an application still starts on it.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

> [!QUESTION]- What are the main layers of .NET, and why does it help to separate them?
> The main layers are the language and compiler, the runtime and base libraries, and the application frameworks and SDK tooling. Separating them makes diagnosis more precise. A C# allocation decision can create pressure that appears in the GC, while an ASP.NET Core middleware decision can tie up thread-pool workers. Identifying the layer that owns the behavior narrows where to measure and fix it.

# References

- [.NET documentation](https://learn.microsoft.com/en-us/dotnet/)
- [.NET runtime source](https://github.com/dotnet/runtime)
- [.NET release lifecycle](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
