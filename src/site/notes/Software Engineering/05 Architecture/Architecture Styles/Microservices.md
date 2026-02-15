---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/architecture-styles/microservices/","noteIcon":""}
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

- [[Software Engineering/05 Architecture/Architecture Styles/Monolith Architecture\|Monolith Architecture]]

# Whats next

:LiArrowUpLeft: [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Architecture Styles/Monolith Architecture.md" data-href="Software Engineering/05 Architecture/Architecture Styles/Monolith Architecture.md" href="Software Engineering/05 Architecture/Architecture Styles/Monolith Architecture.md" class="internal-link" target="_blank" rel="noopener nofollow">Monolith Architecture</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Architecture Styles/Serverless Architecture.md" data-href="Software Engineering/05 Architecture/Architecture Styles/Serverless Architecture.md" href="Software Engineering/05 Architecture/Architecture Styles/Serverless Architecture.md" class="internal-link" target="_blank" rel="noopener nofollow">Serverless Architecture</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Architecture Styles/Service-Oriented Architecture.md" data-href="Software Engineering/05 Architecture/Architecture Styles/Service-Oriented Architecture.md" href="Software Engineering/05 Architecture/Architecture Styles/Service-Oriented Architecture.md" class="internal-link" target="_blank" rel="noopener nofollow">Service-Oriented Architecture</a></span></li></ul></div>
