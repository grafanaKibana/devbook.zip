---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "1"
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

GRASP is a set of principles for assigning responsibilities to objects/classes to keep designs understandable and flexible.

## Deeper Explanation

[GRASP принципы](https://bool.dev/blog/detail/grasp-printsipy)

## Questions

> [!QUESTION]- What is GRASP?
> GRASP (General Responsibility Assignment Software Patterns) is a set of guidelines for assigning responsibilities to classes/objects.
> 
> Common GRASP principles include: Information Expert, Creator, Controller, Low Coupling, High Cohesion, Polymorphism, Pure Fabrication, Indirection, and Protected Variations.

## Further Reading

- [GRASP принципы](https://bool.dev/blog/detail/grasp-printsipy)
- [GRASP (Wikipedia)](https://en.wikipedia.org/wiki/GRASP_(object-oriented_design))
