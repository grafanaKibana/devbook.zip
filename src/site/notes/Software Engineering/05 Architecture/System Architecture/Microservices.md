---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/system-architecture/microservices/","noteIcon":"1"}
---


# Intro

Microservices are an architecture style where a system is split into small, independently deployable services aligned around business capabilities.

## Deeper Explanation

## Questions

> [!QUESTION]- Microservices vs monolith: what is the difference and when should you choose which?
> A monolith is a single deployable unit (often with one codebase and one process). Microservices split the system into multiple deployable services with their own boundaries and often their own data.
>
> Typical trade-offs:
> - Microservices: independent deployments and scaling, but higher operational complexity (service discovery, observability, [[Software Engineering/05 Architecture/Distributed Systems/Distributed Transactions\|distributed transactions]], versioning, testing).
> - Monolith: simpler operations and consistency, but can become hard to evolve if it is not modular.
>
> A common path is to start with a modular monolith and extract services when there is a clear boundary and a real need.

## Links

[Microservices Pattern: Microservice Architecture pattern](https://microservices.io/patterns/microservices.html)

- [[Software Engineering/05 Architecture/System Architecture/Monolith Architecture\|Monolith Architecture]]

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/System Architecture/Monolith Architecture\|Monolith Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Serverless Architecture\|Serverless Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Service-Oriented Architecture\|Service-Oriented Architecture]]
<!-- whats-next:end -->
