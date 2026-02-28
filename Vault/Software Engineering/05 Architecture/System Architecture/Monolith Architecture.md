---
topic:
  - "Architecture"
subtopic:
  - "System Architecture"
level:
  - "4"
priority: Medium
status: Not-Started

dg-publish: true
---

# Intro

A monolith is an application deployed as a single unit.
This can be a good thing: fewer moving parts, simpler operations, and easy local development.
And it can be a bad thing because of: Slow build, hidden coupling points, worse encapsulation of the components.

## Deeper Explanation

### Tradeoffs

- Monolith vs microservices: monolith is simpler to operate; microservices enable independent deployment at higher operational cost
- Modular monolith is often a better first step than jumping to microservices

## Questions

> [!QUESTION]- What is a modular monolith?
> A monolith with explicit module boundaries, clear dependencies, and internal APIs.
> It preserves operational simplicity while controlling coupling.

> [!QUESTION]- When do microservices become justified?
> When independent deployment is a hard requirement and the team can support the operational complexity.

## Links

- [Monolith first](https://martinfowler.com/bliki/MonolithFirst.html)
- [Microservices](https://martinfowler.com/articles/microservices.html)
- [Building Microservices](https://samnewman.io/books/building_microservices/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/System Architecture/Event-Driven Architecture|Event-Driven Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Microservices|Microservices]]
> - [[Software Engineering/05 Architecture/System Architecture/Serverless Architecture|Serverless Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Service-Oriented Architecture|Service-Oriented Architecture]]
<!-- whats-next:end -->
