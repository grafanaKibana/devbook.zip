---
publish: true
created: 2026-02-15T16:27:13.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-31T08:53:28.537Z
topic:
  - Programming
subtopic:
  - NET
summary: Runtime metadata inspection and dynamic member access via System.Reflection.
level:
  - "4"
priority: Medium
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/CSharp/Fundamentals/Reflection
flashcard_uid: a67836fc
---

Reflection reads .NET metadata at runtime and can use that metadata to construct objects or invoke members. It is useful when the target type is genuinely unknown until execution, as in plugin discovery or tooling. The cost is a weaker contract: a misspelled member name or incompatible signature becomes a runtime failure instead of a compiler error.

Modern serializers and dependency-injection tools may combine reflection with generated code. The boundary is still the same. Runtime discovery favors flexibility. Generated or statically typed access favors earlier validation and predictable deployment.

# How It Works

The CLR exposes assembly, type, and member metadata through objects such as `Type`, `MethodInfo`, `PropertyInfo`, and `ConstructorInfo`.

A reflective operation normally has two phases: discover metadata, then optionally act on it.

1. A `Type` comes from `typeof(T)`, an object's `GetType()`, or a loaded assembly.
2. Members are selected with APIs such as `GetMethods`, `GetProperty`, or `GetConstructors`.
3. Signatures and attributes are inspected before anything is invoked.
4. Invocation through `MethodInfo` or construction through `Activator` happens only after the shape is validated.

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

- Repeating member lookup and `Invoke` inside a hot loop pays discovery, argument handling, and runtime checks each time. Caching is appropriate only for metadata whose lifetime and load context are understood.
- Incomplete `BindingFlags` commonly produce an empty or surprising member set. Complete `BindingFlags` specify whether the search includes instance or static members, public or non-public members, and inherited declarations.
- Trimming can remove members that are only reached by an unrecognized reflective path. `DynamicallyAccessedMembers` documents requirements for types that remain statically traceable. Truly data-driven discovery may require explicit registration or a `RequiresUnreferencedCode` boundary.

# Tradeoffs

- Reflection is appropriate when the type or member is data at runtime. Interfaces and generics are clearer when the contract is known while compiling.
- `MethodInfo.Invoke` keeps one-off infrastructure small. A cached delegate earns its setup only when the same member is called repeatedly.
- Runtime discovery accepts new shapes without rebuilding the caller. Source generation gives up that openness for faster startup and a linker-visible call graph.

# Questions

> [!qard]- What is reflection in .NET, and what is it used for?
> Reflection is the ability of running code to inspect .NET metadata, such as assemblies, types, members and attributes, and to use that metadata to create objects or call members that the calling code does not name at compile time.
>
> It works in two phases:
>
> 1. **Inspect:** code obtains a `Type`, for example through `typeof(T)`, an object's `GetType()` or a loaded assembly. Objects such as `MethodInfo`, `PropertyInfo` and `ConstructorInfo` then describe its members, signatures and attributes.
> 2. **Act (optional):** code creates an instance of a discovered type or invokes a discovered member late-bound, for example with `Activator.CreateInstance` or `MethodInfo.Invoke`.
>
> Typical uses are reading custom attributes, examining and instantiating types from an assembly, such as plug-ins that implement a known interface, and late binding to members selected at runtime.
>
> The trade-off is a weaker contract. A misspelled member name or an incompatible signature is discovered only when the code runs, not by the compiler.
>
> [Microsoft: reflection overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/reflection/overview) · [Microsoft: attributes and reflection](https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/reflection-and-attributes/)

<!-- qard-id: d8da8524-adfb-4950-ab2b-63e723b7e7bf -->

> [!qard]- Why is reflection often a poor default in performance-critical code?
> Reflection replaces a call that the compiler binds once with work done while the program runs. A direct call is resolved during compilation. Reflection finds a member by inspecting metadata, often by name, and `MethodInfo.Invoke` then receives its arguments as an `object[]` and checks them against the member's signature on each call.
>
> On a hot path, repeating that lookup and late-bound invocation adds work to every call. The cost depends on the operation and how often it runs, so there is no universal threshold.
>
> When reflection is needed on a repeated path, the usual mitigation is to discover the member once, cache it, and bind it to a strongly typed delegate. Later calls then go through the delegate without per-call reflection. Measurement shows whether that setup cost pays off.
>
> [Microsoft: reflection overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/reflection/overview)

<!-- qard-id: 90f0caf9-8317-4634-93ef-5c2e22769e8b -->

> [!qard]- How do attributes become behavior at runtime?
> An attribute does nothing by itself. The compiler stores it as metadata on the marked type or member, and it affects runtime behavior only when some code reads that metadata and acts on it.
>
> At runtime the flow is:
>
> 1. The attribute and its arguments were recorded in the assembly's metadata when the code was compiled.
> 2. A framework or the application inspects the type or member through reflection, for example with `GetCustomAttribute<T>()`.
> 3. The consumer acts on what it finds, such as registering a handler or selecting a method to invoke.
>
> An attribute that no code reads has no runtime effect. A source generator is the build-time alternative. It reads attributes during compilation and emits ordinary code, so the behavior no longer depends on runtime reflection.
>
> [Microsoft: attributes and reflection](https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/reflection-and-attributes/) · [Microsoft: source generators overview](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/source-generators-overview)

<!-- qard-id: dd5d9187-17c9-4cc0-80a8-e3fae2d9b638 -->

> [!qard]- When do interfaces or generics, source generators, and reflection each fit best?
> The deciding question is whether the code can depend on a compile-time contract or has to work from metadata. Interfaces and generics fit when the code can name the types or operations it needs. When the work is driven by metadata instead, timing separates the other two: a source generator reads metadata visible during compilation and emits ordinary code, while reflection reads metadata while the program runs. Reflection therefore covers both types that are unknown until runtime and runtime inspection of known types, such as reading their attributes.
>
> | Mechanism | Fits when | Consequence |
> |---|---|---|
> | Interface or generic contract | The calling code can state the types or operations it needs | The compiler checks every use against the contract, and trimming can see what is used. An interface or virtual call can still select its implementation at runtime, but only among types that satisfy the compiled contract |
> | Source generator | Repetitive code can be derived from types and attributes in the compilation, such as registration code for the project's own attributed types | The work moves to build time, and the generated code is compiled, checked and trimmed like handwritten code. Types that appear only at runtime, such as plug-ins loaded later, are invisible to it |
> | Reflection | Code has to discover or read metadata at runtime, such as plug-ins loaded from a folder, members named by data, or attributes that a framework reads from known types | It is the most flexible option, but mistakes surface at runtime and repeated lookup and invocation cost more. In trimmed deployments, which include Native AOT, members reached only dynamically can be removed unless annotations such as `DynamicallyAccessedMembers` or explicit registration preserve them |
>
> [Microsoft: reflection overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/reflection/overview) · [Microsoft: attributes and reflection](https://learn.microsoft.com/en-us/dotnet/csharp/advanced-topics/reflection-and-attributes/) · [Microsoft: source generators overview](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/source-generators-overview) · [Microsoft: prepare libraries for trimming](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming) · [C# specification: function member invocation](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/expressions#1266-function-member-invocation)

# References

- [Reflection overview](https://learn.microsoft.com/dotnet/fundamentals/reflection/overview)
- [Why is reflection slow?](https://mattwarren.org/2016/12/14/Why-is-Reflection-slow/)
