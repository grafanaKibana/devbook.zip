---
publish: true
created: 2026-07-05T10:53:43.305+03:00
modified: 2026-07-05T15:49:35.371+03:00
---

# Plug-in Architecture (Microkernel)

The Plug-in (Microkernel) architecture keeps a small, stable **core** that defines extension points, and extends behavior through **plug-ins** that implement those points. The core handles the minimal set of functionality required to run; plug-ins add domain-specific features without modifying the core. This enables product variability, third-party extensions, and marketplace-style systems where features can be added or removed at runtime or deployment time.

Common examples: IDEs (VS Code extensions), browsers (add-ons), CMS platforms (WordPress plugins), and enterprise applications with customer-specific modules.

## Structure

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

## Implementation in .NET

The core defines the extension point interface:

```csharp
public interface IPlugin
{
    string Name { get; }
    void Register(IServiceCollection services);
}
```

The core loads plug-ins from a directory at startup:

```csharp
public static void LoadPlugins(IServiceCollection services, string pluginDir)
{
    foreach (var dll in Directory.EnumerateFiles(pluginDir, "*.dll"))
    {
        // Use AssemblyLoadContext for isolation (prevents version conflicts)
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

For more structured plug-in discovery, the **Managed Extensibility Framework (MEF)** provides attribute-based composition:

```csharp
[Export(typeof(IPlugin))]
public sealed class PdfPlugin : IPlugin
{
    public string Name => "PDF Export";
    public void Register(IServiceCollection services) =>
        services.AddScoped<IReportExporter, PdfReportExporter>();
}
```

## Unloading and Isolating Plug-ins

- **Hot reload / unload** — a `new AssemblyLoadContext(name, isCollectible: true)` is **collectible**: drop all references to its assemblies and types, and the runtime can unload it, freeing the DLL so you can update a plug-in without restarting the host. The catch is that _one_ lingering reference (an event handler, a cached type, a static) pins the whole context and leaks it — unloading is notoriously easy to get wrong. See [[Common Language Runtime|AssemblyLoadContext]].
- **Untrusted plug-ins are a security boundary, not just a loading concern** — a plug-in runs **in-process with full trust**: it can read your memory, secrets, and filesystem. .NET has no in-process sandbox (Code Access Security is gone). For genuinely untrusted third-party code, isolate it **out of process** (a separate process/container with least privilege, or a WASM/`Wasmtime` sandbox) and talk to it over IPC — accept the latency cost in exchange for a real trust boundary.

## Pitfalls

### Plug-in Version Conflicts

**What goes wrong**: two plug-ins depend on different versions of the same library. Loading both causes `MissingMethodException` or silent behavioral differences.

**Why it happens**: all plug-ins share the same process and CLR by default.

**Mitigation**: use `AssemblyLoadContext` to isolate each plug-in's dependencies. Each context has its own assembly resolution scope, preventing version conflicts between plug-ins.

### Unstable Extension Point Contracts

**What goes wrong**: the core's `IPlugin` interface changes, breaking all existing plug-ins.

**Why it happens**: the core evolves without treating the extension point as a public API.

**Mitigation**: version extension point interfaces explicitly. Use adapter patterns to support multiple interface versions simultaneously. Treat `IPlugin` as a public API with the same stability guarantees as a library.

## Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Plug-in architecture | Extensible without modifying core, supports third-party extensions | Complex loading, versioning challenges, security surface | Products with customer-specific modules, marketplaces, IDEs |
| Monolith with feature flags | Simpler, no loading complexity | All features in one codebase, harder to isolate | Internal applications, small teams |
| Microservices | Full isolation, independent deployment | Network overhead, distributed system complexity | High-scale, independent team ownership |

**Decision rule**: use plug-in architecture when you need runtime extensibility by third parties or when different customers need different feature sets from the same core product. For internal applications where all features are known upfront, a monolith with feature flags is simpler.

## Questions

> [!QUESTION]- How do you prevent version conflicts between plug-ins that depend on different versions of the same library?
> Use `AssemblyLoadContext` to isolate each plug-in's dependencies. Each context has its own assembly resolution scope, so plug-in A's dependency on `Newtonsoft.Json` 12.x does not conflict with plug-in B's dependency on 13.x. Cost: each context adds memory overhead and prevents type sharing across contexts — objects from one context cannot be cast to types from another.

> [!QUESTION]- How do you version extension point interfaces without breaking existing plug-ins?
> Treat the extension point interface as a public API with semantic versioning. For breaking changes, introduce a new interface version (`IPlugin`, `IPlugin2`) and support both simultaneously via an adapter. Existing plug-ins implement the old interface; new plug-ins implement the new one. The core adapts old plug-ins to the new contract. Cost: adapter proliferation over time — set a deprecation timeline and remove old interfaces after a migration window.

> [!QUESTION]- When is plug-in architecture the wrong choice?
> When all features are known upfront and no third-party extensibility is needed. The loading complexity, versioning challenges, and security surface (untrusted code running in-process) are not justified for internal applications. A monolith with feature flags is simpler and safer. Plug-in architecture earns its complexity when customers or third parties need to extend the product without modifying the core.

## References

- [AssemblyLoadContext (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.loader.assemblyloadcontext) — the .NET API for isolated plug-in loading; prevents version conflicts between plug-ins by giving each its own assembly resolution context.
- [Managed Extensibility Framework (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/framework/mef/) — MEF provides attribute-based plug-in discovery and composition for .NET applications; useful for structured extension point registration.
- [Microkernel architecture pattern (Software Architecture Patterns, O'Reilly)](https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch03.html) — Mark Richards' concise treatment of the Microkernel pattern with real-world examples and tradeoffs.
