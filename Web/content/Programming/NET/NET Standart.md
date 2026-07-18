---
publish: true
created: 2026-07-11T21:44:23.936Z
modified: 2026-07-18T11:30:12.752Z
published: 2026-07-18T11:30:12.752Z
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

.NET Standard is a specification that defines a set of .NET APIs that multiple .NET runtimes agree to implement.
Historically, it was the compatibility bridge between .NET Framework, .NET Core, Mono, and Xamarin.
Today, most new code targets modern .NET (for example net8.0), and .NET Standard is mainly relevant when you need broad compatibility.

# How It Works

- Targeting `netstandard2.0` means "I only use APIs that all runtimes implementing netstandard2.0 provide"
- Targeting `net8.0` means "I can use the full .NET 8 API surface"
- Multi targeting lets one library support multiple targets with conditional code

This target choice constrains the baseline reference API surface; you can still add APIs via NuGet packages, but runtime compatibility then depends on those package requirements too.

Key mechanics to remember:

- .NET Standard is a versioned API contract, not a runtime.
- `netstandard2.0` is the highest .NET Standard version that .NET Framework can consume.
- `netstandard2.1` adds APIs, but .NET Framework does not implement it.
- .NET 5+ unified platform development; no new .NET Standard versions are planned after 2.1.

## How the contract resolves at runtime

A `netstandard2.0` library references a single façade assembly, `netstandard.dll`, that contains no real implementation — just **type forwards**. At load time each type resolves (forwards) to the concrete implementation in whatever runtime is hosting the library (.NET Framework's `mscorlib`, or modern .NET's `System.Private.CoreLib`). That indirection is exactly what lets one compiled DLL run on multiple runtimes.

The **2.0 → 2.1 gap** is the practical fault line: APIs like `Span<T>`, `IAsyncEnumerable<T>`, and `Math.Clamp` are _native_ in `netstandard2.1`, but on `netstandard2.0` you get them only by adding the **`System.Memory` / `Microsoft.Bcl.AsyncInterfaces`** NuGet polyfills. Other useful packages: `Microsoft.Bcl.*` for backported BCL surface, and **`PolySharp`** for compiler-feature shims (records, `init`, `required`) — note that **`<LangVersion>` is independent of the TFM**, so you can use modern C# syntax targeting `netstandard2.0` as long as the required runtime types are polyfilled.

## Why it ended

.NET 5 unified the runtimes, so a single TFM family (`net5.0`, `net8.0`, …) now means "this exact platform," with OS-specific variants (`net8.0-android`, `net8.0-ios`, `net8.0-windows`) replacing the abstract-contract approach. .NET Standard stopped at 2.1 and exists today only as a compatibility bridge to .NET Framework.

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

- `netstandard` maximizes compatibility but limits API usage
- `netX` maximizes features and performance but narrows supported runtimes
- `net8.0;netstandard2.0` is often the pragmatic compromise for shared libraries: modern fast path plus broad reach

# Questions

> [!QUESTION]- When should you still target netstandard?
>
> - Target `netstandard2.0` when you must support .NET Framework or older ecosystem consumers that cannot load modern `netX` assemblies.
> - Prefer adding it as part of multi-targeting (`net8.0;netstandard2.0`) instead of making it your only target for new libraries.
> - If all known consumers are modern .NET, target modern `netX` directly.

# References

- [.NET Standard](https://learn.microsoft.com/dotnet/standard/net-standard) - Official contract model, version support matrix, and current guidance.
- [Cross-platform targeting for .NET libraries](https://learn.microsoft.com/dotnet/standard/library-guidance/cross-platform-targeting) - Practical targeting and multi-targeting decision rules.
- [Target frameworks in SDK-style projects](https://learn.microsoft.com/dotnet/standard/frameworks) - TFM syntax and compatibility basics.
- [The future of .NET Standard (.NET Blog)](https://devblogs.microsoft.com/dotnet/the-future-of-net-standard/) - Official rationale for the post-2.1 direction.
