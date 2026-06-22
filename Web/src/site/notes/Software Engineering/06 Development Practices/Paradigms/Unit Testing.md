---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/paradigms/unit-testing/","dg-note-properties":{"topic":["Development Practices"],"subtopic":["Paradigms"],"level":["4"],"priority":"High","status":"Ready to Repeat"}}
---


# Unit Testing

A unit test verifies a small, isolated piece of behavior — typically a single method or class — quickly and deterministically. "Isolated" means all external dependencies (database, HTTP, filesystem, clock) are replaced with test doubles so the test exercises only the logic under test. Unit tests are the foundation of a fast feedback loop: a suite of hundreds of unit tests should run in under a second, catching regressions the moment they are introduced.

The primary value of unit tests is not coverage — it is **design pressure**. Code that is hard to unit-test is usually poorly designed: too many dependencies, too much responsibility, or hidden coupling to global state.

## Anatomy of a Unit Test (AAA Pattern)

Every unit test follows **Arrange → Act → Assert**:

```csharp
public class DiscountServiceTests
{
    [Fact]
    public void AppliesLoyaltyDiscount_WhenCustomerHasOverTenOrders()
    {
        // Arrange
        var customer = new Customer(id: "c1", orderCount: 12);
        var service  = new DiscountService(loyaltyThreshold: 10, discountRate: 0.15m);

        // Act
        decimal price = service.Calculate(basePrice: 100m, customer);

        // Assert
        Assert.Equal(85m, price);
    }

    [Fact]
    public void NoDiscount_WhenCustomerBelowThreshold()
    {
        var customer = new Customer(id: "c2", orderCount: 3);
        var service  = new DiscountService(loyaltyThreshold: 10, discountRate: 0.15m);

        Assert.Equal(100m, service.Calculate(100m, customer));
    }
}
```

**Naming convention**: `MethodName_StateUnderTest_ExpectedBehavior` or a plain English description. The test name is the first thing you read when a test fails — make it diagnostic.

## Test Doubles: Stubs vs Mocks

| Type | Purpose | Example |
|---|---|---|
| **Stub** | Returns canned data so the test can proceed | `IOrderRepository` that returns a fixed list |
| **Mock** | Verifies interactions — was a method called with the right arguments? | Assert `_emailSender.Send(...)` was called once |
| **Fake** | A working lightweight implementation | In-memory `IOrderRepository` backed by a `Dictionary` |
| **Spy** | Records calls for later assertion | Rarely needed; prefer mocks |

```csharp
// Stub with Moq: return fixed data
var repo = new Mock<IOrderRepository>();
repo.Setup(r => r.GetByCustomer("c1"))
    .Returns(new List<Order> { new Order("o1", 50m) });

// Mock with Moq: verify interaction
var emailSender = new Mock<IEmailSender>();
var service = new NotificationService(emailSender.Object);
service.NotifyShipped("c1");
emailSender.Verify(e => e.Send("c1", It.IsAny<string>()), Times.Once);
```

**Rule of thumb**: stub dependencies that provide data; mock dependencies that represent side effects (email, SMS, audit log). Over-mocking — mocking every dependency including internal ones — produces brittle tests that break on every refactor.

### Two schools: classicist vs mockist

How much you mock isn't just taste — it's two named philosophies, and knowing them resolves most "should I mock this?" arguments:

- **Classicist / Detroit / "solitary-ish but sociable"** — mock only at true system boundaries (DB, HTTP, clock); let a unit use its *real* collaborators (real value objects, real domain services). Tests assert on **observable state/results**. Tests survive refactors because they don't know internal call structure, but a failure can implicate several classes.
- **Mockist / London / "outside-in"** — isolate the unit by mocking **all** collaborators and assert on the **interactions** between them. Tests pinpoint the exact class and drive interface design top-down, but they couple to implementation and break when you reshuffle internals (the over-mocking brittleness above).

Most pragmatic suites lean **classicist** — mock the boundary, use the real thing inside — precisely to avoid that brittleness, reaching for interaction verification only for genuine side effects. The same split shows up in [[Software Engineering/06 Development Practices/Paradigms/Test-Driven Development\|TDD]] as inside-out (Detroit) vs outside-in (London).

## xUnit in .NET

xUnit is the standard .NET unit testing framework. Key attributes:

```csharp
[Fact]                          // single test case
[Theory]                        // parameterized test
[InlineData(1, 2, 3)]           // inline parameters for Theory
[MemberData(nameof(Cases))]     // external data source
[ClassFixture<T>]               // shared setup across tests in a class
[Collection("db")]              // shared setup across test classes
```

```csharp
[Theory]
[InlineData(0,   100m, 100m)]   // no orders → no discount
[InlineData(10,  100m, 85m)]    // exactly at threshold → discount applies
[InlineData(20,  200m, 170m)]   // well above threshold
public void DiscountCalculation(int orderCount, decimal price, decimal expected)
{
    var customer = new Customer("c1", orderCount);
    var service  = new DiscountService(loyaltyThreshold: 10, discountRate: 0.15m);
    Assert.Equal(expected, service.Calculate(price, customer));
}
```

## Pitfalls

### Testing Implementation, Not Behavior

**What goes wrong**: tests assert on private state or verify every internal method call. When you refactor the implementation, tests break even though behavior is unchanged.

**Why it happens**: writing tests after the fact often produces white-box tests that mirror the code structure.

**Mitigation**: test through the public interface only. Assert on return values and observable side effects. If a refactor breaks a test without changing behavior, the test was testing the wrong thing.

### Shared Mutable State Between Tests

**What goes wrong**: tests pass individually but fail when run together because one test mutates a static field or shared object that another test reads.

**Why it happens**: static helpers, singleton services, or shared test fixtures with mutable state.

**Mitigation**: create fresh instances in each test's Arrange step. Use `IClassFixture<T>` only for expensive but immutable setup (e.g., starting a test server). Never share mutable state across tests.

### Slow Tests from Real I/O

**What goes wrong**: a "unit" test hits a real database or filesystem, making the suite take minutes instead of seconds.

**Why it happens**: dependencies are not injected — the class creates its own `SqlConnection` or `HttpClient` internally.

**Mitigation**: inject all I/O dependencies as interfaces. Use fakes or in-memory implementations in unit tests. Reserve real I/O for integration tests.

## Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Unit tests with mocks | Fast, isolated, design pressure | Can miss integration bugs, mocks can diverge from real behavior | Domain logic, business rules, pure functions |
| Unit tests with fakes | More realistic than mocks, still fast | Fakes require maintenance | Repository layer, service layer with complex state |
| Integration tests only | Tests real wiring | Slow, harder to isolate failures | Infrastructure layer, DB queries, HTTP contracts |

**Decision rule**: write unit tests for all domain logic and anything with branching. Add integration tests for the infrastructure layer (DB, HTTP, queues). Don't try to unit-test infrastructure — mock it at the boundary and test the real thing in integration tests.

## Questions

> [!QUESTION]- What is the difference between a stub and a mock?
> - A stub provides canned return values so the test can proceed — it answers questions ("what orders does customer X have?").
> - A mock verifies interactions — it records calls and lets you assert that a specific method was called with specific arguments.
> - Practical rule: stub data sources (repositories, config); mock side-effect sinks (email, SMS, audit log, event bus).
> - Over-mocking (mocking everything including internal collaborators) produces tests that break on every refactor without catching real bugs.
> - Tradeoff: mocks couple tests to implementation details. Prefer fakes (working in-memory implementations) when the dependency has non-trivial behavior.

> [!QUESTION]- How do you test code that depends on the current time?
> - Inject `TimeProvider` (built into .NET 8+) instead of calling `DateTime.UtcNow` directly.
> - In tests, use `FakeTimeProvider` (from `Microsoft.Extensions.TimeProvider.Testing`) to control "now".
> - This makes time-dependent logic (expiry checks, scheduling, TTL calculations) fully deterministic in tests.
> - Tradeoff: requires changing existing code that calls `DateTime.UtcNow` directly — a one-time refactor cost that pays off in every time-sensitive test.

> [!QUESTION]- When should you NOT write unit tests?
> - Trivial property getters/setters with no logic — the test adds noise without catching real bugs.
> - UI rendering logic — visual correctness is better verified with snapshot tests or manual QA.
> - Infrastructure wiring (DI registration, config parsing) — test this with integration tests that boot the real container.
> - Exploratory spike code — write the spike without tests, learn from it, then delete it before it becomes production code.
> - Tradeoff: every test has a maintenance cost. Tests that don't catch real bugs are pure overhead. Focus unit tests on logic with branching, edge cases, and business rules.

## References

- [Unit testing best practices in .NET (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices) — Microsoft's official guidance on naming, AAA pattern, avoiding anti-patterns, and test isolation.
- [xUnit.net documentation](https://xunit.net/docs/getting-started/netcore/cmdline) — getting started guide and reference for `[Fact]`, `[Theory]`, fixtures, and parallelism in xUnit.
- [Moq quickstart](https://github.com/devlooped/moq/wiki/Quickstart) — the most widely used .NET mocking library; covers setup, verification, argument matchers, and callbacks.
- [The Art of Unit Testing (Roy Osherove)](https://www.artofunittesting.com/) — practitioner book covering test design, mocking strategies, and how to maintain a large test suite without it becoming a burden.
- [TimeProvider in .NET 8 (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8/runtime#time-abstraction) — built-in time abstraction replacing `DateTime.UtcNow` coupling; includes `FakeTimeProvider` for tests.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Paradigms/Event-driven\|Event-driven]]
> - [[Software Engineering/06 Development Practices/Paradigms/Functional Programming\|Functional Programming]]
> - [[Software Engineering/06 Development Practices/Paradigms/Integration Testing\|Integration Testing]]
> - [[Software Engineering/06 Development Practices/Paradigms/OOP\|OOP]]
> - [[Software Engineering/06 Development Practices/Paradigms/Test-Driven Development\|Test-Driven Development]]
<!-- whats-next:end -->
