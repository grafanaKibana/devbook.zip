---
publish: true
created: 2026-07-08T15:01:12.536Z
modified: 2026-07-08T15:01:12.536Z
published: 2026-07-08T15:01:12.536Z
tags:
  - FolderNote
topic:
  - Development Practices
subtopic:
  - Paradigms
status: Creation
level:
  - "4"
priority: High
---

# Intro

A _paradigm_ here is a way of modelling and building software — the mental model you adopt before writing code. Knowing several lets you pick the simplest model for the job (a functional style shines in data transformations where immutability cuts bugs; an event-driven one decouples producers from consumers). This folder groups two related families:

**Programming paradigms** — how you structure the code itself:

- [[OOP]] — model the domain as objects bundling state and behaviour.
- [[Functional Programming]] — pure functions and immutable data over shared mutable state.
- [[Event-driven]] — react to immutable facts (events) rather than calling components directly.

**Testing & development paradigms** — how you drive and verify the work:

- [[Test-Driven Development]] — write the failing test first, then the code that passes it.
- [[Unit Testing]] — verify small, isolated pieces of behaviour fast.
- [[Integration Testing]] — verify components working together with real infrastructure.

## Links

- [Programming paradigm (Wikipedia)](https://en.wikipedia.org/wiki/Programming_paradigm)
