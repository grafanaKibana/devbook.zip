---
topic:
  - Software Design
subtopic:
  - Testing
summary: "A cost and feedback heuristic that favors many fast unit tests, fewer integration tests, and a thin end-to-end layer."
level:
  - "2"
priority: High
status: Not-Started
publish: true
---

The testing pyramid allocates verification by feedback speed and maintenance cost. It favors many narrow tests near the code and fewer broad tests across deployed boundaries. The shape is a heuristic, not a fixed ratio: the useful mix follows the system’s risks, architecture, and cost of a missed defect.

![[Assets/Excalidraw/Testing Pyramid.excalidraw|700|center]]

| Layer | Purpose | Relative quantity | Speed | Cost and failure diagnosis |
| --- | --- | --- | --- | --- |
| Unit | Verify branching rules and small behaviors without real I/O | Many | Fastest; normally milliseconds | Cheapest to run and maintain; failures usually identify one behavior |
| Integration / service | Verify components and real boundaries such as persistence, serialization, messaging, or an in-process API | Fewer | Slower; setup and I/O dominate | More environment and data management; failures can span several components |
| End-to-end / UI | Verify a critical user journey through the assembled system | Few | Slowest | Highest setup, runtime, and maintenance cost; failures have the widest diagnostic surface |

Push an assertion downward only when the lower layer can expose the same risk. A price rule belongs in unit tests; a database constraint needs an integration test; checkout routing through browser, API, identity, and payment needs a small number of end-to-end checks. A service dominated by SQL or protocol adapters may rationally contain more integration tests than unit tests without “breaking” the pyramid.

The common failure is an inverted suite: broad UI tests cover every branch, run slowly, and fail for unrelated environmental reasons. Keep a thin end-to-end layer for critical journeys, put boundary behavior at the integration layer, and retain fast local feedback for logic. Measure duration, flakiness, maintenance effort, and escaped defects instead of enforcing percentages.

# Questions

> [!QUESTION]- Why is the testing pyramid not a prescribed ratio?
> Test value depends on where a risk can be observed most cheaply and faithfully. Architecture, regulatory evidence, legacy seams, and infrastructure-heavy behavior change the appropriate mix; fixed percentages ignore those conditions.

> [!QUESTION]- Which layer should verify a duplicate-charge invariant?
> Pure idempotency decisions can be unit tested, persistence uniqueness and request replay need integration coverage, and only a small critical-path end-to-end test should prove the assembled checkout flow. Each layer covers a distinct failure boundary.

# References

- [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) — Ham Vocke’s primary practitioner account explains layer scope, feedback economics, and why UI-heavy suites become slow and brittle.
- [Unit testing best practices with .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices) — Microsoft’s official guidance on fast, isolated, deterministic unit tests.
- [Integration tests in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests) — Microsoft’s official guidance for exercising the real application pipeline with `WebApplicationFactory`.
