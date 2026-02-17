---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/net-standart/","noteIcon":"1"}
---


# Intro

.NET Standard is a specification that defines a set of .NET APIs that multiple .NET runtimes agree to implement.
Historically, it was the compatibility bridge between .NET Framework, .NET Core, Mono, and Xamarin.
Today, most new code targets modern .NET (for example net8.0), and .NET Standard is mainly relevant when you need broad compatibility.

## Deeper Explanation

### Mental Model

- Targeting `netstandard2.0` means "I only use APIs that all runtimes implementing netstandard2.0 provide"
- Targeting `net8.0` means "I can use the full .NET 8 API surface"
- Multi targeting lets one library support multiple targets with conditional code

### Example

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

### Tradeoffs

- `netstandard` maximizes compatibility but limits API usage
- `netX` maximizes features and performance but narrows supported runtimes

## Questions

> [!QUESTION]- When should you still target netstandard?
> When you need to support older runtime families that cannot consume modern `netX` libraries.
> If all consumers are modern .NET, target `net8.0` instead.

> [!QUESTION]- What is the pragmatic default for new libraries today?
> Target the modern runtime you run in production.
> Add multi targeting only when you have a concrete consumer requirement.

## Links

- [.NET Standard](https://learn.microsoft.com/dotnet/standard/net-standard)
- [Target frameworks](https://learn.microsoft.com/dotnet/standard/frameworks)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/01 Programming\|01 Programming]]
>
> **Topics**
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/ASP.NET Web API\|ASP.NET Web API]]
> - [[Software Engineering/01 Programming/NET/CSharp/CSharp\|CSharp]]
> - [[Software Engineering/01 Programming/NET/Other/Other\|Other]]
> - [[Software Engineering/01 Programming/NET/Runtime/Runtime\|Runtime]]
<!-- whats-next:end -->
