---
publish: true
created: 2026-07-08T15:01:12.535Z
modified: 2026-07-08T15:01:12.535Z
published: 2026-07-08T15:01:12.535Z
topic:
  - Development Practices
subtopic:
  - Paradigms
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Integration Testing

An integration test verifies that multiple components work correctly together — including real infrastructure like databases, HTTP clients, message queues, and configuration. Where unit tests replace dependencies with fakes to isolate logic, integration tests use real (or realistic test-instance) dependencies to validate wiring, configuration, and cross-boundary behavior.

Integration tests catch a class of bugs that unit tests cannot: wrong SQL queries, misconfigured DI registrations, broken serialization contracts, and middleware ordering issues. The tradeoff is speed and flakiness — integration tests are slower and more sensitive to environment state.

## ASP.NET Core Integration Testing with `WebApplicationFactory`

The standard approach in .NET is `Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<T>`, which boots the real application in-process with a test HTTP client:

```csharp
public class OrdersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OrdersApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Replace real DB with in-memory EF Core
                    services.RemoveAll<DbContextOptions<AppDbContext>>();
                    services.AddDbContext<AppDbContext>(opts =>
                        opts.UseInMemoryDatabase("TestDb"));
                });
            })
            .CreateClient();
    }

    [Fact]
    public async Task PostOrder_Returns201_AndPersistsOrder()
    {
        var payload = new { ProductId = "p1", Quantity = 2 };
        var response = await _client.PostAsJsonAsync("/orders", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // Verify the order was actually persisted
        var getResponse = await _client.GetAsync(response.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
    }
}
```

This tests the full request pipeline: routing, middleware, controller, service, repository, and database — all in one test without spinning up a real server.

## When to Use Real Infrastructure vs In-Memory Substitutes

| Dependency | Test approach | Reason |
|---|---|---|
| SQL database | Testcontainers (real Docker DB) or EF In-Memory | In-memory misses SQL-specific behavior (constraints, transactions, indexes) |
| HTTP external service | `WireMock.Net` or `HttpMessageHandler` fake | Avoid real network calls; test error scenarios |
| Message queue | In-memory fake or Testcontainers | Real queues add latency and ordering complexity |
| File system | `System.IO.Abstractions` fake | Avoids path/permission issues in CI |
| Clock/time | `FakeTimeProvider` (.NET 8+) | Makes time-sensitive tests deterministic |

**Testcontainers** spins up a real Docker container (Postgres, Redis, RabbitMQ) per test run, giving you real behavior without a shared environment:

```csharp
public class DatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres =
        new PostgreSqlBuilder().WithImage("postgres:16").Build();

    public string ConnectionString => _postgres.GetConnectionString();

    public Task InitializeAsync() => _postgres.StartAsync();
    public Task DisposeAsync()    => _postgres.DisposeAsync().AsTask();
}
```

> [!WARNING]
> **EF Core In-Memory is officially discouraged for testing.** Microsoft's own guidance says it is _not_ a relational database — it ignores constraints, transactions, concurrency tokens, raw SQL, and most provider-specific behavior, so it gives **false confidence**. Prefer **SQLite in-memory** (a real relational engine, still fast and Docker-free) for lightweight DB tests, and **Testcontainers** with the actual database when you need full fidelity. Reserve EF In-Memory for the rare case where you truly only exercise LINQ-to-objects.

## Where Integration Tests Sit: the Test Pyramid

The **test pyramid** (Mike Cohn) is the standard model for _how many_ of each test to write: a wide base of fast **unit** tests, fewer **integration** tests in the middle, and a thin top of slow **end-to-end** tests. The ratios follow from cost — unit tests are cheap and pinpoint failures; E2E tests are slow, flaky, and hard to diagnose. Integration tests are the pragmatic middle: enough to prove the wiring (DB, HTTP, serialization, DI) without the brittleness of a full E2E suite.

The classic anti-pattern is the **"ice-cream cone"** — inverting the pyramid with mostly manual/E2E tests and few unit tests, producing a slow, flaky, expensive-to-maintain suite. Aim for many unit, some integration, few E2E.

## Pitfalls

### Shared Database State Between Tests

**What goes wrong**: test A inserts a row; test B reads it and gets unexpected results. Tests pass in isolation but fail when run together.

**Why it happens**: tests share a database without cleaning up between runs.

**Mitigation**: wrap each test in a transaction and roll back at the end, or recreate the database schema before each test class. With Testcontainers, use a fresh container per test class.

### Testing Too Much in One Integration Test

**What goes wrong**: a single test exercises 10 endpoints and 5 services. When it fails, the failure message doesn't tell you which component broke.

**Why it happens**: integration tests feel expensive to set up, so developers pack multiple assertions into one test.

**Mitigation**: one behavior per test. The setup cost is paid by `IClassFixture<T>` — share the expensive infrastructure, not the test logic.

### Slow CI from Unparallelized Integration Tests

**What goes wrong**: 200 integration tests run sequentially and take 15 minutes in CI.

**Why it happens**: xUnit runs test classes in parallel by default, but tests in the same class run sequentially. Tests that share a database via `[Collection]` are serialized.

**Mitigation**: use separate databases per test class (Testcontainers makes this cheap). Avoid `[Collection]` unless tests genuinely share state that cannot be isolated.

## Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| `WebApplicationFactory` + EF In-Memory | Fast, no Docker dependency | Misses SQL-specific behavior (constraints, transactions) | API contract tests, middleware tests, DI wiring |
| `WebApplicationFactory` + Testcontainers | Real DB behavior, catches SQL bugs | Requires Docker in CI, slower startup | Repository layer, complex queries, migration tests |
| Full E2E (real deployed service) | Tests the actual production environment | Slowest, most brittle, hard to control state | Smoke tests post-deploy, critical user journeys |

**Decision rule**: start with `WebApplicationFactory` + EF In-Memory for API-level tests. Add Testcontainers for the repository layer when you need real SQL behavior (constraints, `RETURNING`, CTEs). Reserve full E2E tests for post-deploy smoke checks only.

## Questions

> [!QUESTION]- What does `WebApplicationFactory` test that unit tests cannot?
>
> - DI registration: if a service is missing from the container, the integration test fails at startup.
> - Middleware ordering: authentication, authorization, exception handling, and routing all run in the real pipeline.
> - Serialization contracts: JSON serialization settings (camelCase, nullable handling, custom converters) are applied.
> - Controller binding: model validation, route constraints, and action filters run as they would in production.
> - Tradeoff: `WebApplicationFactory` tests are slower than unit tests (seconds vs milliseconds). Run them in a separate test project so they don't slow down the unit test feedback loop.

> [!QUESTION]- When should you use Testcontainers instead of EF In-Memory?
>
> - When your queries use SQL features that EF In-Memory doesn't support: raw SQL, stored procedures, database constraints, `RETURNING` clauses, CTEs.
> - When you need to test database migrations (EF In-Memory doesn't run migrations).
> - When a bug was caused by SQL behavior that the in-memory provider masked.
> - Tradeoff: Testcontainers requires Docker in CI and adds 5-15 seconds of container startup per test class. The cost is worth it when in-memory tests give false confidence.

## References

- [Integration tests in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests) — official guide to `WebApplicationFactory`, test server setup, and replacing services for testing.
- [Testcontainers for .NET](https://dotnet.testcontainers.org/) — library for spinning up real Docker containers (Postgres, Redis, RabbitMQ) in integration tests; includes pre-built modules for common databases.
- [WireMock.Net](https://github.com/WireMock-Net/WireMock.Net) — HTTP mock server for .NET; use it to stub external HTTP dependencies in integration tests with realistic request/response matching.
- [xUnit shared context (fixtures)](https://xunit.net/docs/shared-context) — how to share expensive setup (database, test server) across tests using `IClassFixture<T>` and `ICollectionFixture<T>`.
