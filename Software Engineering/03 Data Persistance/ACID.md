---
topic:
  - Data Persistance
subtopic:
  - ACID
level:
  - "2"
priority:
  - High
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

## Deeper Explanation

[ACID](https://ru.wikipedia.org/wiki/ACID)

## Questions

> [!QUESTION]- Explain ACID
> ACID describes key transaction guarantees:
> - Atomicity: all operations in a transaction succeed or none do.
> - Consistency: committed transactions move the database between valid states (respecting constraints).
> - Isolation: concurrent transactions do not observe each other's intermediate states (controlled by isolation levels).
> - Durability: once committed, data survives crashes (via logging, checkpoints, replication, etc.).

## Further Reading
