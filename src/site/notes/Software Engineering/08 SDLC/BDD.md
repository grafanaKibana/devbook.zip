---
{"dg-publish":true,"permalink":"/software-engineering/08-sdlc/bdd/","noteIcon":"1"}
---


# Intro

Behavior-Driven Development (BDD) is a development approach that uses examples in business language to align requirements, implementation, and tests.

BDD scenarios are commonly written in Gherkin (Given/When/Then) and can be automated using tools like Cucumber or SpecFlow.

## Example

Gherkin feature file:

```gherkin
Feature: Login

  Scenario: Valid credentials
    Given a user "alice" exists with password "correct-horse-battery-staple"
    When I log in as "alice" with password "correct-horse-battery-staple"
    Then I should see "Welcome, alice"
```


## Questions

> [!QUESTION]- What is BDD?
> Behavior-Driven Development (BDD) is a development approach that uses examples in business language to align requirements, implementation, and tests.

## Links

- [Gherkin reference](https://cucumber.io/docs/gherkin/reference/)
- [SpecFlow documentation](https://docs.specflow.org/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering\|Software Engineering]]
>
> **Pages**
> - [[Software Engineering/08 SDLC/Estimation Techniques\|Estimation Techniques]]
<!-- whats-next:end -->
