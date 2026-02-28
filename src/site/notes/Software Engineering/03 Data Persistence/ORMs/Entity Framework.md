---
{"dg-publish":true,"permalink":"/software-engineering/03-data-persistence/or-ms/entity-framework/","noteIcon":"3"}
---


# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- How to choose Code First vs Database First?
> Use Code First when you want the code model to be the source of truth (new projects, strong domain model, migrations as part of delivery). Use Database First when you already have a database schema you must integrate with (legacy DB, shared DB, strict DBA-controlled schema) and want to generate the model from it.

> [!QUESTION]- What inheritance mapping strategies exist in Entity Framework?
> The common strategies are: TPH (Table Per Hierarchy, single table with a discriminator), TPT (Table Per Type, separate table per type), and TPC (Table Per Concrete type, separate table per concrete type). They trade off query simplicity, normalization, and performance.

> [!QUESTION]- How do you do a backward-compatible schema migration with zero downtime (expand-contract, backfill, dual reads/writes), and what can go wrong?
> Use an expand-contract migration:
> add new schema elements in a backward-compatible way (nullable columns/tables/indexes), deploy code that writes to both old and new (or writes new while keeping old readable), then backfill in batches.
> Switch reads behind a feature flag when data is consistent, keep a fallback path temporarily, and only then contract (remove old columns) once all writers/readers are updated.
> Failure modes: wrong deploy order, backfill racing with live writes, long-running migrations/locks, missing defaults/null handling, read-model inconsistency, and hard rollbacks after data has diverged.

## Links

[Using lazy loading in Entity Framework Core 8](https://toreaurstad.blogspot.com/2024/09/using-lazy-loading-in-entity-framework.html?m=1&utm_source=newsletter.csharpdigest.net&utm_medium=newsletter&utm_campaign=on-over-engineering&_bhlid=efd39774a29b3493b98805aa251f5eb60eb7366e)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/03 Data Persistence/03 Data Persistence\|03 Data Persistence]]
>
<!-- whats-next:end -->
