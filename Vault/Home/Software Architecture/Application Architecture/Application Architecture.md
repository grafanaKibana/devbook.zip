---
topic:
  - Software Architecture
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

## Production web application request path

Trace `POST /orders` through boundaries rather than listing infrastructure as peers:

1. DNS resolves the public name; an edge or load balancer terminates TLS and routes a healthy instance.
2. The web adapter authenticates, validates transport input, and invokes one application use case.
3. The use case enforces the order invariant and commits the order plus an outbox record in one database transaction.
4. The HTTP path returns `201 Created` after the authoritative commit. Email, analytics, and search indexing do not extend this latency budget.
5. An outbox publisher sends `OrderPlaced`; independent workers update the search projection and send notifications idempotently.
6. Trace context joins the edge, application, database, outbox, broker, and workers. Metrics derive request latency, errors, queue age, and projection lag; alerts evaluate those service indicators.

Search is a read projection, not the source of truth. Logging and monitoring observe every boundary but do not sit inline as a synchronous dependency. CI/CD delivers artifacts and configuration; it is not part of a user request. This separation prevents a production architecture picture from implying that alerts, developers, or deployment tools participate in request processing.

## Trigger-action integration platforms

![[System Design 101/0656594b2ae42485f69ceb03be53f4e31e8caff6659d45de070c45da40f29717.png]]

The branded example is dated, but the mechanism is stable: a connector observes a trigger, normalizes it, evaluates filters, and invokes one or more actions with stored credentials.

For `new CRM deal -> create invoice -> notify account channel`:

1. A webhook or poller receives a provider event with a cursor or event ID.
2. The integration platform stores the run and deduplicates retries.
3. A filter checks deal stage and tenant policy.
4. The invoice connector calls the provider with an idempotency key.
5. The notification action runs only after the invoice result is recorded; failures expose retry and replay state.

This is not an API gateway. A gateway governs inbound traffic to APIs you own; an integration platform coordinates workflows across external applications. Connector breadth accelerates delivery but inherits each vendor's schema churn, quotas, retry semantics, OAuth token lifecycle, and credential blast radius. Keep high-value business invariants in an owned service and use the integration platform for replaceable coordination.

## References

- [Software architecture guide (Martin Fowler)](https://martinfowler.com/architecture/) — catalog of architecture topics and boundaries used to place application-level patterns in context.
- [ASP.NET Core hosted services](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services) — official boundary for queued background work outside an HTTP request.
- [OpenTelemetry traces](https://opentelemetry.io/docs/concepts/signals/traces/) — official span and context model for joining synchronous and asynchronous request stages.
- [OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749) — protocol definition behind delegated connector credentials and token lifecycle.
- [Production web application components](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/10-essential-components-of-a-production-web-application.md) — ByteByteGo provenance for the request-path prompt; its misleading topology visual was rejected.
- [API of APIs app integrations](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/api-of-apis-app-integrations.md) — ByteByteGo provenance for the trigger-filter-action flow; vendor branding is treated as dated context.
