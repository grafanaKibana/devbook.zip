---
publish: true
created: 2026-08-20T20:41:15.657Z
modified: 2026-08-20T20:41:15.657Z
published: 2026-08-20T20:41:15.657Z
topic:
  - Programming
subtopic:
  - NET
summary: Runtime metadata inspection and dynamic member access via System.Reflection.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

Reflection reads .NET metadata at runtime and can use that metadata to construct objects or invoke members. It is useful when the target type is genuinely unknown until execution, as in plugin discovery or tooling. The cost is a weaker contract: a misspelled member name or incompatible signature becomes a runtime failure instead of a compiler error.

Modern serializers and dependency-injection tools may combine reflection with generated code. The boundary is still the same. Runtime discovery favors flexibility. Generated or statically typed access favors earlier validation and predictable deployment.

# How It Works

The CLR exposes assembly, type, and member metadata through objects such as `Type`, `MethodInfo`, `PropertyInfo`, and `ConstructorInfo`.

A reflective operation normally has two phases: discover metadata, then optionally act on it.

1. Obtain a `Type` from `typeof(T)`, an object's `GetType()`, or a loaded assembly.
2. Select members with APIs such as `GetMethods`, `GetProperty`, or `GetConstructors`.
3. Inspect signatures and attributes before invoking anything.
4. Invoke through `MethodInfo` or construct through `Activator` only after validating the shape.

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

# Common Patterns

- Attribute-driven registration reads metadata from known types and methods.
- Plugin activation discovers types at runtime, then checks that they implement a stable interface.
- Late-bound invocation calls a member whose identity is data rather than source code.
- Analysis tools inspect assemblies without running the application behavior they describe.

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

# From Slow Reflection to Fast Access

`MethodInfo.Invoke` accepts an object array and performs runtime checks on every call. When the same method is called repeatedly, discovery can happen once and a typed delegate can carry the stable invocation contract:

```csharp
// Bind a strongly-typed delegate to a discovered method — invoked at near-direct-call speed
var action = (Action<Jobs>)method!.CreateDelegate(typeof(Action<Jobs>));
action(target); // no per-call reflection overhead

// Or compile an expression tree (works for constructors, property getters, etc.)
var ctor = Expression.Lambda<Func<Jobs>>(Expression.New(typeof(Jobs))).Compile();
```

`System.Reflection.Emit` and `DynamicMethod` generate IL at runtime. That requires dynamic-code support and does not fit Native AOT deployment. Source generators move the work to build time when the relevant shapes are known in advance.

`BindingFlags.NonPublic` can reach implementation details, but the resulting dependency is fragile under refactoring and trimming. `[UnsafeAccessor]` can bind a declared external method to a non-public member without per-call reflection. The compiler checks the accessor declaration's form, while an incorrect target still fails at runtime. This is an escape hatch for infrastructure, not a substitute for a public contract.

# Pitfalls

- Repeating member lookup and `Invoke` inside a hot loop pays discovery, argument handling, and runtime checks each time. Cache only metadata whose lifetime and load context are understood.
- Incomplete `BindingFlags` commonly produce an empty or surprising member set. State whether the search includes instance or static members, public or non-public members, and inherited declarations.
- Trimming can remove members that are only reached by an unrecognized reflective path. `DynamicallyAccessedMembers` documents requirements for types that remain statically traceable. Truly data-driven discovery may require explicit registration or a `RequiresUnreferencedCode` boundary.

# Tradeoffs

- Reflection is appropriate when the type or member is data at runtime. Interfaces and generics are clearer when the contract is known while compiling.
- `MethodInfo.Invoke` keeps one-off infrastructure small. A cached delegate earns its setup only when the same member is called repeatedly.
- Runtime discovery accepts new shapes without rebuilding the caller. Source generation gives up that openness for faster startup and a linker-visible call graph.

# Questions

> [!QUESTION]- Why is reflection often a bad default in performance-critical code?
> Reflection moves member discovery, argument validation, and dispatch to runtime. That cost is often irrelevant during startup, but repeated lookup and invocation can dominate a small hot-path operation. Measure first, then cache metadata or bind a delegate when the same member is reused.

> [!QUESTION]- How do attributes become behavior at runtime?
> An attribute only stores metadata on a type, member, or other program element. A framework uses reflection to find that metadata and decide what code to run, such as registering a test or mapping an HTTP route. The attribute itself does nothing until runtime code interprets it. A source generator can perform a similar interpretation during the build and emit direct code instead.

> [!QUESTION]- How should code choose between reflection, interfaces or generics, and source generators?
> Reflection fits cases where the types or members are genuinely unknown until runtime, such as loading plugins or inspecting external models. Interfaces and generics are simpler when the variation can be expressed as a compile-time contract. A source generator fits repeated metadata-driven work whose shapes are known during the build, especially when startup cost, trimming, or Native AOT makes runtime discovery a problem.

# References

- [Reflection overview](https://learn.microsoft.com/dotnet/fundamentals/reflection/overview)
- [Why is reflection slow?](https://mattwarren.org/2016/12/14/Why-is-Reflection-slow/)
