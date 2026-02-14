---
topic: ["Data Persistance"]
subtopic: ["ORMs"]
level: ["1"]
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

## Deeper Explanation

## Links

[Using lazy loading in Entity Framework Core 8](https://toreaurstad.blogspot.com/2024/09/using-lazy-loading-in-entity-framework.html?m=1&utm_source=newsletter.csharpdigest.net&utm_medium=newsletter&utm_campaign=on-over-engineering&_bhlid=efd39774a29b3493b98805aa251f5eb60eb7366e)

## Questions

> [!QUESTION]- How to choose Code First vs Database First?
> Use Code First when you want the code model to be the source of truth (new projects, strong domain model, migrations as part of delivery). Use Database First when you already have a database schema you must integrate with (legacy DB, shared DB, strict DBA-controlled schema) and want to generate the model from it.

> [!QUESTION]- What inheritance mapping strategies exist in Entity Framework?
> The common strategies are: TPH (Table Per Hierarchy, single table with a discriminator), TPT (Table Per Type, separate table per type), and TPC (Table Per Concrete type, separate table per concrete type). They trade off query simplicity, normalization, and performance.

## Further Reading
