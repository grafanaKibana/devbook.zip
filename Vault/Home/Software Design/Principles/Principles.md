---
topic:
  - Software Design
subtopic:
  - Principles
summary: "Design heuristics like SOLID, DRY, KISS, and YAGNI that keep systems understandable."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Creation
---

Principles like SOLID, DRY, KISS, and YAGNI are decision checks, not a scoring system. Their value is operational: standards make code predictable, tests expose awkward boundaries, dependency control limits the blast radius of change, refactoring keeps those boundaries honest, and security rules constrain what the design is allowed to expose.

Applying single responsibility usually means splitting a module at a stable reason to change, not splitting every method. Likewise, DRY does not require a shared abstraction for two lines that merely look alike. A principle earns its cost only when it removes a concrete change or failure risk.

# Code quality as an operating discipline

Consider an endpoint that charges a card and records an order. The first version constructs an HTTP client, calls the payment provider, writes SQL, catches every exception, and logs the request body in one method. Each quality practice repairs a different failure surface:

| Practice | Concrete move | Failure it prevents |
| --- | --- | --- |
| Coding standard | Name the operation `PlaceOrderAsync`, pass a `CancellationToken`, and use one error contract | Callers and maintainers no longer guess at lifecycle and failure semantics |
| Testability | Move price calculation into a deterministic function and test boundary cases | Arithmetic and validation regressions fail before provider integration |
| Dependency control | Depend on `IPaymentGateway` and an order repository at the use-case boundary | Provider and persistence changes do not rewrite business rules |
| Continuous refactoring | Extract only after a stable boundary appears in tests and changes | The method does not become a permanent knot, and premature abstractions are avoided |
| Security assurance | Validate authorization, keep card data out of logs, and use parameterized persistence | A clean design does not accidentally become a data-exposure path |

These practices reinforce one another. Tests make a refactor safe; dependency inversion gives the test a controllable seam; a smaller seam makes security review more precise. The loop is continuous because the evidence changes as the code and threat model change.

Two common overcorrections break the loop:

- **Moderate abstraction becomes an interface per class.** An abstraction with one implementation and no substitution pressure often adds navigation without reducing coupling. Extract the interface when an external boundary, test seam, or independent change rate justifies it.
- **Pattern literacy becomes pattern collection.** A `FactoryStrategyProvider` around a constructor is not flexibility. Use a pattern when it names and contains a recurring force; delete it when direct code makes the machine clearer.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# References

- [.NET Framework Design Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/) — Microsoft's design rules for consistent, usable public .NET APIs.
- [.NET code-quality analysis overview](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/) — the official analyzer rule families that turn maintainability, reliability, performance, and design concerns into executable checks.
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/) — a concrete verification baseline for translating security assurance into testable requirements.
- [ByteByteGo source snapshot: 10 good coding principles](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/10-good-coding-principles-to-improve-code-quality.md) — the source list reframed here as a reinforcing operating loop rather than ten independent maxims.
