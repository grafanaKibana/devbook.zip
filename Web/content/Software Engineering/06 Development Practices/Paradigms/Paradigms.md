---
topic:
  - Development Practices
subtopic:
  - Paradigms
tags:
  - FolderNote
dg-publish: true
status: Creation
level:
  - '4'
priority: High
---

# Intro

A *paradigm* here is a way of modelling and building software — the mental model you adopt before writing code. Knowing several lets you pick the simplest model for the job (a functional style shines in data transformations where immutability cuts bugs; an event-driven one decouples producers from consumers). This folder groups two related families:

**Programming paradigms** — how you structure the code itself:

- [[Software Engineering/06 Development Practices/Paradigms/OOP|OOP]] — model the domain as objects bundling state and behaviour.
- [[Software Engineering/06 Development Practices/Paradigms/Functional Programming|Functional Programming]] — pure functions and immutable data over shared mutable state.
- [[Software Engineering/06 Development Practices/Paradigms/Event-driven|Event-driven]] — react to immutable facts (events) rather than calling components directly.

**Testing & development paradigms** — how you drive and verify the work:

- [[Software Engineering/06 Development Practices/Paradigms/Test-Driven Development|Test-Driven Development]] — write the failing test first, then the code that passes it.
- [[Software Engineering/06 Development Practices/Paradigms/Unit Testing|Unit Testing]] — verify small, isolated pieces of behaviour fast.
- [[Software Engineering/06 Development Practices/Paradigms/Integration Testing|Integration Testing]] — verify components working together with real infrastructure.

## Links

- [Programming paradigm (Wikipedia)](https://en.wikipedia.org/wiki/Programming_paradigm)

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
> - [[Software Engineering/06 Development Practices/Paradigms/OOP|OOP]]
> - [[Software Engineering/06 Development Practices/Paradigms/Test-Driven Development|Test-Driven Development]]
> - [[Software Engineering/06 Development Practices/Paradigms/Unit Testing|Unit Testing]]
<!-- whats-next:end -->
