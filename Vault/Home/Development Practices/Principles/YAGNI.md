---
topic:
  - Development Practices
subtopic:
  - Principles
summary: "Don't build a feature or abstraction until you have a real, current need — it guards against speculative complexity."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# YAGNI

YAGNI — *You Aren't Gonna Need It* — means: do not build a feature until you have a real, current need for it. It protects against speculative complexity: abstractions, extension points, and configuration options added for hypothetical future requirements that never arrive. Every line of code you write has a maintenance cost; YAGNI says don't pay that cost for features you don't need yet. A team spent 3 sprints building a plugin architecture for their notification system "in case we need to support SMS, push, and Slack" — 18 months later, only email was used, and the plugin abstraction layer had accumulated 40+ unit tests, a factory, a registry, and a configuration schema that all needed maintenance for a single implementation.

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

A second common YAGNI violation is building a generic configuration system for a feature that has exactly one configuration today:

```csharp
// YAGNI violation: generic config system for one setting
public class FeatureConfig
{
    public Dictionary<string, object> Settings { get; set; } = new();
    public T Get<T>(string key) => (T)Settings[key];
}

// YAGNI-compliant: direct property until a second setting is needed
public class FeatureConfig
{
    public bool IsEnabled { get; set; }
}
// When a second setting arrives, refactor then — with a real use case to guide the design.
```

## Pitfalls

### Speculative Generality

**What goes wrong**: a class or method is made generic to handle cases that don't exist yet. The abstraction is harder to understand, harder to test, and often wrong when the hypothetical case finally arrives — because the real requirements differ from what was imagined. A team built a generic `IDocumentProcessor<TDoc, TResult>` pipeline for PDF generation; when CSV export was finally needed 14 months later, the PDF-oriented interface assumptions (page breaks, fonts, margins) were so baked into the abstraction that the team had to bypass it entirely and write CSV export from scratch, leaving the generic pipeline as dead code that only PDFs used.

**Why it happens**: developers anticipate future needs and add flexibility 'for free' while they're in the code. The cost is paid in complexity, not in time.

**Mitigation**: apply the Rule of Three — introduce an abstraction when you have two concrete use cases, not one. One use case is speculation; two give you enough information to design the abstraction correctly.


## Tradeoffs

**YAGNI vs forward-thinking design**

| Dimension | YAGNI (build now) | Speculative design (build ahead) |
|-----------|-------------------|----------------------------------|
| Cost if needed | Refactor later (usually cheap) | Paid upfront (certain) |
| Cost if not needed | Zero | Maintenance burden forever |
| Design quality | May need refactoring when need arrives | May be wrong when need arrives |
| Reversibility | High (add abstraction when needed) | Low (removing abstraction is hard) |

**Decision rule**: apply YAGNI by default. The exception is when the cost of adding the abstraction later is genuinely high — public API contracts, database schemas, wire protocols, or security boundaries. For these, upfront design is justified because changing them later is expensive or breaking. For internal code, add the abstraction when you have two concrete use cases, not one.


## Questions

> [!QUESTION]- Does YAGNI mean you should skip tests and refactoring?
> No. YAGNI applies to features and abstractions, not to engineering practices. Martin Fowler explicitly distinguishes: YAGNI says don't build features you don't need yet. It does not say skip tests, skip refactoring, or write messy code. Good engineering practices are always justified because they reduce the cost of future changes.

> [!QUESTION]- When does YAGNI conflict with good design, and how do you resolve it?
> YAGNI conflicts with design when adding an abstraction now would make future changes cheaper. The resolution: add the abstraction when you have two concrete use cases, not one. One use case is speculation; two use cases give you enough information to design the abstraction correctly. This is the Rule of Three from refactoring.


## References

- [YAGNI (Martin Fowler)](https://martinfowler.com/bliki/Yagni.html) — concise explanation of YAGNI with the important nuance: it applies to *features*, not to good engineering practices like testing and refactoring.
- [You aren't gonna need it (Wikipedia)](https://en.wikipedia.org/wiki/You_aren%27t_gonna_need_it) — origin in Extreme Programming and the relationship to the broader XP principle of doing the simplest thing that could possibly work.
- [[KISS]] — related principle: keep implementations simple; complexity should be justified by current requirements.
- [Extreme Programming Explained (Kent Beck)](https://www.oreilly.com/library/view/extreme-programming-explained/0321278658/) — the XP book that established YAGNI as a core practice; explains the economic argument for deferring features until they are needed.
- [Speculative Generality (Refactoring Guru)](https://refactoring.guru/smells/speculative-generality) — the code smell that YAGNI prevents: hooks, abstract classes, and parameters added for hypothetical future use that never arrives.
