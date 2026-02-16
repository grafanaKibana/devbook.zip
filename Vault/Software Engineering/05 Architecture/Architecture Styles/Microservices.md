---
topic:
  - "Architecture"
subtopic:
  - "Architecture Styles"
level:
  - "3"
priority: Medium
status: Ready To Repeat

dg-publish: true
---

# Intro

Microservices are an architecture style where a system is split into small, independently deployable services aligned around business capabilities.

## Deeper Explanation

## Questions

> [!QUESTION]- Microservices vs monolith: what is the difference and when should you choose which?
> A monolith is a single deployable unit (often with one codebase and one process). Microservices split the system into multiple deployable services with their own boundaries and often their own data.
>
> Typical trade-offs:
> - Microservices: independent deployments and scaling, but higher operational complexity (service discovery, observability, [[Distributed Transactions|distributed transactions]], versioning, testing).
> - Monolith: simpler operations and consistency, but can become hard to evolve if it is not modular.
>
> A common path is to start with a modular monolith and extract services when there is a clear boundary and a real need.

## Links

[Microservices Pattern: Microservice Architecture pattern](https://microservices.io/patterns/microservices.html)

- [[Monolith Architecture]]

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Architecture Styles/Monolith Architecture|Monolith Architecture]]
> - [[Software Engineering/05 Architecture/Architecture Styles/Serverless Architecture|Serverless Architecture]]
> - [[Software Engineering/05 Architecture/Architecture Styles/Service-Oriented Architecture|Service-Oriented Architecture]]
<!-- whats-next:end -->
