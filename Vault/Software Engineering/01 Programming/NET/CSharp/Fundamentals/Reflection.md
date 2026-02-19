---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Ready To Repeat
dg-publish: true
---

# Intro

Reflection is runtime metadata inspection and dynamic member access through `System.Reflection`. It is the mechanism behind many framework features (DI containers, serializers, test discovery, plugin loading), but it trades compile-time guarantees for runtime flexibility. In practice, use reflection when the target type/member is unknown until runtime, and avoid it on hot paths unless you cache metadata or compile delegates.

## How It Works

At runtime, the CLR exposes assembly/type/member metadata via objects like `Type`, `MethodInfo`, `PropertyInfo`, and `ConstructorInfo`.

Typical flow:

1. Get a `Type` (`typeof(T)`, `obj.GetType()`, or loading an assembly).
2. Select members using APIs like `GetMethods`, `GetProperty`, `GetConstructors` with `BindingFlags`.
3. Read metadata (`Name`, `Attributes`, parameters, custom attributes).
4. Optionally invoke dynamically (`MethodInfo.Invoke`) or construct instances (`Activator.CreateInstance`).

```csharp
using System;
using System.Linq;
using System.Reflection;

Type t = typeof(string);
MethodInfo[] publicInstanceMethods = t.GetMethods(BindingFlags.Public | BindingFlags.Instance);

foreach (var m in publicInstanceMethods)
{
    Console.WriteLine($"{m.Name}({string.Join(", ", m.GetParameters().Select(p => p.ParameterType.Name))})");
}
```

## Common Patterns

- Attribute-driven behavior: scan types/members and read attributes to decide routing, validation, serialization, or registration.
- Dynamic activation: create objects from discovered types (for example, plugin types implementing an interface).
- Late-bound invocation: call members by name when contracts are not known at compile time.
- Metadata analysis tools: generate docs, diagnostics, or code based on assembly/type information.

Example (attribute lookup + invoke):

```csharp
using System;
using System.Linq;
using System.Reflection;

[AttributeUsage(AttributeTargets.Method)]
public sealed class JobAttribute : Attribute
{
    public string Name { get; }
    public JobAttribute(string name) => Name = name;
}

public sealed class Jobs
{
    [Job("rebuild-index")]
    public void RebuildIndex() => Console.WriteLine("Index rebuilt");
}

var target = new Jobs();
var method = typeof(Jobs)
    .GetMethods(BindingFlags.Public | BindingFlags.Instance)
    .FirstOrDefault(m => m.GetCustomAttribute<JobAttribute>()?.Name == "rebuild-index");

method?.Invoke(target, null);
```

## Pitfalls

- Reflection is slower than direct calls because it does metadata lookup, boxing, and runtime checks; repeated uncached lookups (`GetMethod`/`GetProperty` in loops) can become a major throughput bottleneck. Cache `MemberInfo` and prefer compiled delegates for hot paths.
- `BindingFlags` mistakes often return empty results or surprising member sets (for example, missing `Instance`/`Static` or `Public`/`NonPublic` combinations). Always specify flags explicitly and test inherited/non-public scenarios.
- Reflection-heavy code can fail under trimming/AOT when required members are removed because the linker cannot infer dynamic access. For types known at compile time, use linker annotations like `DynamicallyAccessedMembers`; for truly dynamic scenarios (for example plugin type names from config), expect `RequiresUnreferencedCode` warnings and consider explicit registration or source generation.

## Tradeoffs

- Reflection vs interfaces/generics: reflection is more flexible for unknown types, while interfaces/generics are faster, safer, and easier to refactor.
- Reflection invocation vs compiled delegates: `MethodInfo.Invoke` is simpler but slower; delegate compilation has upfront complexity but pays off for repeated calls.
- Runtime discovery vs source generation: runtime discovery minimizes build-time setup, while source generation improves startup/performance and is more trim/AOT friendly.

## Questions

> [!QUESTION]- Why is reflection often a bad default in performance-critical code?
> Reflection shifts work from compile time to runtime: member discovery, argument handling, and dynamic dispatch all add overhead compared to direct calls.
> The cost is usually acceptable for startup/configuration paths, but on hot paths it compounds quickly.
> Practical rule: cache metadata and use compiled delegates when repeated invocation is required.

> [!QUESTION]- What is an attribute and why is reflection central to attribute-driven frameworks?
> An attribute is metadata attached to code elements (types, methods, properties, parameters).
> Frameworks inspect these attributes at runtime (or generation time) to apply conventions like routing, validation, serialization, and test discovery.
> Without reflection (or generated equivalents), this metadata would remain passive and unused.

> [!QUESTION]- When should you choose reflection versus alternatives like interfaces, generics, or source generators?
> Choose reflection when the shape of types/members is unknown until runtime (plugin ecosystems, late-bound tooling, extensibility points).
> Prefer interfaces/generics when contracts are known at compile time because they provide stronger safety and better performance.
> Prefer source generators in reflection-heavy infrastructure when you need predictable startup, high throughput, or trim/AOT compatibility.

## Links

- [Reflection overview (.NET)](https://learn.microsoft.com/dotnet/fundamentals/reflection/overview) - Official conceptual model and API surface summary.
- [Reflection and attributes (C#)](https://learn.microsoft.com/dotnet/csharp/advanced-topics/reflection-and-attributes/) - Attribute-focused usage patterns in C# code.
- [Type.GetMembers and BindingFlags behavior](https://learn.microsoft.com/dotnet/api/system.type.getmembers) - Exact member lookup semantics and edge cases.
- [Fixing trim warnings for reflection](https://learn.microsoft.com/dotnet/core/deploying/trimming/fixing-warnings) - Practical guidance for trimming/AOT-safe reflection.
- [Why is Reflection slow? (Matt Warren)](https://mattwarren.org/2016/12/14/Why-is-Reflection-slow/) - Performance internals and benchmark-driven intuition.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp|CSharp]]
>
> **Topics**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Types/Types|Types]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Exception Handling|Exception Handling]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Foreach|Foreach]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Generics|Generics]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Methods|Methods]]
> - [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Namespaces|Namespaces]]
<!-- whats-next:end -->
