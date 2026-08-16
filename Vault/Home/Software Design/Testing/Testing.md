---
topic:
  - Software Design
subtopic:
  - Testing
summary: Testing as a design and verification discipline — unit vs integration, the test pyramid as a cost model, and TDD.
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Not-Started
---

Testing gathers evidence about specific failure risks. [[Home/Software Design/Testing/Unit Testing|Unit tests]] give fast feedback on narrow behavior, [[Home/Software Design/Testing/Integration Testing|integration tests]] exercise real boundaries and wiring, and [[Home/Software Design/Testing/Testing Pyramid|the testing pyramid]] models the cost of moving an assertion through more of the system. [[Home/Software Design/Testing/Test-Driven Development|TDD]] adds a short test-first feedback loop when that loop helps shape an interface or behavior.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# API Testing by Failure Mode

“API test” describes a boundary, not one test type. The useful test is the narrowest one that can faithfully expose the risk. A schema check catches a renamed field without booting the service. An integration test proves database and authentication wiring. A load test measures a latency budget under concurrency. Applying every category to every endpoint adds runtime and maintenance without increasing confidence in a named failure mode.

Assume `POST /orders` accepts an idempotency key, validates inventory, charges a payment provider, and returns `201 Created` with an order resource.

| Risk | Narrowest useful test | Concrete assertion | Release signal |
| --- | --- | --- | --- |
| Contract drift | Schema or consumer contract test | Required fields, status codes, media type, and error shape still match the published OpenAPI contract | Run on every change to the handler or contract |
| Broken integration | In-process API test with real persistence and test doubles only at external networks | A valid request commits one order. An invalid token returns `401`. A provider timeout rolls back or leaves a recoverable state | Run in pull requests and before deployment |
| Regression in a known incident | Focused test at the lowest reproducing layer | Replaying the same idempotency key returns the first result and creates no second charge | Add with the fix and keep permanently |
| Capacity or latency collapse | Load and stress tests in a production-like environment | At 500 requests per second, p95 stays below the budget and the error rate remains bounded. Above the limit, backpressure is controlled | Run before capacity-sensitive releases and on a schedule |
| Security boundary failure | Authorization, input, rate-limit, and abuse-case tests | One tenant cannot read another tenant's order. Oversized or malicious input is rejected without leaking internals | Run for every exposed operation and threat-model change |
| Parser or state-machine edge case | Property-based or fuzz test | Generated JSON never crashes the process. Accepted inputs preserve the order invariant | Run continuously on parsers and complex validation |

Smoke tests answer a smaller question: is the deployed API reachable, and does one critical path still work? They are deployment checks rather than substitutes for the risk-focused tests above. Browser tests belong where rendering, client routing, or the browser-to-API interaction is part of the contract.

## A Minimal ASP.NET Core Integration Test

`WebApplicationFactory<TEntryPoint>` hosts the ASP.NET Core application through an in-process test server. Keep routing, middleware, serialization, authentication, and persistence as real as the target risk requires. Replace only boundaries the test does not own or cannot run deterministically.

```csharp
public sealed class OrderApiTests(OrderApiFactory factory)
    : IClassFixture<OrderApiFactory>
{
    [Fact]
    public async Task ReplayingAnIdempotencyKeyCreatesOneOrder()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("Idempotency-Key", "order-42");

        var first = await client.PostAsJsonAsync("/orders", new { Sku = "book", Quantity = 1 });
        var replay = await client.PostAsJsonAsync("/orders", new { Sku = "book", Quantity = 1 });

        first.StatusCode.Should().Be(HttpStatusCode.Created);
        replay.StatusCode.Should().Be(HttpStatusCode.Created);
        factory.Orders.Count(order => order.IdempotencyKey == "order-42").Should().Be(1);
    }
}
```

This test earns its higher setup cost because the invariant crosses HTTP binding, middleware, application logic, and persistence. A pure price calculation exposes no such boundary and belongs in a faster unit test.

# References

- [OWASP Web Security Testing Guide: API testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/12-API_Testing/README)
