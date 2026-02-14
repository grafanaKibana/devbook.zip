---
topic:
  - DevOps
subtopic:
  - Version Control Systems
level:
  - "3"
priority:
  - High
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is Git Flow?
> Git Flow is a branching model for Git that standardizes how teams create and merge branches. The classic model uses:
> - `main` (or `master`) for production-ready code
> - `develop` for ongoing integration
> - `feature/*` branches off `develop` for new work
> - `release/*` branches to stabilize a release
> - `hotfix/*` branches off `main` for urgent production fixes
> It fits scheduled releases and strict separation of "in development" vs "in production", but can feel heavy for trunk-based development or simple continuous delivery.

## Further Reading
