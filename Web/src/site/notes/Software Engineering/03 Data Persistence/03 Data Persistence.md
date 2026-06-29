---
{"dg-publish":true,"permalink":"/software-engineering/03-data-persistence/03-data-persistence/","tags":["FolderNote"],"dg-note-properties":{"topic":["Data Persistence"],"subtopic":[],"tags":["FolderNote"],"priority":"High","level":["4"],"status":"Done"}}
---


# Intro

Data persistence is how software survives a restart: storing, retrieving, and protecting state across processes and machines. The choice between SQL, NoSQL, and caching layers shapes every system's consistency guarantees, latency profile, and operational cost. Example: picking the wrong isolation level can silently corrupt data under concurrency, while an unnecessary cache adds a stale-read failure mode that did not exist before.

## Links

- [Database (Wikipedia)](https://en.wikipedia.org/wiki/Database)
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering\|Software Engineering]]
>
> **Topics**
> - [[Software Engineering/03 Data Persistence/NoSQL/NoSQL\|NoSQL]]
> - [[Software Engineering/03 Data Persistence/ORMs/ORMs\|ORMs]]
> - [[Software Engineering/03 Data Persistence/SQL/SQL\|SQL]]
>
> **Pages**
> - [[Software Engineering/03 Data Persistence/ACID\|ACID]]
> - [[Software Engineering/03 Data Persistence/Caching\|Caching]]
> - [[Software Engineering/03 Data Persistence/Connection Pooling\|Connection Pooling]]
<!-- whats-next:end -->
