---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/patterns/cqrs/","noteIcon":"1"}
---


# Intro

CQRS is an architectural pattern that separates write operations (commands) from read operations (queries).

## Deeper Explanation

```mermaid
graph LR
    subgraph CLIENT[Client]
        U[User Action]
    end

    subgraph WRITE[Write Side - optimized for consistency]
        CMD[PlaceOrderCommand]
        CH[Command Handler]
        VAL{Validate business rules}
        WM[(Normalized Write DB)]
    end

    subgraph READ[Read Side - optimized for queries]
        QRY[GetOrderSummaryQuery]
        QH[Query Handler]
        RM[(Denormalized Read DB)]
    end

    U -->|Mutate state| CMD
    CMD --> CH
    CH --> VAL
    VAL -->|Valid| WM
    VAL -->|Invalid| ERR([Reject with error])

    U -->|Fetch data| QRY
    QRY --> QH
    QH --> RM
    RM --> VIEW([Fast flat response])

    WM -.->|Async projection or event| RM
```

The key insight: the **write model** is normalized and enforces business rules, while the **read model** is denormalized and shaped for fast queries. They can use different databases, different schemas, or even different technologies. The trade-off is **eventual consistency** between the two sides.

## Questions

> [!QUESTION]- What is CQRS?
> CQRS (Command Query Responsibility Segregation) separates the model used for writes (commands that change state) from the model used for reads (queries that return data). This can simplify complex domains and enable different scaling/optimization strategies for reads vs writes. It adds complexity (more moving parts, eventual consistency when using separate read stores), so it is usually applied where the benefits justify the cost.

## Links

- [CQRS.nu - Command and Query Responsibility Segregation](https://cqrs.nu/faq/Command%20and%20Query%20Responsibility%20Segregation)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Patterns/Circut Breaker\|Circut Breaker]]
> - [[Software Engineering/05 Architecture/Patterns/CQS\|CQS]]
> - [[Software Engineering/05 Architecture/Patterns/Dependency Injection\|Dependency Injection]]
> - [[Software Engineering/05 Architecture/Patterns/Design Patterns\|Design Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Domain-Driven Development\|Domain-Driven Development]]
> - [[Software Engineering/05 Architecture/Patterns/Event Sourcing\|Event Sourcing]]
> - [[Software Engineering/05 Architecture/Patterns/Event-Driven Architecture\|Event-Driven Architecture]]
> - [[Software Engineering/05 Architecture/Patterns/GRASP\|GRASP]]
> - [[Software Engineering/05 Architecture/Patterns/Repository & UoW\|Repository & UoW]]
<!-- whats-next:end -->
