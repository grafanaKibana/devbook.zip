---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "3"
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

Domain-Driven Design (DDD) is an approach to software development that focuses on modeling the business domain and aligning code with a shared language and domain boundaries.

## Deeper Explanation

## Links

[CQRS.nu - Domain Driven Design FAQ](https://cqrs.nu/faq/Domain%20Driven%20Design)

## Questions

> [!QUESTION]- What is DDD (Domain-Driven Design)?
> DDD is a set of principles and patterns for building software around a rich domain model. It emphasizes:
> - Ubiquitous Language shared by developers and domain experts
> - Bounded Contexts to define clear domain boundaries
> - Tactical patterns like Entities, Value Objects, Aggregates, Repositories, Domain Events
>
> The goal is to reduce the gap between the business and the code, especially in complex domains.

## Further Reading

- [Martin Fowler - Domain Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
