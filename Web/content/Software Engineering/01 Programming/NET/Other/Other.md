---
topic:
  - Programming
subtopic:
  - NET
tags:
  - FolderNote
dg-publish: true
priority: Medium
level:
  - '3'
status: Creation
---

# Intro

Not everything in .NET fits cleanly into language/runtime buckets. This folder captures ecosystem topics that are important in practice but often context-dependent, such as legacy web hosting abstractions and real-time communication stacks. Example: use SignalR for server-push real-time updates, and study OWIN mainly for legacy ASP.NET maintenance or migration work.

## Questions

> [!QUESTION]- When should you use SignalR versus polling or server-sent events?
> Use SignalR when you need bidirectional real-time communication (chat, live dashboards, collaborative editing). SignalR abstracts the transport layer (WebSockets with SSE and long polling as fallbacks).
> Use server-sent events (SSE) when you only need server-to-client push and want a simpler protocol. Use polling when real-time is not actually needed and you want maximum simplicity and cacheability.

> [!QUESTION]- Why would a .NET team still need to understand OWIN today?
> OWIN matters for teams maintaining or migrating legacy ASP.NET Framework applications. Understanding the OWIN middleware pipeline model helps when migrating to ASP.NET Core's similar but distinct middleware pipeline, and when troubleshooting Katana-hosted services still running in production.


## Links

- [.NET documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/) — Platform overview and official references.
- [ASP.NET Core documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/) — Modern web stack guidance for middleware and real-time features.
- [ASP.NET Core diagnostic scenarios (David Fowler)](https://github.com/davidfowl/AspNetCoreDiagnosticScenarios) — Practitioner patterns for async, SignalR, and common .NET pitfalls from the ASP.NET team architect.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/NET|NET]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/Other/OWIN|OWIN]]
> - [[Software Engineering/01 Programming/NET/Other/SignalR|SignalR]]
<!-- whats-next:end -->
