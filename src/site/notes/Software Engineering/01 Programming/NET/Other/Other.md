---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/other/other/","tags":["FolderNote"],"noteIcon":"3"}
---


# Intro

Not everything in .NET fits cleanly into language/runtime buckets. This folder captures ecosystem topics that are important in practice but often context-dependent, such as legacy web hosting abstractions and real-time communication stacks. Example: use SignalR for server-push real-time updates, and study OWIN mainly for legacy ASP.NET maintenance or migration work.

## What Is In This Folder

- `OWIN`: host-application boundary and middleware pipeline model used in classic ASP.NET/Katana.
- `SignalR`: real-time, bidirectional client/server messaging with hubs, groups, and scale-out concerns.

## How To Use This Folder

- Start with `SignalR` if you are building or operating modern real-time .NET systems.
- Study `OWIN` when you work with ASP.NET Framework-era services or migration projects.
- Focus on decision rules, pitfalls, and migration tradeoffs rather than memorizing APIs.

## Links

- [.NET documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/) - Platform overview and official references.
- [ASP.NET Core documentation](https://learn.microsoft.com/en-us/aspnet/core/) - Modern web stack guidance for middleware and real-time features.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/NET\|NET]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/Other/OWIN\|OWIN]]
> - [[Software Engineering/01 Programming/NET/Other/SignalR\|SignalR]]
<!-- whats-next:end -->
