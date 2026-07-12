---
topic:
  - Architecture
subtopic:
  - Application Architecture
summary: "How a codebase is shaped into layers and modules, and where responsibilities live."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Creation
---

# Intro

Application architecture focuses on how a codebase is shaped: layers, modules, interaction patterns, and where responsibilities live. It affects testability, change speed, and how quickly new engineers can understand the system. Example: a layered design keeps domain logic independent from the database and web framework, which makes refactors safer.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Choosing an Application Architecture

These four notes answer different questions. [[Layered Architecture]] and [[Clean Architecture]] are two points on one continuum for shaping the *whole* application around a protected domain — they share the inward Dependency Rule and differ mainly in how strictly it is enforced. [[MVC MVVM]] operates one level down, inside the presentation layer, deciding how the View and its logic communicate. [[Plug-in Architecture (MicroKernel)]] is orthogonal: it answers "how do others extend this product?" rather than "how do I layer my domain?"

| Style | Core idea | Dependency direction / coupling | Testability | Best fit | Cost |
| --- | --- | --- | --- | --- | --- |
| [[Layered Architecture]] | Stack responsibilities into layers (Presentation → Application → Domain → Infrastructure), each depending only on the one below or inward | Dependencies point inward; the Onion/Clean variant inverts the data-access boundary so Infrastructure implements Domain interfaces | Moderate — high once the data boundary is inverted; erodes if logic leaks into anemic services | Small-to-medium apps with real but bounded domain complexity | Low to start; over-engineering a 3-endpoint CRUD adds ceremony |
| [[Clean Architecture]] | The most prescriptive layered variant: the explicit Dependency Rule with policy at the center (Entities → Use Cases → Interface Adapters → Frameworks) | Strict inward rule — inner layers define contracts, outer layers implement them; enforced with architecture tests | High — Entities and Use Cases run in fast unit tests without booting the web/ORM stack | Long-lived systems with complex, valuable business policy and expected infrastructure churn | Higher upfront: ports, adapters, composition root, wiring overhead |
| [[MVC MVVM]] | Presentation-pattern family separating data, rendering, and interaction logic within the UI layer (MVC's Controller vs MVVM's bound ViewModel) | Scoped to the UI: View and logic layer are decoupled from the Model; not a whole-app dependency contract | High for the logic object (thin Controller / ViewModel), but only for presentation concerns | The presentation layer — MVC for server-rendered web, MVVM for stateful desktop/mobile UI | Low for MVC; MVVM adds binding boilerplate (`INotifyPropertyChanged`, `ICommand`) |
| [[Plug-in Architecture (MicroKernel)]] | A small stable core defines extension points; plug-ins add features through those contracts without modifying the core | Plug-ins depend on the core's extension-point contract (`IPlugin`); the core knows nothing about concrete plug-ins | Core and plug-ins test independently; isolation (`AssemblyLoadContext`) keeps their dependencies separate | Products needing runtime or third-party extensibility: IDEs, CMSs, per-customer modules | Complex loading and versioning, plus an in-process security surface for untrusted code |

Default to [[Layered Architecture]] and tighten toward [[Clean Architecture]] only when domain policy and longevity justify the extra indirection — for a simple CRUD service the stricter rules cost real time without protecting much. Reach for [[Plug-in Architecture (MicroKernel)]] on a different axis entirely: when the value is letting others extend the product without touching the core. [[MVC MVVM]] is not an alternative to these but a decision *inside* whichever structure you pick, governing how the presentation layer is organized.

## References

- [Software architecture guide (Martin Fowler)](https://martinfowler.com/architecture/)
