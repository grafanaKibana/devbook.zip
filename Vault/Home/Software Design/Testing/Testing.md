---
topic:
  - Software Design
subtopic:
  - Testing
summary: Testing as a design and verification discipline — unit vs integration, the test pyramid as a cost model, and TDD.
tags:
  - FolderNote
publish: true
priority: High
level:
  - "4"
status: Creation
---

# Intro

Testing is both a verification discipline and a design tool. **Unit tests** exercise a single class or method in isolation, fast and deterministically; **integration tests** wire real dependencies together to catch the bugs that isolation hides. The **test pyramid** is a cost model, not a rule: prefer many cheap unit tests, fewer slow integration tests, and a thin layer of end-to-end checks — inverting it makes the suite slow and flaky. TDD closes the loop by writing the test first, which pressures the code toward small, decoupled units before any implementation exists.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## API Testing by Failure Mode

“API test” describes a boundary, not a single test type. Choose the narrowest test that can expose the risk. A contract test catches a renamed field without booting the full system; an integration test proves the database and authentication wiring; a load test proves the latency budget under concurrency. Running nine peer categories on every endpoint creates cost without evidence.

Assume `POST /orders` accepts an idempotency key, validates inventory, charges a payment provider, and returns `201 Created` with an order resource.

| Risk | Narrowest useful test | Concrete assertion | Release signal |
| --- | --- | --- | --- |
| Contract drift | Schema or consumer contract test | Required fields, status codes, media type, and error shape still match the published OpenAPI contract | Run on every change to the handler or contract |
| Broken integration | In-process API test with real persistence and test doubles only at external networks | A valid request commits one order; an invalid token returns `401`; a provider timeout rolls back or leaves a recoverable state | Run in pull requests and before deployment |
| Regression in a known incident | Focused test at the lowest reproducing layer | Replaying the same idempotency key returns the first result and creates no second charge | Add with the fix and keep permanently |
| Capacity or latency collapse | Load and stress tests in a production-like environment | At 500 requests per second, p95 stays below the budget and the error rate remains bounded; above the limit, backpressure is controlled | Run before capacity-sensitive releases and on a schedule |
| Security boundary failure | Authorization, input, rate-limit, and abuse-case tests | One tenant cannot read another tenant's order; oversized or malicious input is rejected without leaking internals | Run for every exposed operation and threat-model change |
| Parser or state-machine edge case | Property-based or fuzz test | Generated JSON never crashes the process; accepted inputs preserve the order invariant | Run continuously on parsers and complex validation |

Smoke tests answer a smaller question: “is the deployed API reachable and is one critical path alive?” They are deployment checks, not substitutes for the risk-focused tests above. UI tests are appropriate only when the browser-to-API interaction is itself the contract under test.

### A minimal ASP.NET Core integration test

`WebApplicationFactory<TEntryPoint>` runs the real middleware and endpoint pipeline in memory. Replace only the external payment boundary, keep serialization, authentication, routing, and persistence behavior as real as the risk requires.

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

The test is worth its higher cost because the invariant crosses HTTP binding, middleware, application logic, and persistence. Pure price calculations should stay in fast unit tests.

## Questions

> [!QUESTION]- Why is the test pyramid shaped the way it is?
> - It is a cost model: unit tests are fast, isolated, and cheap to run and maintain, so you can afford thousands of them; integration and end-to-end tests are slower, flakier, and more expensive, so you keep them few and targeted
> - Inverting it (an "ice-cream cone" of mostly E2E tests) yields a suite that is slow to run and brittle to change, eroding the fast feedback that makes tests worth having
> - The point is coverage of *risk*, not lines: push logic-heavy verification down to units and reserve higher tiers for wiring, contracts, and critical user paths

## References

- [The Practical Test Pyramid (Martin Fowler / Ham Vocke)](https://martinfowler.com/articles/practical-test-pyramid.html) — the canonical explanation of the pyramid as a cost/feedback model, with unit vs service vs UI tiers.
- [UnitTest (Martin Fowler)](https://martinfowler.com/bliki/UnitTest.html) — clarifies the sociable-vs-solitary distinction and what "unit" actually means in practice.
- [Test-Driven Development: By Example (Kent Beck)](https://www.oreilly.com/library/view/test-driven-development/0321146530/) — the foundational text on Red-Green-Refactor and test-first as a design technique.
- [Integration tests in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests) — Microsoft's `WebApplicationFactory` guidance for exercising the real HTTP application pipeline.
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) — the normative contract format for operations, inputs, responses, and reusable schemas.
- [OWASP Web Security Testing Guide: API testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/12-API_Testing/README) — concrete authorization, input, and abuse cases for exposed APIs.
- [ByteByteGo source snapshot: explaining 9 types of API testing](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/explaining-9-types-of-api-testing.md) — the source catalog regrouped here by failure risk and release signal.
