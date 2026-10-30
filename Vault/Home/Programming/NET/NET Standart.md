---
topic: [Programming]
subtopic: [NET]
summary: "A specification of .NET APIs that multiple runtimes agree to implement."
level: ["4"]
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "Programming"
qard-topic: "NET/NET Standart"
flashcard_uid: "60a3e364"
created: "2026-02-10T01:40:47.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

.NET Standard is a versioned API specification implemented by several .NET runtimes. It was the compatibility bridge among .NET Framework, .NET Core, Mono, and Xamarin. Modern libraries normally target the current .NET TFM directly. `netstandard2.0` remains useful when a library must also serve .NET Framework or older consumers.

# How It Works

- Targeting `netstandard2.0` selects that contract as the compile-time reference surface.
- Targeting a modern `netX.0` TFM selects the APIs and runtime assumptions for that .NET release.
- Multi-targeting lets one package compile separate assemblies for consumers with different capabilities.

This target choice constrains the baseline reference API surface. NuGet packages can add APIs, but runtime compatibility then depends on those package requirements too.

Key mechanics to remember:

- .NET Standard is a versioned API contract, not a runtime.
- `netstandard2.0` is the highest .NET Standard version that .NET Framework can consume.
- `netstandard2.1` adds APIs, but .NET Framework does not implement it.
- .NET 5+ unified platform development. No new .NET Standard versions are planned after 2.1.

## How the Contract Resolves at Runtime

Compilation uses .NET Standard reference assemblies, including `netstandard.dll`, to constrain which contract members are available. At runtime, assembly unification and type forwarding bind those references to implementations supplied by the host. Compatibility therefore has two tests: the host must implement the target standard, and every additional package must support that host.

The 2.0-to-2.1 gap is the practical fault line. Some APIs associated with newer contracts can be supplied to a `netstandard2.0` target by packages such as `System.Memory` or `Microsoft.Bcl.AsyncInterfaces`, but a package is not proof that every runtime behavior is equivalent. Language version is a separate choice from TFM. Modern syntax can compile for an older target only when its required runtime types and members are available, sometimes through small compiler-support shims.

## Why it Ended

.NET 5 introduced the unified `netX.0` TFM family, with platform-specific variants for APIs tied to an operating system or application model. No .NET Standard version is planned after 2.1. The older contract remains a compatibility tool rather than the default target for new code.

## Example

Library that wants maximum compatibility:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
  </PropertyGroup>
</Project>
```

Library that ships for modern .NET and still supports older apps:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>net8.0;netstandard2.0</TargetFrameworks>
  </PropertyGroup>
</Project>
```

Conditional code for modern-only APIs while keeping compatibility target:

```csharp
#if NET8_0_OR_GREATER
Span<byte> buffer = stackalloc byte[256];
#else
var buffer = new byte[256];
#endif
```

# Pitfalls

- A library targeting only `netstandard2.0` can miss newer APIs and platform-specific optimizations needed by modern consumers, which often pushes teams into awkward workarounds. Adding a modern target (for example `net8.0`) mitigates this, with conditional compilation limited to places where it creates measurable value.
- Moving to `netstandard2.1` "for more APIs" can break .NET Framework consumers immediately because .NET Framework does not implement 2.1. Validating consumer TFM inventory before changing targets detects this risk, and `net8.0;netstandard2.0` is the choice when broad reach is still required.
- Multi-targeting without a concrete compatibility requirement increases package/test complexity and can introduce behavior drift between targets. A small target set, CI enforced for each TFM, and removal of legacy targets once downstream constraints are gone keep that complexity and drift contained.

# Tradeoffs

- **`netstandard2.0` only:** one broad asset, but no modern target-specific surface or optimization opportunities.
- **Modern `netX.0` only:** simpler testing and access to the current platform, but older consumers cannot load it.
- **Multi-targeted:** a modern implementation plus a compatibility asset, paid for with more builds, tests, conditionals, and package metadata.

# Questions

<!-- qard-id: bec5a750-95b9-4d12-a09a-76e78858812c -->
> [!qard]- When is targeting .NET Standard still justified?
> Targeting .NET Standard is justified when one library build must be usable on more than one .NET implementation, which in practice usually means .NET Framework consumers remain. `netstandard2.0` is the highest version .NET Framework can consume, so it is the target that keeps that reach. When every consumer runs modern .NET, a modern `netX.0` target is the better default.
>
> .NET Standard is a versioned API contract, not a runtime, and meeting the contract does not by itself guarantee that a library runs on a given host. Targeting a version fixes the baseline reference API surface the library compiles against. Each .NET implementation supports particular .NET Standard versions starting from particular releases, so a consumer can use the library only on an implementation release that supports the targeted version. Compatible NuGet packages can add APIs beyond that baseline, and every package dependency must then also support the consumer's platform. After .NET 5 unified the target frameworks, no new .NET Standard versions are planned beyond 2.1.
>
> | Target | Consumers that can use it | Cost |
> |---|---|---|
> | `netstandard2.0` only | Releases of .NET Framework, .NET Core, Mono, Xamarin and modern .NET that implement 2.0 | Limited to the 2.0 baseline plus APIs from compatible packages, with no modern-target APIs or optimizations |
> | `netstandard2.1` | Implementations and releases that support 2.1, including modern .NET, but not .NET Framework | Gives up .NET Framework reach without the full modern API set |
> | Modern `netX.0` only | Apps on that .NET version or later | .NET Framework and older runtimes cannot load it |
> | Multi-target, such as `net8.0;netstandard2.0` | Both groups, each receiving the assembly built for it | More builds, tests, conditional code and package metadata, justified only when distinct consumer groups need distinct assets |
>
> Modern .NET implements .NET Standard 2.1 and earlier, so an existing `netstandard2.0` library can keep serving modern consumers, provided its package dependencies also support those runtimes. Retargeting is worthwhile when the library needs APIs or features that only a newer target provides.
>
> Sources: [Microsoft Learn: .NET Standard](https://learn.microsoft.com/en-us/dotnet/standard/net-standard) · [.NET Blog: The future of .NET Standard](https://devblogs.microsoft.com/dotnet/the-future-of-net-standard/)

# References

- [.NET Standard](https://learn.microsoft.com/dotnet/standard/net-standard)
- [The future of .NET Standard](https://devblogs.microsoft.com/dotnet/the-future-of-net-standard/)
