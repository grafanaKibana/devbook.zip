---
publish: true
created: 2026-08-20T20:41:15.709Z
modified: 2026-08-20T20:41:15.709Z
published: 2026-08-20T20:41:15.709Z
topic:
  - Software Design
subtopic:
  - Testing
summary: Writing a failing test before the code, using Red-Green-Refactor as a design technique.
level:
  - "4"
priority: High
status: Ready to Repeat
---

Test-Driven Development (TDD) grows behavior through a short test-first loop. Select the next example from a test list, write a test that fails for the expected reason, make it pass with the simplest sufficient production change, then improve both code and tests while the suite remains green. The loop supplies regression evidence and makes the caller-facing interface visible before implementation choices harden.

TDD is a development technique, not a coverage target or a claim that every line was written test-first. Its design value depends on choosing informative examples and completing the refactoring step. A poorly chosen test can drive an awkward interface just as easily as a good test can clarify one.

# The Red-Green-Refactor Loop

```text
Red   → Write a test for the next small behavior. It must fail (proves the test is real).
Green → Write the simplest code that makes the test pass. No gold-plating.
Refactor → Improve the code (extract methods, rename, remove duplication) while keeping tests green.
```

The cycle should be small enough that the reason for failure and the production change remain obvious. Elapsed time is only a signal: a longer step may need decomposition, but compilation, infrastructure setup, or an unfamiliar domain can legitimately slow a useful cycle. Before starting, maintain a short test list and choose the next example that reveals an important behavior or design question.

# Concrete Example

Implementing a `PriceCalculator` that applies a discount for orders over \$100:

```csharp
// Step 1 — RED: write the test first
public class PriceCalculatorTests
{
    [Fact]
    public void AppliesDiscountWhenOrderExceedsThreshold()
    {
        var calc = new PriceCalculator(discountRate: 0.10m, threshold: 100m);
        decimal result = calc.Calculate(120m);
        Assert.Equal(108m, result); // 120 * 0.90
    }

    [Fact]
    public void NoDiscountBelowThreshold()
    {
        var calc = new PriceCalculator(discountRate: 0.10m, threshold: 100m);
        decimal result = calc.Calculate(80m);
        Assert.Equal(80m, result);
    }
}
```

The test project does not compile because `PriceCalculator` does not exist. A compile failure can be the first Red state, but it should be resolved immediately so the test can fail on the missing behavior rather than on accidental syntax or setup.

```csharp
// Step 2 — GREEN: minimum code to pass
public sealed class PriceCalculator(decimal discountRate, decimal threshold)
{
    public decimal Calculate(decimal amount) =>
        amount > threshold ? amount * (1 - discountRate) : amount;
}
```

Both examples pass. Refactoring is an explicit inspection rather than a requirement to change something: names, duplication, boundaries, and test clarity are reviewed, and the code is left alone when no improvement is earned. Then the next item is selected from the test list.

# What TDD Improves (And What It Doesn't)

TDD can improve:

- **interface feedback** — the first client is written before the implementation, exposing awkward construction and unclear results.
- **regression evidence** — each completed behavior leaves an executable example that protects later refactoring.
- **problem decomposition** — the test list and small loop force large behavior into observable increments.
- **executable examples** — a diagnostic test name and assertion record one expected outcome.

TDD does not choose the right test level or guarantee a good architecture. It can drive unit, integration, acceptance, or outside-in tests, but the selected boundary determines what failures the loop can expose. Mock-heavy unit tests do not prove database or protocol compatibility. Latency, concurrency, security, and operability require their own test designs and production evidence.

# Pitfalls

## Testing Implementation Instead of Behavior

When the next test comes from the current implementation instead of an externally visible behavior, it starts asserting private state or method call counts. A refactor then breaks the test even though the behavior is unchanged.

Exercise the contract production callers use and assert returned state or externally visible effects. Verify an interaction only when sending that command is itself the behavior. Database contents are observable only in an integration test that owns the database boundary.

## Over-Mocking

If isolation means replacing every collaborator, tests specify call choreography while real wiring and component compatibility remain untested. Reorganizing the collaboration breaks those tests even when the external behavior stays the same.

Keep stable in-memory collaborators real and replace process boundaries that the unit test does not own. A fake clock is deterministic. An in-memory database provider is not a faithful substitute for relational behavior. Prove SQL, HTTP, queue, serialization, and dependency-registration contracts with integration tests using appropriate implementations.

## Writing Tests After the Fact and Calling It TDD

Tests written after implementation may still be valuable regression checks, but they did not participate in the design loop. Calling that work TDD confuses the resulting suite with the sequence of test, production change, and refactoring.

Describe test-after work accurately and judge the tests on the failures they catch. Coverage cannot reconstruct development order. When TDD is chosen, keep the loop observable through a failing test with the expected reason, a minimal passing change, and a deliberate refactoring check.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Example-driven TDD | Early interface feedback and a regression example for each increment | Poor examples can steer the design. The loop adds cognitive overhead during discovery | Domain behavior, parsers, algorithms, and stable public contracts |
| Acceptance/outside-in TDD | Connects a user-visible behavior to emerging inner boundaries | Broad tests are slower and require disciplined double and integration strategy | Workflows whose main uncertainty is component collaboration |
| Test-after | Adds regression evidence to an implementation that already exists | Cannot provide test-first interface feedback and may mirror the code | Legacy characterization, defects found in production, and straightforward adapters |
| Exploratory spike | Optimizes learning before committing to a design | Provides no durable regression evidence | Disposable experiments that are removed or rebuilt before production use |

Use TDD when the next behavior can be stated as an example and early caller feedback is valuable. Use an integration-level loop when the behavior is configuration, persistence, or protocol wiring. A spike may omit durable tests only while it remains disposable. Production behavior needs evidence at the layer that can expose its realistic failure.

# Questions

> [!QUESTION]- How can TDD improve design beyond increasing test coverage?
> The test is the first concrete caller, so construction, inputs, outputs, and failure semantics must be expressed before implementation details dominate. Difficult setup is a design signal worth investigating, not proof that a class must be split. The benefit comes from selecting the next useful example and refactoring after it passes. A test that begins green may document existing behavior, but it does not prove that the intended production change was necessary.

> [!QUESTION]- When is TDD not worth the overhead?
> The loop has little leverage when the work is a disposable experiment, a mechanical declaration already guaranteed by a framework, or a visual exploration whose useful feedback comes from rendering rather than a code-level example. That does not remove the need for verification before the behavior becomes durable. There is no universal percentage cost: the tradeoff depends on domain familiarity, test level, tooling, and how much change the code will absorb.

# References

- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Test-Driven Development: By Example](https://www.pearson.com/en-us/subject-catalog/p/test-driven-development-by-example/P200000009421/9780321146533)
