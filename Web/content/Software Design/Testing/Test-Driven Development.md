---
publish: true
created: 2026-02-10T01:40:47.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-28T20:52:55.190Z
topic:
  - Software Design
subtopic:
  - Testing
summary: Writing a failing test before the code, using Red-Green-Refactor as a design technique.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Software Design
qard-topic: Testing/Test-Driven Development
flashcard_uid: 007a0cef
---

Test-Driven Development (TDD) grows behavior through a short test-first loop. Each cycle selects the next example from a test list, adds a test that fails for the expected reason, makes it pass with the simplest sufficient production change, then improves both code and tests while the suite remains green. The loop supplies regression evidence and makes the caller-facing interface visible before implementation choices harden.

TDD is a development technique, not a coverage target or a claim that every line was written test-first. Its design value depends on choosing informative examples and completing the refactoring step. A poorly chosen test can drive an awkward interface just as easily as a good test can clarify one.

# The Red-Green-Refactor Loop

```text
Red   → Write a test for the next small behavior. It must fail (proves the test is real).
Green → Write the simplest code that makes the test pass. No gold-plating.
Refactor → Improve the code (extract methods, rename, remove duplication) while keeping tests green.
```

The cycle should be small enough that the reason for failure and the production change remain obvious. Elapsed time is only a signal: a longer step may need decomposition, but compilation, infrastructure setup, or an unfamiliar domain can legitimately slow a useful cycle. A short test list exists before the loop starts, and the next example is one that reveals an important behavior or design question.

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

A behavior-focused test exercises the contract production callers use and asserts returned state or externally visible effects. An interaction is verified only when sending that command is itself the behavior. Database contents are observable only in an integration test that owns the database boundary.

## Over-Mocking

If isolation means replacing every collaborator, tests specify call choreography while real wiring and component compatibility remain untested. Reorganizing the collaboration breaks those tests even when the external behavior stays the same.

Stable in-memory collaborators stay real, while process boundaries that the unit test does not own are replaced. A fake clock is deterministic. An in-memory database provider is not a faithful substitute for relational behavior. SQL, HTTP, queue, serialization, and dependency-registration contracts are proven by integration tests that use appropriate implementations.

## Writing Tests After the Fact and Calling It TDD

Tests written after implementation may still be valuable regression checks, but they did not participate in the design loop. Calling that work TDD confuses the resulting suite with the sequence of test, production change, and refactoring.

Such work is accurately labeled test-after, and its tests are judged by the failures they catch. Coverage cannot reconstruct development order. When TDD is chosen, the loop stays observable through a failing test with the expected reason, a minimal passing change, and a deliberate refactoring check.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Example-driven TDD | Early interface feedback and a regression example for each increment | Poor examples can steer the design. The loop adds cognitive overhead during discovery | Domain behavior, parsers, algorithms, and stable public contracts |
| Acceptance/outside-in TDD | Connects a user-visible behavior to emerging inner boundaries | Broad tests are slower and require disciplined double and integration strategy | Workflows whose main uncertainty is component collaboration |
| Test-after | Adds regression evidence to an implementation that already exists | Cannot provide test-first interface feedback and may mirror the code | Legacy characterization, defects found in production, and straightforward adapters |
| Exploratory spike | Optimizes learning before committing to a design | Provides no durable regression evidence | Disposable experiments that are removed or rebuilt before production use |

TDD fits when the next behavior can be stated as an example and early caller feedback is valuable. An integration-level loop fits when the behavior is configuration, persistence, or protocol wiring. A spike may omit durable tests only while it remains disposable. Production behavior needs evidence at the layer that can expose its realistic failure.

# Questions

> [!qard]- What is test-driven development, and how does its red-green-refactor cycle work?
> Test-driven development (TDD) builds software in short cycles. A test for the next small behavior is written first, then just enough code to pass it, and then the design is cleaned up while all tests pass.
>
> 1. **Red:** a test is written for the next behavior, usually chosen from a short list of examples still to cover. It must fail, and for the expected reason. The failure shows that the test can detect the missing behavior. A compile error because a type does not exist yet can be the first red state. It is fixed quickly so that the test fails on the behavior itself rather than on setup.
> 2. **Green:** the simplest production change that makes the test pass is written, without speculative extras. Behavior grows only as far as the examples require.
> 3. **Refactor:** with the suite green, production and test code are reviewed for naming, duplication and boundaries, and improved where that helps. The passing tests show that behavior did not change. This step is a deliberate check; code that needs no improvement is left alone.
>
> The next example is then taken from the list and the cycle repeats. Each cycle stays small enough that the reason for a failure and the production change remain obvious. The design value depends on doing the refactor step; skipping it leaves passing tests without deliberate design improvement. TDD describes the order of work, so tests written after the implementation can be useful regression checks but are not TDD.
>
> [Martin Fowler: Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

<!-- qard-id: cef12dc9-115f-4edd-880e-dc205127dd9f -->

> [!qard]- How can TDD improve design beyond increasing test coverage?
> TDD improves design by making each test the first caller of the code it specifies. Because the test is written before the implementation, construction, inputs, results and failure behavior have to be decided from the caller's side. Awkward construction or unclear results then show up while they are still cheap to change.
>
> The rest of the loop adds two more design effects:
>
> - **Safe refactoring:** red-green-refactor leaves a passing example for each completed behavior. Names, duplication and boundaries can then be improved while those examples show that behavior is unchanged.
> - **Decomposition:** a list of examples, worked through in small steps, breaks a large behavior into observable increments.
>
> These benefits are conditional. They depend on choosing informative examples and actually doing the refactor step. A poorly chosen test can drive an awkward interface as easily as a good one clarifies it. Difficult test setup is a signal to investigate, for example for hidden time, global state or too many responsibilities. It does not by itself prove that a class needs splitting.
>
> [Martin Fowler: Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

<!-- qard-id: 0318f23a-cf63-4c25-b816-80942bc06ca6 -->

> [!qard]- When is TDD not worth the overhead?
> TDD is poor value when its test-first loop yields neither useful design feedback nor lasting regression evidence. Typical cases:
>
> - **Disposable spike:** the goal is to learn whether an approach works, and the code is discarded or rebuilt before production. Durable tests would protect code that will not ship, and the loop adds overhead to exploration. The exception lasts only while the spike stays disposable.
> - **Declarations the platform already guarantees:** the language or framework may already guarantee a plain declaration's behavior, as with an unmodified property accessor. A test for it mostly restates that guarantee. A declaration that adds custom validation, binding or serialization is no longer in this category.
> - **Visual rendering:** when the useful feedback is how output looks, inspecting the rendered result gives that feedback more directly than a code-level red-green loop.
>
> Skipping TDD does not remove the need to verify behavior that ships. That behavior still needs tests, written before or after the code, at the layer that can expose its realistic failure. Configuration, persistence and protocol wiring, for example, fit an integration-level test loop better than unit-level TDD. No universal coverage percentage or time-cost threshold decides the question.
>
> [.NET unit-testing best practices](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)

# References

- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Test-Driven Development: By Example](https://www.pearson.com/en-us/subject-catalog/p/test-driven-development-by-example/P200000009421/9780321146533)
