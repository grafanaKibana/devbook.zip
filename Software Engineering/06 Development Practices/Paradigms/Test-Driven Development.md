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

> [!QUESTION]- What is TDD?
> TDD (Test-Driven Development) is a development practice where you write a test before the production code.
> The typical loop is Red Green Refactor:
> - Red: write a small test that fails
> - Green: implement the simplest code to make it pass
> - Refactor: improve the code while keeping tests green
>
> The goal is fast feedback, better design (smaller units with clear contracts), and protection against regressions.

## Links
