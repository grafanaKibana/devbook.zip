---
topic:
  - Software Architecture
subtopic:
  - Application Architecture
summary: "Keeps a small, stable core defining extension points and extends behavior through plug-ins that implement those points without modifying the core."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
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

- **Unload is cooperative.** A `new AssemblyLoadContext(name, isCollectible: true)` can unload only after every outside reference to its assemblies, types, and instances disappears. An event handler, cached `Type`, active thread, or static reference can pin the entire context. The [[Home/Programming/NET/Runtime/Common Language Runtime|AssemblyLoadContext]] runtime boundary also determines which dependency versions and type identities an extension sees.
- **An assembly-loading boundary is not a security boundary.** In-process plug-ins can access the host's memory, secrets, and filesystem permissions. .NET does not provide an in-process sandbox for untrusted managed code. Untrusted extensions need an OS process, container, or another sandbox with least privilege, with IPC carrying the cost of the real isolation.

# Pitfalls

## Plug-in Version Conflicts

Two plug-ins may require incompatible versions of the same library. Loading every dependency into the default context can produce type-identity conflicts or failures such as `MissingMethodException`. Give each plug-in a custom `AssemblyLoadContext` and resolve its private dependencies there. The shared extension-contract assembly must still come from the host context so both sides agree on the identity of `IPlugin`.

## Unstable Extension Point Contracts

Changing `IPlugin` can break every extension at once. Treat the contract as a public library API: keep compatible changes compatible, introduce a new contract for breaking behavior, and adapt an older version only while its migration window remains open. Supporting two versions has a real maintenance cost, so deprecation needs an end date.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Plug-in architecture | Extensible without modifying core, supports third-party extensions | Complex loading, versioning challenges, security surface | Products with customer-specific modules, marketplaces, IDEs |
| Monolith with feature flags | Simpler, no loading complexity | All features in one codebase, harder to isolate | Internal applications, small teams |
| Microservices | Process and deployment isolation with explicit network boundaries | Network overhead, distributed system complexity | High-scale, independent team ownership |

Use plug-in architecture when extensions must ship independently of the core or when customers need different modules from one product. If one team owns every known feature and deploys them together, ordinary modules with feature flags are simpler.

# Questions

> [!QUESTION]- How can plug-ins use different versions of the same dependency without breaking the host contract?
> Each plug-in can load its private dependencies through its own `AssemblyLoadContext`. Plug-in A may then resolve `Newtonsoft.Json` 12.x while plug-in B resolves 13.x. The extension contract must still come from the host's default context. If a plug-in loads another copy of that contract assembly, its types have a different identity even when the name and source code match. Values should cross the boundary through the shared contract types and plain data.

> [!QUESTION]- When is plug-in architecture the wrong choice?
> It is the wrong choice when one team owns all features and releases them with the host. Dynamic loading and contract compatibility add failure modes without creating independent delivery. A modular monolith with feature flags handles that case with fewer moving parts. Plug-ins earn their cost when an extension must evolve without changing or rebuilding the core.

# References

- [AssemblyLoadContext](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.loader.assemblyloadcontext)
- [Microkernel architecture pattern](https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch03.html)
