---
publish: true
created: 2026-08-20T20:41:15.709Z
modified: 2026-08-20T20:41:15.710Z
published: 2026-08-20T20:41:15.710Z
topic:
  - Software Design
subtopic:
  - Testing
summary: A cost and feedback heuristic that favors many fast unit tests, fewer integration tests, and a thin end-to-end layer.
level:
  - "2"
priority: High
status: Not-Started
---

The testing pyramid arranges checks by feedback speed, fidelity, and maintenance cost. Narrow tests near the code are usually cheap and diagnostic. Broad tests across deployed boundaries prove more wiring but fail for more possible reasons. The shape is a heuristic rather than a fixed ratio, so the useful mix follows architecture and the cost of each missed defect.

![[Assets/Excalidraw/Testing Pyramid.excalidraw|700|center]]

| Layer | Purpose | Relative quantity | Speed | Cost and failure diagnosis |
| --- | --- | --- | --- | --- |
| Unit | Verify branching rules and small behaviors without real I/O | Many | Fastest. Normally milliseconds | Cheapest to run and maintain. Failures usually identify one behavior |
| Integration / service | Verify components and real boundaries such as persistence, serialization, messaging, or an in-process API | Fewer | Slower. Setup and I/O dominate | More environment and data management. Failures can span several components |
| End-to-end / UI | Verify a critical user journey through the assembled system | Few | Slowest | Highest setup, runtime, and maintenance cost. Failures have the widest diagnostic surface |

Move an assertion downward only when the lower layer can expose the same failure. A price rule belongs in a unit test. A database constraint needs the actual relational boundary. Checkout routing through browser, API, identity, and payment needs a small number of end-to-end checks. A service dominated by SQL or protocol adapters may reasonably contain more integration tests than unit tests without violating the model.

An inverted suite asks broad UI tests to cover branches that a lower boundary could verify more cheaply. The result is slow feedback and a wide diagnostic surface. Keep end-to-end coverage for critical journeys, integration coverage for real boundaries, and local tests for decisions. Duration, rerun rate, maintenance effort, and escaped defects are better signals than layer percentages.

# References

- [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
