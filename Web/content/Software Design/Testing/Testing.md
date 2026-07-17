---
publish: true
created: 2026-07-15T11:53:22.636Z
modified: 2026-07-16T18:47:38.195Z
published: 2026-07-16T18:47:38.195Z
tags:
  - FolderNote
topic:
  - Software Design
subtopic:
  - Testing
summary: Testing as a design and verification discipline — unit vs integration, the test pyramid as a cost model, and TDD.
priority: High
level:
  - "4"
status: Creation
---

# Intro

Testing is both a verification discipline and a design tool. **Unit tests** exercise a single class or method in isolation, fast and deterministically; **integration tests** wire real dependencies together to catch the bugs that isolation hides. The **test pyramid** is a cost model, not a rule: prefer many cheap unit tests, fewer slow integration tests, and a thin layer of end-to-end checks — inverting it makes the suite slow and flaky. TDD closes the loop by writing the test first, which pressures the code toward small, decoupled units before any implementation exists.

<nav style="--card-accent: 132, 204, 22;" class="folder-structure-map" aria-label="Testing section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Integration Testing">Integration Testing</span></span></div><p class="db-card-summary">Verifies that multiple components work together with real infrastructure like databases.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Software Design/Testing/Integration Testing.md" data-tooltip-position="top" aria-label="Integration Testing">Integration Testing</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Test-Driven Development">Test-Driven Development</span></span></div><p class="db-card-summary">Writing a failing test before the code, using Red-Green-Refactor as a design technique.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Software Design/Testing/Test-Driven Development.md" data-tooltip-position="top" aria-label="Test-Driven Development">Test-Driven Development</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Unit Testing">Unit Testing</span></span></div><p class="db-card-summary">Verifies a small, isolated piece of behaviour quickly and deterministically.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Software Design/Testing/Unit Testing.md" data-tooltip-position="top" aria-label="Unit Testing">Unit Testing</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

## Links

- [[Integration Testing]]
- [[Test-Driven Development]]
- [[Unit Testing]]

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
>
> - It is a cost model: unit tests are fast, isolated, and cheap to run and maintain, so you can afford thousands of them; integration and end-to-end tests are slower, flakier, and more expensive, so you keep them few and targeted
> - Inverting it (an "ice-cream cone" of mostly E2E tests) yields a suite that is slow to run and brittle to change, eroding the fast feedback that makes tests worth having
> - The point is coverage of _risk_, not lines: push logic-heavy verification down to units and reserve higher tiers for wiring, contracts, and critical user paths

## References

- [The Practical Test Pyramid (Martin Fowler / Ham Vocke)](https://martinfowler.com/articles/practical-test-pyramid.html) — the canonical explanation of the pyramid as a cost/feedback model, with unit vs service vs UI tiers.
- [UnitTest (Martin Fowler)](https://martinfowler.com/bliki/UnitTest.html) — clarifies the sociable-vs-solitary distinction and what "unit" actually means in practice.
- [Test-Driven Development: By Example (Kent Beck)](https://www.oreilly.com/library/view/test-driven-development/0321146530/) — the foundational text on Red-Green-Refactor and test-first as a design technique.
- [Integration tests in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests) — Microsoft's `WebApplicationFactory` guidance for exercising the real HTTP application pipeline.
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) — the normative contract format for operations, inputs, responses, and reusable schemas.
- [OWASP Web Security Testing Guide: API testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/12-API_Testing/README) — concrete authorization, input, and abuse cases for exposed APIs.
- [ByteByteGo source snapshot: explaining 9 types of API testing](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/explaining-9-types-of-api-testing.md) — the source catalog regrouped here by failure risk and release signal.
