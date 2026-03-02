---
topic:
  - Development Practices
subtopic:
  - Principles
level:
  - "4"
priority: High
status: Creation
dg-publish: true
---

# YAGNI

YAGNI — *You Aren't Gonna Need It* — means: do not build a feature until you have a real, current need for it. It protects against speculative complexity: abstractions, extension points, and configuration options added for hypothetical future requirements that never arrive. Every line of code you write has a maintenance cost; YAGNI says don't pay that cost for features you don't need yet.

YAGNI is most useful when design discussions drift toward "what if we need to support X later?" — the answer is: build it when X is a real requirement with a real user, not before.

## When to Apply It

The signal that YAGNI applies: a design decision is driven by a hypothetical future requirement rather than a current one. Common patterns:

- Adding a plugin architecture "in case we need to swap implementations" — when there is currently one implementation and no concrete plan for a second.
- Building a generic configuration system for a feature that has exactly one configuration today.
- Adding an abstraction layer over a library "in case we switch libraries" — when there is no plan to switch.

The counter-signal: YAGNI does *not* mean "never design for change." It means don't pay the cost of flexibility until the need is real. Reversible decisions (feature flags, thin adapters, config values) are cheap — build them. Irreversible decisions (public API contracts, database schemas, wire protocols) deserve more upfront thought because changing them later is expensive.

## Example

```csharp
// YAGNI violation: generic plugin system for a feature with one implementation
public interface IReportGenerator { Report Generate(ReportRequest req); }
public class PdfReportGenerator : IReportGenerator { ... }
public class ReportGeneratorFactory
{
    public IReportGenerator Create(string type) => type switch
    {
        "pdf" => new PdfReportGenerator(),
        _     => throw new NotSupportedException(type)
    };
}
// There is no second report type. The factory and interface add complexity for no current value.

// YAGNI-compliant: direct implementation until a second type is needed
public class ReportService
{
    public Report Generate(ReportRequest req) { /* PDF logic directly */ }
}
// When a second format is needed, introduce the abstraction then — with a real use case to guide the design.
```

## References

- [YAGNI (Martin Fowler)](https://martinfowler.com/bliki/Yagni.html) — concise explanation of YAGNI with the important nuance: it applies to *features*, not to good engineering practices like testing and refactoring.
- [You aren't gonna need it (Wikipedia)](https://en.wikipedia.org/wiki/You_aren%27t_gonna_need_it) — origin in Extreme Programming and the relationship to the broader XP principle of doing the simplest thing that could possibly work.
- [[Software Engineering/06 Development Practices/Principles/KISS|KISS]] — related principle: keep implementations simple; complexity should be justified by current requirements.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Principles/DRY|DRY]]
> - [[Software Engineering/06 Development Practices/Principles/IoC (Holywood Principle)|IoC (Holywood Principle)]]
> - [[Software Engineering/06 Development Practices/Principles/KISS|KISS]]
> - [[Software Engineering/06 Development Practices/Principles/SOLID|SOLID]]
<!-- whats-next:end -->
