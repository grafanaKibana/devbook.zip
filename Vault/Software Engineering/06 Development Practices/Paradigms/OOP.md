---
topic:
  - Development Practices
subtopic:
  - Paradigms
level:
  - "4"
priority: Medium
status: Ready To Repeat
dg-publish: true
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

## Links

- [Object-oriented programming (C# guide)](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Paradigms/Event-driven|Event-driven]]
> - [[Software Engineering/06 Development Practices/Paradigms/Functional Programming|Functional Programming]]
> - [[Software Engineering/06 Development Practices/Paradigms/Integration Testing|Integration Testing]]
> - [[Software Engineering/06 Development Practices/Paradigms/Test-Driven Development|Test-Driven Development]]
> - [[Software Engineering/06 Development Practices/Paradigms/Unit Testing|Unit Testing]]
<!-- whats-next:end -->
