---
topic:
  - Architecture
subtopic:
  - Application Architecture
level:
  - "1"
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
# Intro

MVC and MVVM are UI/application architecture patterns that split responsibilities to improve maintainability, testability, and separation of concerns.

## Deeper Explanation

## Questions

> [!QUESTION]- What is MVC and why is it used?
> MVC stands for Model-View-Controller. The Model represents the domain/data and business rules, the View is the UI (rendering), and the Controller handles incoming input/requests, coordinates work, and selects the response/view. The separation helps keep UI concerns out of business logic and makes the system easier to test and evolve.

## Links

- [Wikipedia - Model-view-controller](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)
- [Microsoft Learn - Overview of ASP.NET Core MVC](https://learn.microsoft.com/en-us/aspnet/core/mvc/overview)
