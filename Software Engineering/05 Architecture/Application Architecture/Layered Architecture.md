---
topic:
  - Architecture
subtopic:
  - Application Architecture
level:
  - "1"
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
# Intro

Layered architecture (also called multi-layered or n-tier) structures an application into layers with clear responsibilities and dependency directions.

## Deeper Explanation

```mermaid
graph TD
    subgraph OUTER[Infrastructure and Presentation - outermost]
        UI[Controllers and Views]
        DB[EF Core and SQL Server]
        EXT[HTTP clients and Email and File system]
    end

    subgraph MIDDLE[Application Layer]
        UC[Use Cases and Services]
        IPORT[[IOrderRepository]]
        OPORT[[IEmailSender]]
    end

    subgraph CORE[Domain Layer - innermost and zero dependencies]
        ENT[Entities and Value Objects]
        RULES[Business Rules]
        DEVT[Domain Events]
    end

    UI --> UC
    UC --> ENT
    UC --> RULES

    DB -.->|implements| IPORT
    EXT -.->|implements| OPORT
    IPORT --> ENT
    OPORT --> UC

```

**Dependency Rule**: All arrows point **inward**. The Domain knows nothing about databases, frameworks, or UI. Infrastructure implements interfaces defined by inner layers — this is why it depends inward, not the other way around.

```mermaid
graph LR
    subgraph TRADITIONAL[Traditional Layered - dependencies go down]
        direction TB
        T_UI[UI] --> T_BL[Business Logic]
        T_BL --> T_DA[Data Access]
        T_DA --> T_DB[(Database)]
    end

    subgraph ONION[Onion and Clean - dependencies go inward]
        direction TB
        O_INFRA[Infrastructure] --> O_APP[Application]
        O_UI[Presentation] --> O_APP
        O_APP --> O_DOM[Domain]
    end

```

In traditional layered architecture, UI depends on Business Logic which depends on Data Access — a top-down chain where changing the DB affects everything above. In Onion Architecture, the dependency is **inverted**: Infrastructure depends on the Domain through interfaces, so you can swap databases without touching business rules.

## Questions

> [!QUESTION]- What is multi-layered architecture?
> Multi-layered architecture splits the system into layers such as Presentation, Application (use cases), Domain (business rules), and Infrastructure/Data access. Each layer has a focused responsibility and communicates through well-defined interfaces, which improves maintainability and testability.

> [!QUESTION]- What is Onion Architecture?
> Onion Architecture is a layered style where the Domain is at the center and dependencies point inward. Outer layers (infrastructure, UI, frameworks) depend on inner layers; inner layers do not depend on details. This is usually enforced by defining abstractions (interfaces) in the inner layers and implementing them in the outer layers.

## Further Reading

- [Wikipedia - Multitier architecture](https://en.wikipedia.org/wiki/Multitier_architecture)
- [The Clean Architecture (Robert C. Martin)](https://thecleanarchitecture.com/)
