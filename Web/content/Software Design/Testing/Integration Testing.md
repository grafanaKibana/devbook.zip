---
publish: true
created: 2026-08-20T20:41:15.709Z
modified: 2026-08-20T20:41:15.709Z
published: 2026-08-20T20:41:15.709Z
topic:
  - Software Design
subtopic:
  - Testing
summary: Verifies that multiple components work together with real infrastructure like databases.
level:
  - "3"
priority: High
status: Ready to Repeat
---

An integration test exercises a boundary between components using enough real implementation to expose its contract. The boundary may be an ASP.NET Core pipeline, a database provider, a message broker, or an HTTP adapter. A unit test can prove a decision in isolation. An integration test proves that configuration, serialization, protocols, and persistence agree at runtime.

This layer catches wrong SQL, missing dependency registrations, incompatible payloads, and middleware-order failures. Its cost comes from startup, I/O, data lifecycle, and external process state. Flakiness is not inherent to integration testing: it is usually evidence that time, ownership, cleanup, or readiness has not been controlled.

# ASP.NET Core Integration Testing with `WebApplicationFactory`

ASP.NET Core provides `Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<TEntryPoint>`, which hosts the application through `TestServer` and creates an `HttpClient` for the real request pipeline:

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

The request passes through routing, middleware, binding, application services, and the configured persistence substitute without opening a network port. It is not automatically a full production-fidelity test: the example replaces the relational provider with EF Core In-Memory, so it proves pipeline behavior but not SQL translation, relational constraints, transactions, or provider-specific concurrency.

# When to Use Real Infrastructure Vs In-Memory Substitutes

| Dependency | Test approach | Reason |
|---|---|---|
| SQL database | Disposable instance of the production engine. SQLite only for provider-independent relational behavior | EF Core In-Memory does not model SQL translation, transactions, or relational constraints. SQLite still differs from the production provider |
| HTTP external service | `WireMock.Net` or `HttpMessageHandler` fake | Avoid real network calls. Test error scenarios |
| Message queue | Protocol-compatible broker for delivery semantics. Fake for application-only decisions | A fake cannot prove acknowledgement, redelivery, ordering, or serialization behavior |
| File system | Temporary directory for filesystem semantics. Narrow fake when I/O is outside the risk | Real temporary storage exposes paths, permissions, and atomic-move behavior without shared fixtures |
| Clock/time | `FakeTimeProvider` (.NET 8+) | Makes time-sensitive tests deterministic |

**Testcontainers** manages disposable containerized dependencies such as PostgreSQL, Redis, or RabbitMQ. The fixture can be scoped to a test class, collection, or run. Isolation and startup cost determine the right lifetime.

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
> **EF Core In-Memory is not a relational provider.** It does not reproduce SQL translation, relational constraints, transaction behavior, or provider-specific features. SQLite in-memory provides relational behavior but still differs in SQL dialect, type handling, and concurrency. Use the production database engine when those semantics are the reason for the test. Reserve EF Core In-Memory for tests whose persistence behavior is deliberately outside scope.

# Where Integration Tests Sit: the Test Pyramid

The test pyramid is a cost heuristic rather than a quota. Narrow tests usually run faster and identify one failure. Integration tests spend more setup to prove a real boundary. End-to-end tests cover the assembled path with the widest diagnostic surface. Infrastructure-heavy services can rationally have many integration tests because the important behavior lives in SQL, serialization, or protocols.

An inverted suite relies on broad UI or deployed-system tests for behavior that a lower layer could expose. The repair is to move each assertion to the cheapest faithful boundary, not to meet a universal unit/integration/end-to-end ratio.

# Pitfalls

## Shared Database State Between Tests

When tests share a database without resetting owned state, test A can insert a row that changes test B's result. The tests pass alone and fail together.

Give every test a known data baseline. A transaction rollback works only when the application and assertion share that transaction and the behavior under test does not commit independently. Otherwise reset the schema, truncate owned tables, create an isolated database, or restore a template. A fresh container per class is one option, not a requirement.

## Testing Too Much in One Integration Test

Expensive setup can tempt one integration test to exercise many endpoints and services. Its failure then identifies a journey but not the broken boundary.

Assert one coherent behavior or invariant per test. `IClassFixture<T>` can share expensive infrastructure, while each test still owns its request data and expected result.

## Slow CI from Unparallelized Integration Tests

Class or collection boundaries can serialize a suite, and shared database state can prevent safe parallelism even when the runner permits it. Two hundred such tests can turn a fast boundary check into a 15-minute CI lane.

Partition data or databases so tests can run independently, and reuse expensive processes when isolation can be achieved below the process level. Use an xUnit collection when fixtures or external state truly require serialization, then measure that lane separately.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| `WebApplicationFactory` + EF In-Memory | Fast and simple | Not relational. Can diverge in queries and transactions | Pipeline tests where database semantics are explicitly outside scope |
| `WebApplicationFactory` + Testcontainers | Real DB behavior, catches SQL bugs | Requires Docker in CI, slower startup | Repository layer, complex queries, migration tests |
| Full E2E (real deployed service) | Tests the actual production environment | Slowest, most brittle, hard to control state | Smoke tests post-deploy, critical user journeys |

Choose fidelity from the failure being tested. `WebApplicationFactory` with a disposable production database is appropriate when an endpoint's contract includes SQL behavior. A lighter substitute is valid when the database is intentionally outside scope and another test proves that boundary. Deployed end-to-end tests cover a few critical journeys and operational assumptions that an in-process host cannot reproduce.

# References

- [Integration tests in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests)
- [Testcontainers for .NET](https://dotnet.testcontainers.org/)
- [WireMock.Net](https://github.com/WireMock-Net/WireMock.Net)
- [xUnit shared context](https://xunit.net/docs/shared-context)
