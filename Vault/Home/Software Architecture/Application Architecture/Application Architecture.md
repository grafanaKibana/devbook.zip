---
topic:
  - Software Architecture
subtopic:
  - Application Architecture
summary: "How a codebase is shaped into layers and modules, and where responsibilities live."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Creation
---

Application architecture divides code into presentation, application, domain, and infrastructure modules, then controls which modules may call or implement which interfaces. Onion and Clean Architecture invert dependencies so the domain remains independent of the database and web framework.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Choosing an Application Architecture

These four notes answer different questions. Traditional [[Home/Software Architecture/Application Architecture/Layered Architecture]] points dependencies down through the stack and can leave business logic coupled to data access. Onion-style layering inverts that boundary. [[Home/Software Architecture/Application Architecture/Clean Architecture]] makes the inward Dependency Rule explicit for every inner policy boundary. [[Home/Software Architecture/Application Architecture/Presentation Architecture Variants]] operates one level down, inside the presentation layer, deciding how the view, state, interaction logic, and navigation communicate. [[Home/Software Architecture/Application Architecture/Plug-in Architecture (MicroKernel)]] is orthogonal: it answers "how do others extend this product?" rather than "how do I layer my domain?"

| Style | Core idea | Dependency direction / coupling | Testability | Best fit | Cost |
| --- | --- | --- | --- | --- | --- |
| [[Home/Software Architecture/Application Architecture/Layered Architecture]] | Stack responsibilities into layers (Presentation → Application → Domain → Infrastructure) | Traditional layering points dependencies downward. An Onion variant inverts the data-access boundary so Infrastructure implements inner interfaces | Moderate — high once the data boundary is inverted. Erodes if logic leaks into anemic services | Small-to-medium apps with real but bounded domain complexity | Low to start. Over-engineering a 3-endpoint CRUD adds ceremony |
| [[Home/Software Architecture/Application Architecture/Clean Architecture]] | The most prescriptive layered variant: the explicit Dependency Rule with policy at the center (Entities → Use Cases → Interface Adapters → Frameworks) | Strict inward rule — inner layers define contracts, outer layers implement them. Enforced with architecture tests | High — Entities and Use Cases run in fast unit tests without booting the web/ORM stack | Long-lived systems with complex, valuable business policy and expected infrastructure churn | Higher upfront: ports, adapters, composition root, wiring overhead |
| [[Home/Software Architecture/Application Architecture/Presentation Architecture Variants]] | Presentation-pattern family separating data, rendering, interaction logic, and navigation within the UI layer | Scoped to the UI: the view and presentation logic are decoupled from the model. Not a whole-app dependency contract | High for controllers, view-models, presenters, update functions, and coordinators, but only for presentation concerns | MVC for server-rendered web, MVVM for bound stateful UI, and smaller variants when their seams match the interaction model | MVC is compact. Binding, messages, coordinators, and routers add progressively different forms of ceremony |
| [[Home/Software Architecture/Application Architecture/Plug-in Architecture (MicroKernel)]] | A small stable core defines extension points. Plug-ins add features through those contracts without modifying the core | Plug-ins depend on the core's extension-point contract (`IPlugin`). The core knows nothing about concrete plug-ins | Core and plug-ins test independently. Isolation (`AssemblyLoadContext`) keeps their dependencies separate | Products needing runtime or third-party extensibility: IDEs, CMSs, per-customer modules | Complex loading and versioning, plus an in-process security surface for untrusted code |

[[Home/Software Architecture/Application Architecture/Layered Architecture]] is the default; moving toward [[Home/Software Architecture/Application Architecture/Clean Architecture]] pays off only when domain policy and longevity justify the extra indirection. For a simple CRUD service, the stricter rules cost real time without protecting much. [[Home/Software Architecture/Application Architecture/Plug-in Architecture (MicroKernel)]] belongs on a different axis: it fits when others must extend the product without touching the core. [[Home/Software Architecture/Application Architecture/Presentation Architecture Variants]] is not an alternative to these but a decision inside the selected structure, governing how the presentation layer is organized.

# Production Web Application Request Path

Trace `POST /orders` through boundaries rather than listing infrastructure as peers:

1. DNS resolves the public name. An edge or load balancer terminates TLS and routes a healthy instance.
2. The web adapter authenticates, validates transport input, and invokes one application use case.
3. The use case enforces the order invariant and commits the order plus an outbox record in one database transaction.
4. The HTTP path returns `201 Created` after the authoritative commit. Email, analytics, and search indexing do not extend this latency budget.
5. An outbox publisher sends `OrderPlaced`. Independent workers update the search projection and send notifications idempotently.
6. Trace context joins the edge, application, database, outbox, broker, and workers. Metrics derive request latency, errors, queue age, and projection lag. Alerts evaluate those service indicators.

Search is a read projection, not the source of truth. Logging and monitoring observe every boundary but do not sit inline as a synchronous dependency. CI/CD delivers artifacts and configuration. It is not part of a user request. This separation prevents a production architecture picture from implying that alerts, developers, or deployment tools participate in request processing.

# Trigger-action Integration Platforms

![[Software Architecture/Software Architecture-Application Architecture-18120000.png|theme-aware]]

The branded example is dated, but the mechanism is stable: a connector observes a trigger, normalizes it, evaluates filters, and invokes one or more actions with stored credentials.

For `new CRM deal -> create invoice -> notify account channel`:

1. A webhook or poller receives a provider event with a cursor or event ID.
2. The integration platform stores the run and deduplicates retries.
3. A filter checks deal stage and tenant policy.
4. The invoice connector calls the provider with an idempotency key.
5. The notification action runs only after the invoice result is recorded. Failures expose retry and replay state.

This is not an API gateway. A gateway governs inbound traffic to APIs the organization owns. An integration platform coordinates workflows across external applications. Connector breadth accelerates delivery but inherits each vendor's schema churn, quotas, retry semantics, OAuth token lifecycle, and credential blast radius. High-value business invariants belong in an owned service; the integration platform handles replaceable coordination.

# Questions

> [!QUESTION]- How should a small CRUD service with simple domain rules be structured if growth is expected?
> Expected growth alone is not enough reason to start with the full ceremony of Clean Architecture. A layered structure is usually sufficient, provided domain logic does not leak into controllers or infrastructure code. Stricter inward dependency rules become useful when valuable business policy is repeatedly coupled to a framework, database, or external service. Ports and adapters should earn their cost through faster tests or clearer change isolation, not through the possibility that the service may become complex later.

# References

- [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)
