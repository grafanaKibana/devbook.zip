---
{"dg-publish":true,"permalink":"/software-engineering/03-data-persistance/acid/","noteIcon":""}
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

# Whats next

:LiArrowUpLeft: [[Software Engineering/Software Engineering\|Software Engineering]]

<h2><span>Topics</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/03 Data Persistance/ORMs/ORMs.md" data-href="Software Engineering/03 Data Persistance/ORMs/ORMs.md" href="Software Engineering/03 Data Persistance/ORMs/ORMs.md" class="internal-link" target="_blank" rel="noopener nofollow">ORMs</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/03 Data Persistance/SQL/SQL.md" data-href="Software Engineering/03 Data Persistance/SQL/SQL.md" href="Software Engineering/03 Data Persistance/SQL/SQL.md" class="internal-link" target="_blank" rel="noopener nofollow">SQL</a></span></li></ul></div><h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/03 Data Persistance/Caching.md" data-href="Software Engineering/03 Data Persistance/Caching.md" href="Software Engineering/03 Data Persistance/Caching.md" class="internal-link" target="_blank" rel="noopener nofollow">Caching</a></span></li></ul></div>
