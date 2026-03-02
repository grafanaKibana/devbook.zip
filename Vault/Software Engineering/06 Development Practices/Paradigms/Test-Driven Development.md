---
topic:
  - Development Practices
subtopic:
  - Paradigms
level:
  - "4"
priority: High
status: Creation
dg-publish: true
---

# Test-Driven Development

Test-Driven Development (TDD) is a development practice where you write a failing test *before* writing the production code that satisfies it. The cycle is **Red → Green → Refactor**: write a test that fails (Red), write the minimum code to make it pass (Green), then clean up the design without breaking the test (Refactor). TDD is not primarily about test coverage — it is a design technique. Writing the test first forces you to define the public interface and expected behavior before implementation, which consistently produces smaller, more focused units with clearer contracts.

## The Red-Green-Refactor Loop

```text
Red   → Write a test for the next small behavior. It must fail (proves the test is real).
Green → Write the simplest code that makes the test pass. No gold-plating.
Refactor → Improve the code (extract methods, rename, remove duplication) while keeping tests green.
```

Each iteration should take 2–10 minutes. If a cycle takes longer, the step is too large — split it.

## Concrete Example

Implementing a `PriceCalculator` that applies a discount for orders over $100:

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

The tests don't compile yet — `PriceCalculator` doesn't exist. That's the Red state.

```csharp
// Step 2 — GREEN: minimum code to pass
public sealed class PriceCalculator(decimal discountRate, decimal threshold)
{
    public decimal Calculate(decimal amount) =>
        amount > threshold ? amount * (1 - discountRate) : amount;
}
```

Both tests pass. Now Refactor: the logic is already clean, so nothing to change. Move to the next behavior.

## What TDD Improves (and What It Doesn't)

**Improves**:
- **Design**: writing the test first forces a usable public API. Classes that are hard to test are usually poorly designed (too many dependencies, too much responsibility).
- **Regression safety**: the test suite grows with the codebase. Refactoring is safe because failures are caught immediately.
- **Feedback speed**: a failing test pinpoints the broken behavior in seconds, not after a full build-and-run cycle.
- **Documentation**: tests describe expected behavior in executable form. `AppliesDiscountWhenOrderExceedsThreshold` is clearer than a comment.

**Does not improve**:
- **Architecture**: TDD operates at the unit level. It won't catch wrong service boundaries or bad data models.
- **Integration correctness**: unit tests with mocks can pass while the real system is broken. Integration tests are still needed.
- **Performance**: TDD doesn't test latency or throughput.

## Pitfalls

### Testing Implementation Instead of Behavior

**What goes wrong**: tests assert on internal state (private fields, method call counts) rather than observable outcomes. When you refactor the implementation, tests break even though behavior is unchanged.

**Why it happens**: writing tests after the fact often leads to "white-box" tests that mirror the implementation structure.

**Mitigation**: test through the public interface only. Assert on return values and observable side effects (e.g., what was written to the DB), not on how the code achieves them. If you need to verify a dependency was called, use a mock sparingly and only for the interaction that matters.

### Over-Mocking

**What goes wrong**: every dependency is mocked, so tests pass but the real wiring is never exercised. A bug in the DI configuration or a wrong interface implementation goes undetected.

**Why it happens**: mocking is easy and makes tests fast. It becomes the default even when a real implementation (in-memory DB, fake clock) would be more reliable.

**Mitigation**: mock at the boundary of your system (HTTP clients, external queues, email senders). Use real or in-memory implementations for internal dependencies (repositories, domain services). Complement unit tests with integration tests that use real infrastructure.

### Writing Tests After the Fact and Calling It TDD

**What goes wrong**: tests are written after implementation to hit a coverage target. The design benefits of TDD are lost — the code was already shaped by implementation thinking, not by the test-first interface design.

**Why it happens**: deadlines, habit, or misunderstanding TDD as "having tests" rather than "test-first design."

**Mitigation**: TDD is a discipline, not a metric. Coverage numbers don't distinguish test-first from test-after. The signal is whether the test forced a design decision.

## Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Strict TDD (test-first every line) | Best design feedback, high confidence | Slow for exploratory/spike work, overhead for trivial code | Core domain logic, complex business rules, public library APIs |
| Test-after (write code, then tests) | Faster initial development | Weaker design signal, tests often mirror implementation | Prototypes, scripts, UI glue code |
| No tests | Fastest short-term | Regressions accumulate, refactoring becomes risky | Never in production code |

**Decision rule**: apply strict TDD to domain logic and anything with non-trivial branching. For infrastructure glue (DI wiring, config parsing), write integration tests after. For throwaway spikes, skip tests entirely — but delete the spike before it becomes production code.

## Questions

> [!QUESTION]- Why does TDD improve design, not just test coverage?
> - Writing the test first forces you to define the public interface before the implementation exists.
> - If the test is hard to write (too many constructor arguments, complex setup), that's a design signal: the class has too many responsibilities or too many dependencies.
> - TDD naturally produces smaller classes with single responsibilities because each test targets one behavior.
> - Test-after doesn't provide this signal — the implementation already exists and the test is shaped around it.
> - Tradeoff: TDD's design benefit requires discipline. Skipping the Red step (writing a test that already passes) eliminates the feedback loop.

> [!QUESTION]- When is TDD not worth the overhead?
> - Exploratory/spike code: you don't know the right design yet. Write the spike without tests, learn from it, then delete it and rebuild with TDD.
> - UI rendering logic: visual behavior is hard to unit-test meaningfully; use snapshot tests or manual QA instead.
> - Trivial CRUD with no branching: a single-line property setter doesn't need a test-first cycle.
> - Tradeoff: TDD overhead is ~20-30% more time upfront. The payback is faster debugging and safer refactoring over the life of the codebase. For short-lived code, the payback never arrives.

> [!QUESTION]- How do you handle external dependencies (DB, HTTP) in TDD?
> - Inject dependencies as interfaces. In tests, provide a fake or in-memory implementation.
> - For repositories: use an in-memory implementation (e.g., `Dictionary<Guid, Order>`) rather than mocking every method.
> - For HTTP clients: use `HttpMessageHandler` fakes or `WireMock.Net` for realistic HTTP stubs.
> - For time: inject `TimeProvider` (built into .NET 8+) so tests can control "now" without `DateTime.UtcNow` coupling.
> - Tradeoff: fakes require maintenance. If the real implementation changes behavior, the fake may diverge. Contract tests (testing the fake against the real implementation) catch this.

## References

- [Test-Driven Development (Martin Fowler)](https://martinfowler.com/bliki/TestDrivenDevelopment.html) — concise explanation of TDD mechanics and when to apply it, from a practitioner who has used it in large codebases.
- [xUnit.net documentation](https://xunit.net/docs/getting-started/netcore/cmdline) — the standard .NET unit testing framework used in most modern .NET projects; covers `[Fact]`, `[Theory]`, fixtures, and parallelism.
- [Unit testing best practices (.NET) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices) — Microsoft's guidance on naming conventions, AAA pattern, avoiding anti-patterns, and test isolation in .NET.
- [Test-Driven Development: By Example (Kent Beck)](https://www.oreilly.com/library/view/test-driven-development/0321146530/) — the original TDD book; short, practical, and still the best introduction to the Red-Green-Refactor discipline.
- [TimeProvider in .NET 8 (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/runtime#time-abstraction) — built-in time abstraction that replaces `DateTime.UtcNow` coupling in testable code.

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
> - [[Software Engineering/06 Development Practices/Paradigms/Unit Testing|Unit Testing]]
<!-- whats-next:end -->
