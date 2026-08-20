---
publish: true
created: 2026-08-20T20:41:15.660Z
modified: 2026-08-20T20:41:15.660Z
published: 2026-08-20T20:41:15.660Z
topic:
  - Programming
subtopic:
  - NET
summary: A specification of .NET APIs that multiple runtimes agree to implement.
level:
  - "4"
priority: Medium
status: Ready to Repeat
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

- A library targeting only `netstandard2.0` can miss newer APIs and platform-specific optimizations needed by modern consumers, which often pushes teams into awkward workarounds. Mitigate by adding a modern target (for example `net8.0`) and using conditional compilation only where it creates measurable value.
- Moving to `netstandard2.1` "for more APIs" can break .NET Framework consumers immediately because .NET Framework does not implement 2.1. Detect this risk by validating consumer TFM inventory before changing targets, then choose `net8.0;netstandard2.0` when broad reach is still required.
- Multi-targeting without a concrete compatibility requirement increases package/test complexity and can introduce behavior drift between targets. Keep a small target set, enforce CI for each TFM, and remove legacy targets once downstream constraints are gone.

# Tradeoffs

- **`netstandard2.0` only:** one broad asset, but no modern target-specific surface or optimization opportunities.
- **Modern `netX.0` only:** simpler testing and access to the current platform, but older consumers cannot load it.
- **Multi-targeted:** a modern implementation plus a compatibility asset, paid for with more builds, tests, conditionals, and package metadata.

# Questions

> [!QUESTION]- When is targeting .NET Standard still justified?
> The decision starts with the supported consumers. `netstandard2.0` is still justified when a library must work with .NET Framework or another runtime that cannot consume a modern `netX.0` target. Multi-targeting can keep that compatibility asset while giving current .NET applications a modern build. If every supported consumer runs current .NET, targeting only the modern TFM keeps the package simpler and exposes the newer platform APIs.

# References

- [.NET Standard](https://learn.microsoft.com/dotnet/standard/net-standard)
- [The future of .NET Standard](https://devblogs.microsoft.com/dotnet/the-future-of-net-standard/)
