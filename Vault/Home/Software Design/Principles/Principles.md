---
topic:
  - Software Design
subtopic:
  - Principles
summary: "Design heuristics like SOLID, DRY, KISS, and YAGNI that keep systems understandable."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Creation
---

Principles like SOLID, DRY, KISS, and YAGNI are decision checks, not a scoring system. Each one names a recurring risk: responsibilities that change for different reasons, duplicated rules that drift, unnecessary moving parts, or flexibility built before its requirements are known.

Applying single responsibility usually means splitting a module at a stable reason to change, not splitting every method. Likewise, DRY does not require a shared abstraction for two lines that merely look alike. A principle earns its cost only when it removes a concrete change or failure risk.

# Why Software Design Principles Matter

The value of a principle appears in the behavior of the codebase, not in the label attached to a design. Useful principles make change costs and failure boundaries easier to reason about.

| Design effect | What becomes easier to judge |
| --- | --- |
| Change locality | A requirement change reaches a bounded set of modules instead of leaking through unrelated code. |
| Explicit dependencies | Construction, data flow, and external effects are visible rather than hidden behind global state or incidental calls. |
| Verifiable behavior | Business rules and boundaries can be exercised without reproducing the entire production environment. |
| Consistent decisions | Shared heuristics let a team discuss tradeoffs in terms of change, ownership, and failure risk. |

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Code Quality as an Operating Discipline

Consider an endpoint that charges a card and records an order. The first version constructs an HTTP client, calls the payment provider, writes SQL, catches every exception, and logs the request body in one method. Each quality practice repairs a different failure surface:

| Practice | Concrete move | Failure it prevents |
| --- | --- | --- |
| Coding standard | Name the operation `PlaceOrderAsync`, pass a `CancellationToken`, and use one error contract | Callers and maintainers no longer guess at lifecycle and failure semantics |
| Testability | Move price calculation into a deterministic function and test boundary cases | Arithmetic and validation regressions fail before provider integration |
| Dependency control | Depend on `IPaymentGateway` and an order repository at the use-case boundary | Provider and persistence changes do not rewrite business rules |
| Continuous refactoring | Extract only after a stable boundary appears in tests and changes | The method does not become a permanent knot, and premature abstractions are avoided |
| Security assurance | Validate authorization, keep card data out of logs, and use parameterized persistence | A clean design does not accidentally become a data-exposure path |

These practices reinforce one another. Tests make a refactor safe. Dependency inversion gives the test a controllable seam. A smaller seam makes security review more precise. The loop is continuous because the evidence changes as the code and threat model change.

Two common overcorrections break the loop:

- **Abstraction becomes an interface per class.** An abstraction with one implementation and no substitution pressure often adds navigation without reducing coupling. Extract the interface when an external boundary, test seam, or independent change rate justifies it.
- **Pattern literacy becomes pattern collection.** A `FactoryStrategyProvider` around a constructor is not flexibility. Use a pattern when it names and contains a recurring force. Delete it when direct code makes the machine clearer.

# References

- [.NET Framework Design Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
