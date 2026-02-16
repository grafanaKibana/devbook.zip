---
topic:
  - "Programming"
subtopic:
  - "NET"
level:
  - "4"
priority: Medium
status: Ready To Repeat

dg-publish: true
---

# Intro

ASP.NET Web API runs requests through a configurable middleware pipeline, then dispatches to an endpoint (often an MVC controller action).

## Deeper Explanation

## Questions

> [!QUESTION]- What is mapping, why is it needed, and how can it be implemented?
> Mapping is the transformation of data from one shape/type to another (for example, Domain Entity -> DTO -> API response model).
> It is used to decouple layers, hide internal details, enforce API contracts, prevent over-posting, and shape data for clients.
> Typical implementation options:
> - manual mapping (constructors, factory methods, extension methods)
> - mapping libraries (AutoMapper, Mapster)
> - code generation / source generators for mappings

> [!QUESTION]- What are serialization and deserialization?
> Serialization converts an in-memory object graph into a format that can be stored or transmitted (for example, JSON text or a binary payload).
> Deserialization is the reverse process: converting that stored/transmitted representation back into objects.
> Common uses: API payloads, persistence, caching, messaging.

> [!QUESTION]- What is JSON and why is it used?
> JSON (JavaScript Object Notation) is a lightweight text data format based on objects (name/value pairs) and arrays.
> It is widely used for data interchange, especially in HTTP APIs, because it is human-readable, language-agnostic, and easy to parse.
> In .NET, JSON is commonly handled with `System.Text.Json` (built-in) or Newtonsoft.Json.

## Links

- [ASP.NET Core web API docs](https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-8.0)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/NET|NET]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Middlewares|Middlewares]]
<!-- whats-next:end -->
