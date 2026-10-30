---
publish: true
created: 2026-02-10T01:40:47.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-28T20:52:55.178Z
topic:
  - Software Architecture
subtopic:
  - Application Architecture
summary: Keeps a small, stable core defining extension points and extends behavior through plug-ins that implement those points without modifying the core.
level:
  - "3"
priority: High
status: Ready to Repeat
qard-deck: Software Architecture
qard-topic: Application Architecture/Plug-in Architecture (MicroKernel)
flashcard_uid: 9959d912
---

Plug-in (Microkernel) architecture puts stable product behavior in a small **core** and exposes contracts that **plug-ins** implement. The core can run without knowing any concrete extension. Features are selected at deployment or discovered at runtime, which fits products that vary by customer or accept third-party extensions.

IDEs and browsers are familiar examples. CMS platforms and enterprise products use the same structure for optional or customer-specific modules.

# How the Core Loads Extensions

```text
┌─────────────────────────────────────┐
│              Core                   │
│  - Plugin registry                  │
│  - Extension point interfaces       │
│  - Lifecycle management             │
└──────────┬──────────────────────────┘
           │ IPlugin contract
    ┌──────┴──────┐
    │             │
┌───▼───┐   ┌────▼────┐
│Plugin A│   │Plugin B │
│(PDF)   │   │(CSV)    │
└────────┘   └─────────┘
```

# Implementation in .NET

The core begins with a narrow extension contract:

```csharp
public interface IPlugin
{
    string Name { get; }
    void Register(IServiceCollection services);
}
```

At startup, the host can discover assemblies from a configured directory:

```csharp
public static void LoadPlugins(IServiceCollection services, string pluginDir)
{
    foreach (var dll in Directory.EnumerateFiles(pluginDir, "*.dll"))
    {
        // Isolates private dependency versions when resolution is configured
        var context = new PluginLoadContext(dll);
        var assembly = context.LoadFromAssemblyPath(dll);

        foreach (var type in assembly.GetTypes()
            .Where(t => typeof(IPlugin).IsAssignableFrom(t) && !t.IsAbstract))
        {
            var plugin = (IPlugin)Activator.CreateInstance(type)!;
            plugin.Register(services);
        }
    }
}
```

The example assumes that `PluginLoadContext` derives from `AssemblyLoadContext` and resolves dependencies relative to the plug-in. A separate context per plug-in keeps private dependency versions apart. The host's extension contract remains shared.

The **Managed Extensibility Framework (MEF)** is another option when attribute-based discovery and composition fit the host:

```csharp
[Export(typeof(IPlugin))]
public sealed class PdfPlugin : IPlugin
{
    public string Name => "PDF Export";
    public void Register(IServiceCollection services) =>
        services.AddScoped<IReportExporter, PdfReportExporter>();
}
```

# Unloading and Isolating Plug-ins

- **Unload is cooperative.** A `new AssemblyLoadContext(name, isCollectible: true)` can unload only after every outside reference to its assemblies, types, and instances disappears. An event handler, cached `Type`, active thread, or static reference can pin the entire context. The [[Programming/NET/Runtime/Common Language Runtime|AssemblyLoadContext]] runtime boundary also determines which dependency versions and type identities an extension sees.
- **An assembly-loading boundary is not a security boundary.** In-process plug-ins can access the host's memory, secrets, and filesystem permissions. .NET does not provide an in-process sandbox for untrusted managed code. Untrusted extensions need an OS process, container, or another sandbox with least privilege, with IPC carrying the cost of the real isolation.

# Pitfalls

## Plug-in Version Conflicts

Two plug-ins may require incompatible versions of the same library. Loading every dependency into the default context can produce type-identity conflicts or failures such as `MissingMethodException`. Each plug-in's custom `AssemblyLoadContext` resolves its private dependencies. The shared extension-contract assembly must still come from the host context so both sides agree on the identity of `IPlugin`.

## Unstable Extension Point Contracts

Changing `IPlugin` can break every extension at once. As a public library API, the contract preserves compatibility for existing consumers; breaking behavior uses a new contract, and an older version is adapted only during its migration window. Supporting two versions has a real maintenance cost, so deprecation needs an end date.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Plug-in architecture | Extensible without modifying core, supports third-party extensions | Complex loading, versioning challenges, security surface | Products with customer-specific modules, marketplaces, IDEs |
| Monolith with feature flags | Simpler, no loading complexity | All features in one codebase, harder to isolate | Internal applications, small teams |
| Microservices | Process and deployment isolation with explicit network boundaries | Network overhead, distributed system complexity | High-scale, independent team ownership |

Plug-in architecture fits when extensions must ship independently of the core or when customers need different modules from one product. If one team owns every known feature and deploys them together, ordinary modules with feature flags are simpler.

# Questions

<!-- qard-id: 1027d3cf-cce1-4c6c-b591-a16aada18738 -->

> [!qard]- What is plug-in architecture?
> Plug-in architecture lets a host application gain behavior from separately built extensions through a shared contract.
>
> It has three parts:
>
> - **Host:** the main application. It decides where extensions can fit, then finds, loads, creates and calls them.
> - **Shared contract:** an interface or abstract type that both sides reference, such as `ICommand` with a `Name` and an `Execute` method.
> - **Extensions (plug-ins):** separately built implementations of the contract.
>
> For example, an image editor can expose a filter contract and load sharpening or blur filters as extensions. The host understands how to apply a filter; each extension supplies the actual transformation.
>
> This makes supported behavior extensible, but introduces contract-compatibility and loading costs. Extensions remain limited by the host's extension points, and loading them in-process does not provide a security sandbox.
>
> [Microsoft: Create a .NET application with plugins](https://learn.microsoft.com/en-us/dotnet/core/tutorials/creating-app-with-plugin-support)

<!-- qard-id: eb5e11a7-7fb2-461d-9885-68641296b08d -->

> [!qard]- How does a plug-in add behavior through an existing host extension point?
> A plug-in adds behavior by implementing a contract that the host already defines. The host finds that implementation, creates it and calls it through the contract, without knowing the plug-in's concrete type.
>
> Example: the host's shared contract is `IExporter { string Format { get; } void Export(Document doc, Stream output); }`.
>
> 1. **Implement the contract:** `PdfExporter : IExporter` reports `pdf` as its format and writes PDF bytes.
> 2. **Build and provide it:** the extension's author compiles it separately and places it where the host looks, such as a plugins folder.
> 3. **Discover:** the host loads the plug-in and finds types that implement `IExporter`.
> 4. **Create:** the host instantiates `PdfExporter`, either directly or through DI.
> 5. **Invoke:** when the user chooses PDF, the host calls `Export(doc, stream)` the same way it calls any other exporter.
>
> **Limit:** a plug-in can only do what its extension point expresses. `IExporter` cannot add collaborative editing. That works only if the host already offers a suitable extension point for it. Otherwise, a suitable extension point must be added or changed first.
>
> [Microsoft: Create a .NET application with plugins](https://learn.microsoft.com/en-us/dotnet/core/tutorials/creating-app-with-plugin-support)

<!-- qard-id: 9cbbcde2-1003-4c4e-ace9-c6304bbb1fa0 -->

> [!qard]- When is plug-in architecture the wrong choice?
> It is usually a poor fit when one team owns the features and ships them with the host: dynamic discovery, loading, and extension-contract compatibility add work without enabling independent delivery. [Microsoft: common web application architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)

# References

- [AssemblyLoadContext](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.loader.assemblyloadcontext)
- [Microkernel architecture pattern](https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch03.html)
