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
qard-deck: "Programming"
qard-topic: "NET/NET"
flashcard_uid: "f0f708ed"
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
> [!qard]- What are the main layers of .NET, and why does it help to separate them?
> A useful model separates language/compiler and SDK tooling, the runtime and base libraries, and application frameworks. They cooperate, but they own different behavior: the runtime executes managed code and provides services such as garbage collection, while frameworks add application-level pipelines. Naming the layer narrows which component owns a symptom. [Microsoft: .NET overview](https://learn.microsoft.com/en-us/dotnet/) · [Microsoft: CLR overview](https://learn.microsoft.com/en-us/dotnet/standard/clr)

# References

- [.NET documentation](https://learn.microsoft.com/en-us/dotnet/)
- [.NET runtime source](https://github.com/dotnet/runtime)
- [.NET release lifecycle](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
