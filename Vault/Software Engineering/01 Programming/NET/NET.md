---
topic:
  - Programming
subtopic:
  - NET
tags:
  - FolderNote
dg-publish: true
status: Creation
level:
  - '4'
priority: High
---

# Intro

.NET is Microsoft's cross-platform runtime and framework for building production software: web APIs, background services, desktop apps, mobile clients, and cloud-native systems. It matters for backend development because it combines strong typing, high performance (consistently competitive in TechEmpower benchmarks), a mature ecosystem of libraries, and first-party support for modern patterns like dependency injection, structured logging, and health checks.

The platform has three layers worth understanding separately: the **runtime** (CLR — memory management, JIT compilation, threading), the **language** (primarily C#, with F# for functional-first work), and the **framework libraries** (ASP.NET Core for web, Entity Framework Core for data access, extensions for DI/configuration/logging). Most production issues cross these layers — a memory leak requires understanding both C# allocation patterns and GC behavior; an API performance issue might involve middleware pipeline design and async I/O.

.NET releases annually. Even-numbered releases (.NET 8, .NET 10) are LTS with three years of support. The ecosystem is open-source on GitHub, and the runtime team publishes detailed performance improvement analyses with each release.

## Questions

> [!QUESTION]- What are the three layers of the .NET platform, and why does that distinction matter?
> Runtime (CLR), language (C#/F#), and framework libraries (ASP.NET Core, EF Core, extensions).
> It matters because most production issues cross layers: a performance problem might involve language-level allocations (C#), runtime GC behavior (CLR), and framework middleware configuration (ASP.NET Core). Understanding the boundaries helps you diagnose root causes instead of applying surface-level fixes.

> [!QUESTION]- What is the difference between .NET Framework and modern .NET?
> .NET Framework is Windows-only, ships with the OS, and is in maintenance mode (4.8.x patches only). Modern .NET (.NET 5+) is cross-platform, open-source, and receives active feature development.
> Migration matters because new capabilities (Minimal APIs, native AOT, significant performance improvements) only ship in modern .NET. Framework-era patterns (OWIN, System.Web) still appear in legacy codebases that need migration.

> [!QUESTION]- Why does .NET consistently rank high in web framework benchmarks, and does that translate to application performance?
> The runtime uses tiered JIT compilation (quick startup, then optimized hot paths), the Kestrel web server is built on efficient async I/O (System.IO.Pipelines), and the framework minimizes allocations on the request path.
> However, benchmark performance does not automatically transfer to application code — you still need correct async patterns, minimal middleware, and efficient data access to realize it in production.

## Links

- [.NET documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/) — Platform overview, guides, and API reference.
- [.NET runtime (GitHub)](https://github.com/dotnet/runtime) — Source code, design docs, and issue discussions.
- [.NET release lifecycle](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) — LTS vs STS release support timelines.
- [ASP.NET Core documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/) — Web framework guide.
- [Performance improvements in .NET 9 (Stephen Toub)](https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-9/) — Practitioner walkthrough of runtime optimizations with benchmarks.
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/01 Programming|01 Programming]]
>
> **Topics**
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/ASP.NET Web API|ASP.NET Web API]]
> - [[Software Engineering/01 Programming/NET/CSharp/CSharp|CSharp]]
> - [[Software Engineering/01 Programming/NET/Other/Other|Other]]
> - [[Software Engineering/01 Programming/NET/Runtime/Runtime|Runtime]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/NET Standart|NET Standart]]
<!-- whats-next:end -->
