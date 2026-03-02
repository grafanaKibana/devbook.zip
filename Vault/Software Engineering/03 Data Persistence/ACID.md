---
topic:
  - Data Persistence
subtopic: []
level:
  - "3"
priority: High
status: Ready To Repeat

dg-publish: true
---

# Intro

ACID (Atomicity, Consistency, Isolation, Durability) is a set of properties that guarantee database transactions are processed reliably. These four guarantees ensure that even in the face of errors, crashes, or concurrent access, the database remains in a valid state and no data is lost or corrupted.

## Deeper Explanation

[ACID](https://ru.wikipedia.org/wiki/ACID)

## Questions

> [!QUESTION]- Explain ACID
> ACID describes key transaction guarantees:
> - Atomicity: all operations in a transaction succeed or none do.
> - Consistency: committed transactions move the database between valid states (respecting constraints).
> - Isolation: concurrent transactions do not observe each other's intermediate states (controlled by isolation levels).
> - Durability: once committed, data survives crashes (via logging, checkpoints, replication, etc.).

## Links

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering|Software Engineering]]
>
> **Topics**
> - [[Software Engineering/03 Data Persistence/NoSQL/NoSQL|NoSQL]]
> - [[Software Engineering/03 Data Persistence/ORMs/ORMs|ORMs]]
> - [[Software Engineering/03 Data Persistence/SQL/SQL|SQL]]
>
> **Pages**
> - [[Software Engineering/03 Data Persistence/Caching|Caching]]
<!-- whats-next:end -->
