---
topic:
  - Software Design
subtopic:
  - Testing
summary: "Verifies a small, isolated piece of behaviour quickly and deterministically."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
qard-deck: "Software Design"
qard-topic: "Testing/Unit Testing"
flashcard_uid: "897d08d1"
---

A unit test verifies one small behavior without crossing slow or nondeterministic process boundaries. The unit may be one method, one class, or a small group of collaborating objects. Databases, remote HTTP, the filesystem, and uncontrolled time stay outside the test. Ordinary in-memory collaborators do not need to be mocked merely to satisfy a definition.

The value is fast, local evidence and a diagnostic failure. Testability can reveal hidden time, global state, or too many responsibilities, but difficulty testing does not automatically prove a design defect. The production boundary still decides whether an abstraction is worth adding.

# Anatomy of a Unit Test (AAA Pattern)

Arrange → Act → Assert is a useful structure for making setup, behavior, and observation visible:

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

A diagnostic name states the condition and observable result. `MethodName_StateUnderTest_ExpectedBehavior` is one convention. A readable behavioral sentence is equally valid when the runner supports it.

# Test Doubles: Stubs Vs Mocks

| Type | Purpose | Example |
|---|---|---|
| **Stub** | Returns canned data so the test can proceed | `IOrderRepository` that returns a fixed list |
| **Mock** | Verifies interactions — was a method called with the right arguments? | Assert `_emailSender.Send(...)` was called once |
| **Fake** | A working lightweight implementation | In-memory `IOrderRepository` backed by a `Dictionary` |
| **Spy** | Records calls for later assertion | Rarely needed. Prefer mocks |

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

Stubs commonly provide inputs. Interaction-based mocks are most useful for commands whose observable result is the call itself, such as publishing an event. That is a heuristic, not a type rule. Verifying every internal collaboration couples the test to call structure and makes behavior-preserving refactors expensive.

## Two Schools: Classicist Vs Mockist

Two testing traditions frame how much of a unit remains real:

- **Classicist / Detroit** tests a behavior with real in-memory collaborators and replaces awkward process boundaries. Assertions favor returned state and externally visible effects. The tests tolerate internal refactoring, although a failure may implicate several classes.
- **Mockist / London** replaces collaborators and specifies their interactions while driving the design outside-in. Failures can localize collaboration changes, but the tests are coupled to those interactions.

Neither school removes the need for integration tests. A pragmatic default is to keep stable in-memory collaborators real and verify interactions only when the interaction is part of the contract. The same distinction appears in [[Home/Software Design/Testing/Test-Driven Development|TDD]] as inside-out and outside-in design styles.

# xUnit in .NET

xUnit is a widely used .NET test framework. `[Fact]`, `[Theory]`, `[InlineData]`, `[MemberData]`, and `[Collection("name")]` are attributes. Shared context for one test class is declared by implementing `IClassFixture<TFixture>`.

```csharp
[Fact]                          // single test case
[Theory]                        // parameterized test
[InlineData(1, 2, 3)]           // inline parameters for Theory
[MemberData(nameof(Cases))]     // external data source
[Collection("db")]              // shared setup across test classes
```

```csharp
public sealed class DatabaseTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture fixture;

    public DatabaseTests(DatabaseFixture fixture) => this.fixture = fixture;
}
```

```csharp
public static IEnumerable<object[]> DiscountCases => new[]
{
    new object[] { 0, 100m, 100m },   // no orders → no discount
    new object[] { 10, 100m, 85m },   // exactly at threshold → discount applies
    new object[] { 20, 200m, 170m }   // well above threshold
};

[Theory]
[MemberData(nameof(DiscountCases))]
public void DiscountCalculation(int orderCount, decimal price, decimal expected)
{
    var customer = new Customer("c1", orderCount);
    var service  = new DiscountService(loyaltyThreshold: 10, discountRate: 0.15m);
    Assert.Equal(expected, service.Calculate(price, customer));
}
```

# Pitfalls

## Testing Implementation, Not Behavior

White-box tests mirror the current code structure by asserting private state or every internal call. A behavior-preserving refactor then breaks the test.

Exercise the same public or internal contract that production callers use and assert observable results. A test that fails after a behavior-preserving refactor may be observing an implementation detail. Review it before changing production code to satisfy the old call structure.

## Shared Mutable State Between Tests

Tests can pass individually and fail together when a static helper, singleton, or shared fixture lets one test mutate state another test reads.

Create fresh behavior-owning objects and data per test. A fixture may share an expensive process or immutable configuration, but each test needs isolated mutable state or an explicit reset protocol.

## Slow Tests from Real I/O

A test that reaches a real database or filesystem crosses a process boundary, regardless of its label. The suite becomes slower and its failures include infrastructure state.

Separate the decision from I/O when that separation improves the production design. Test the decision with values and the real adapter through an integration test. An interface is useful when it represents a genuine seam, not as a wrapper around every library call.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| State-based unit tests with real in-memory collaborators | Refactor-tolerant and close to domain behavior | A failure may span several objects | Domain rules, value objects, deterministic workflows |
| Interaction-based unit tests | Specify commands and collaboration protocols precisely | Couple to call structure. Doubles can diverge | Side-effect ports where the interaction is the observable contract |
| Integration tests | Prove real wiring and provider semantics | More setup and a wider failure surface | Database queries, serialization, HTTP adapters, and configuration |

Choose the lowest-cost layer that can expose the failure faithfully. Deterministic domain decisions usually belong in unit tests. SQL, serialization, HTTP, queues, and configuration require integration evidence. Coverage and branch count can reveal gaps, but neither makes every line worth an independent test.

# Questions

<!-- qard-id: 50fa1ae9-ab7b-4bb7-8b43-369f01298379 -->
> [!qard]- What is the difference between a stub and a mock?
> A stub supplies answers the test needs to exercise behavior. A mock is configured with expected interactions and verifies that they occurred. The distinction is how the test uses the double, not which framework created it. A spy records calls and a fake is a simplified working implementation. [Martin Fowler: Mocks Aren’t Stubs](https://martinfowler.com/articles/mocksArentStubs.html)

<!-- qard-id: dd734573-8233-47e9-bc3d-5fac7fc6e841 -->
> [!qard]- When is a unit test the wrong testing layer?
> Use a unit test when the behavior is isolated and its dependencies can be represented without crossing the boundary under test. Rendering, dependency registration/configuration binding, provider SQL, and serialization failures need a component or integration test that exercises that boundary. Choose the cheapest layer that can still expose the realistic failure. [.NET unit-testing best practices](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)

# References

- [Unit testing best practices in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)
- [xUnit.net documentation](https://xunit.net/docs/getting-started/netcore/cmdline)
- [Moq quickstart](https://github.com/devlooped/moq/wiki/Quickstart)
