---
publish: true
created: 2026-02-10T01:40:47.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-28T20:52:55.191Z
topic:
  - Software Design
subtopic:
  - Testing
summary: Verifies a small, isolated piece of behaviour quickly and deterministically.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Software Design
qard-topic: Testing/Unit Testing
flashcard_uid: 897d08d1
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
| **Spy** | Records calls for later assertion | `IEmailSender` double that records each sent message so the test can inspect them afterward |

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

Neither school removes the need for integration tests. A pragmatic default is to keep stable in-memory collaborators real and verify interactions only when the interaction is part of the contract. The same distinction appears in [[Software Design/Testing/Test-Driven Development|TDD]] as inside-out and outside-in design styles.

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

A behavior-focused test exercises the same public or internal contract that production callers use and asserts observable results. A test that fails after a behavior-preserving refactor may be observing an implementation detail. That test needs review before production code is changed to satisfy the old call structure.

## Shared Mutable State Between Tests

Tests can pass individually and fail together when a static helper, singleton, or shared fixture lets one test mutate state another test reads.

Each test gets fresh behavior-owning objects and data. A fixture may share an expensive process or immutable configuration, but each test needs isolated mutable state or an explicit reset protocol.

## Slow Tests from Real I/O

A test that reaches a real database or filesystem crosses a process boundary, regardless of its label. The suite becomes slower and its failures include infrastructure state.

Separating the decision from I/O is worthwhile when that separation improves the production design. The decision is then tested with plain values, and the real adapter is tested through an integration test. An interface is useful when it represents a genuine seam, not as a wrapper around every library call.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| State-based unit tests with real in-memory collaborators | Refactor-tolerant and close to domain behavior | A failure may span several objects | Domain rules, value objects, deterministic workflows |
| Interaction-based unit tests | Specify commands and collaboration protocols precisely | Couple to call structure. Doubles can diverge | Side-effect ports where the interaction is the observable contract |
| Integration tests | Prove real wiring and provider semantics | More setup and a wider failure surface | Database queries, serialization, HTTP adapters, and configuration |

The right layer is the lowest-cost one that can expose the failure faithfully. Deterministic domain decisions usually belong in unit tests. Failures that depend on a real SQL provider, wire-level serialization, HTTP, queues, or configuration binding require integration evidence. Deterministic in-memory framework behavior, such as serializing an object to a JSON string, can still be covered by a unit test. Coverage and branch count can reveal gaps, but neither makes every line worth an independent test.

# Questions

> [!qard]- What is a unit test, and what counts as the unit?
> A unit test verifies one small behavior quickly and deterministically, without crossing slow or nondeterministic process boundaries such as a database, remote HTTP, the filesystem or uncontrolled time. The unit is defined by the behavior under test, not by code size. It can be one method, one class or a small group of collaborating objects.
>
> - **Kept real:** ordinary in-memory collaborators can run as they are. They do not need to be mocked for the test to count as a unit test. Replacing them anyway is a design style, the mockist or London school, not part of the definition.
> - **Replaced:** process boundaries the test does not own are represented by test doubles or plain values, such as a fixed clock instead of the system time.
> - **Result:** fast, local evidence and a failure that points to a specific behavior.
>
> A test that reaches a real database or filesystem has crossed a process boundary, whatever it is called. It becomes slower, and its failures include infrastructure state, so that behavior belongs in an integration test.
>
> [.NET unit-testing best practices](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)

<!-- qard-id: 50fa1ae9-ab7b-4bb7-8b43-369f01298379 -->

> [!qard]- What is the difference between a stub and a mock?
> A stub supplies canned answers so the code under test can run, and the test then checks the result. A mock is set up with expected calls, and the test checks that those interactions actually happened.
>
> | Aspect | Stub | Mock |
> |---|---|---|
> | Role | Feeds inputs to the code under test, such as a repository that returns a fixed list of orders. | Observes outgoing calls, such as whether an email sender was asked to send a message exactly once. |
> | What the test asserts | The outcome: a returned value or other observable state. | The interaction: which calls were made, with which arguments and how often. |
> | Coupling to implementation | Lower. Internal refactoring does not break the test while the outcome and the stubbed contract stay the same. | Higher. Changing how collaborators are called can break the test even when the outcome is unchanged. |
> | Typical fit | Dependencies whose answers drive the logic. | Commands whose observable result is the call itself, such as publishing an event. |
>
> The typical-fit row is a heuristic, not a type rule. The distinction lies in how the test uses the double, not in the tool that created it. In Moq, the same `Mock<T>` acts as a stub when it only configures `Setup(...).Returns(...)`, and as a mock when the test calls `Verify(...)`.
>
> Two related doubles complete the vocabulary. A spy records the calls it receives so the test can assert on them afterwards. A fake is a simplified working implementation, such as an in-memory repository backed by a `Dictionary`.
>
> [Martin Fowler: Mocks Aren’t Stubs](https://martinfowler.com/articles/mocksArentStubs.html)

<!-- qard-id: dd734573-8233-47e9-bc3d-5fac7fc6e841 -->

> [!qard]- When is a unit test the wrong testing layer?
> A unit test is the wrong layer when the realistic failure comes from a boundary that the unit test replaces or never runs. A unit test substitutes doubles or plain values for databases, remote services and other process boundaries, so it cannot observe failures that only the real boundary produces. Using framework code does not by itself rule out a unit test. Deterministic in-memory framework behavior, such as `JsonSerializer.Serialize` turning an object into a JSON string, can run inside one. The limit applies when the test replaces that behavior or never runs the real configuration, host or wire exchange around it.
>
> Typical cases:
>
> - **Provider SQL and persistence:** a stubbed repository cannot show whether the database provider translates a query correctly or whether the query matches the real schema. An in-memory database provider is not a faithful substitute for relational behavior either.
> - **Serialization and protocols:** field names, formats and wire compatibility are decided by the real serializer or HTTP stack.
> - **Dependency registration and configuration binding:** a missing service registration or a misbound setting appears only when the real container and configuration are built and used.
> - **Rendering:** markup and layout come from the UI framework, not from isolated logic.
>
> These failures need a component or integration test that exercises the boundary with a real or appropriate implementation. The guiding rule is the lowest-cost layer that can still expose the realistic failure. Deterministic domain decisions belong in unit tests, while wiring and provider behavior need integration evidence.
>
> [.NET unit-testing best practices](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices) · [.NET: Serialize objects to JSON with System.Text.Json](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/how-to)

# References

- [Unit testing best practices in .NET](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)
- [xUnit.net documentation](https://xunit.net/docs/getting-started/netcore/cmdline)
- [Moq quickstart](https://github.com/devlooped/moq/wiki/Quickstart)
