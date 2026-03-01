---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/application-architecture/plug-in-architecture-micro-kernel/"}
---


# Intro

Microkernel (plug-in) architecture keeps a small, stable core and extends behavior via plug-ins.
You reach for it when you need product variability, third party extensions, or a marketplace style system without forking the core.
The key design work is defining the extension points and the safety boundaries between core and plug-ins.

## Deeper Explanation

### Example

Core defines an interface:

```csharp
public interface IPlugin
{
    string Name { get; }
    void Register(IPluginRegistry registry);
}
```

Core loads plug-ins (conceptual):

```csharp
var assemblies = Directory.EnumerateFiles("plugins", "*.dll");
foreach (var path in assemblies)
{
    var asm = Assembly.LoadFrom(path);
    foreach (var t in asm.GetTypes().Where(t => typeof(IPlugin).IsAssignableFrom(t) && !t.IsAbstract))
    {
        var plugin = (IPlugin)Activator.CreateInstance(t)!;
        plugin.Register(registry);
    }
}
```

## Links

- [AssemblyLoadContext](https://learn.microsoft.com/dotnet/api/system.runtime.loader.assemblyloadcontext)
- [Managed Extensibility Framework](https://learn.microsoft.com/dotnet/framework/mef/index)
- [Microkernel architecture](https://martinfowler.com/articles/microservices.html#Microkernel)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Application Architecture/Layered Architecture\|Layered Architecture]]
> - [[Software Engineering/05 Architecture/Application Architecture/MVC MVVM\|MVC MVVM]]
<!-- whats-next:end -->
