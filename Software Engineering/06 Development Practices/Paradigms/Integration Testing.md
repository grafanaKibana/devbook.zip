---
topic:
  - Development Practices
subtopic:
  - Paradigms
level:
  - "1"
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is the difference between unit tests and integration tests?
> - Scope: unit tests cover a small unit (method/class); integration tests cover interactions between multiple components.
> - Dependencies: unit tests replace external dependencies (DB, filesystem, HTTP) with test doubles; integration tests use real dependencies (or realistic test instances/containers).
> - Speed and determinism: unit tests are typically fast and stable; integration tests are slower and can be more brittle due to environment and I/O.
> - Purpose: unit tests validate logic and design boundaries; integration tests validate wiring, configuration, contracts, and real behavior across boundaries.

## Further Reading
