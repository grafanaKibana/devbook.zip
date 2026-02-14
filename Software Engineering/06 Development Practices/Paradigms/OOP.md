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

Object-oriented programming (OOP) is a paradigm where we model a domain as interacting objects that combine state (data) and behavior (methods).

## Deeper Explanation

OOP is typically used to:

- Organize code around domain concepts.
- Encapsulate invariants and keep changes local.
- Enable polymorphic substitution via interfaces/base classes.

## Questions

> [!QUESTION]- What does "object-oriented programming" mean?
> OOP is a programming paradigm where a system is designed as a set of interacting objects that encapsulate state and expose behavior via methods.

> [!QUESTION]- Name the OOP principles and explain each.
> Commonly: 
> 
> - Encapsulation: hide internal state and expose a stable API; enforce invariants inside the object.
> - Abstraction: model only essential aspects of a concept and hide irrelevant details.
> - Inheritance: reuse/extend behavior by deriving from a base type (use carefully; composition is often safer).
> - Polymorphism: treat different implementations through a common contract (interface/base type) and get behavior based on the runtime type.

## Further Reading

- [Object-oriented programming (C# guide)](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/)
