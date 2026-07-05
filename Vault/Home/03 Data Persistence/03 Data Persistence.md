---
icon: database
color: "#f97316"
topic:
  - Data Persistence
subtopic: []
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Done
---

# Intro

Data persistence is how software survives a restart: storing, retrieving, and protecting state across processes and machines. The choice between SQL, NoSQL, and caching layers shapes every system's consistency guarantees, latency profile, and operational cost. Example: picking the wrong isolation level can silently corrupt data under concurrency, while an unnecessary cache adds a stale-read failure mode that did not exist before.

## Links

- [Database (Wikipedia)](https://en.wikipedia.org/wiki/Database)
