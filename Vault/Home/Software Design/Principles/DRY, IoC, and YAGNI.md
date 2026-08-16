---
topic:
  - Software Design
subtopic:
  - Principles
summary: "Balances one source of knowledge, framework-owned control, and deferral of speculative features."
aliases:
  - DRY
  - YAGNI
  - IoC (Holywood Principle)
  - IoC (Hollywood Principle)
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

DRY, Inversion of Control, and YAGNI control different design costs. **DRY** keeps one authoritative representation of knowledge that must change together. **Inversion of Control (IoC)** lets a framework or composition root decide when application code is created and called. **YAGNI** defers features and flexibility that have no current requirement.

They are checks, not absolute laws. DRY does not require extracting every repeated line, IoC does not require an interface for every class, and YAGNI does not forbid tests or deliberate design at expensive-to-change boundaries.

# DRY

DRY means *Don't Repeat Yourself*: each piece of knowledge should have one authoritative representation. The target is duplicated business rules or decisions, not visual similarity.

Two validators can contain identical code and still represent different knowledge. User names and product names may both reject blanks today but evolve under different policies tomorrow. Merging them creates accidental coupling. The same tax calculation copied into checkout and invoicing is different: it creates two authorities for one rule and makes partial updates likely.

```csharp
// Same knowledge in two workflows belongs behind one rule.
public static class EmailRules
{
    public static bool IsValid(string value) =>
        !string.IsNullOrWhiteSpace(value) && value.Contains('@');
}
```

The boundary is intent. A shared helper is justified when its callers must change together for the same reason. Local duplication is safer when meanings may diverge. Premature extraction often produces flag-heavy helpers, low-cohesion `Utils` classes, or shared domain models that couple independent bounded contexts.

# Inversion of Control (IoC)

IoC moves control over construction or invocation out of application classes. Instead of `OrderService` constructing a repository and email sender, a composition root registers implementations and the framework supplies them when it creates the service. The “Hollywood Principle” summarizes the callback direction: *don't call us, we'll call you*.

```csharp
public sealed class OrderService(IOrderRepository repository, IEmailSender emailSender)
{
    // Required collaborators are explicit in the constructor.
}

builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
```

IoC is the principle. [[Home/Software Architecture/Patterns/Dependency Injection|Dependency Injection]] is its common implementation technique. The [[Home/Software Design/Principles/SOLID|Dependency Inversion Principle]] is different: it says high-level policy should depend on abstractions. Manual composition can follow DIP without a container, while a container can still produce a poor design if dependencies are hidden or lifetimes are wrong.

Constructor injection keeps required dependencies visible. Service Locator hides them behind global resolution and leaves runtime configuration as the only way to discover what a class needs. Large constructors and circular dependency graphs are not reasons to hide dependencies. They expose responsibilities or boundaries that need repair.

# YAGNI

YAGNI means *You Aren't Gonna Need It*: a hypothetical future requirement does not justify a feature, abstraction, configuration system, or extension point today. Unused flexibility still has to be understood, tested, migrated, secured, and maintained.

```csharp
// One required report format needs one direct implementation.
public sealed class ReportService
{
    public Report Generate(ReportRequest request) => GeneratePdf(request);
}
```

An interface, factory, registry, and plugin configuration become justified when a real second format arrives and its differences are known. Designing that abstraction earlier guesses at variation and often bakes the first implementation's assumptions into a supposedly generic contract.

YAGNI applies to speculative features, not engineering practices that protect current behavior. Tests, refactoring, validation, and security controls serve present requirements. Expensive-to-change contracts also deserve earlier thought: public APIs, database schemas, wire protocols, and security boundaries can make later correction materially harder than a local refactor.

# How the principles interact

| Tension | Decision |
| --- | --- |
| DRY suggests extraction. YAGNI suggests waiting | Extract when repeated code represents the same knowledge and must change together. Wait when only the syntax matches or future variation is speculative. |
| IoC suggests a seam. YAGNI resists extra abstractions | Keep framework-owned construction at real boundaries. Do not add an interface or factory solely because a container can register it. |
| DRY increases reuse. Independence limits coupling | Share stable rules within one ownership boundary. Duplicate small adapters when separate contexts must evolve independently. |
| YAGNI defers flexibility. Irreversible choices need foresight | Defer cheap internal extension points. Design public, persistent, wire, and security contracts against known change costs. |

A practical sequence starts with the current requirement. Identify the knowledge that must remain consistent, then decide who owns construction and control flow. YAGNI removes hypothetical work, DRY removes competing authorities, and IoC places the remaining runtime coordination at an explicit boundary.

# References

- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [Inversion of Control Containers and the Dependency Injection Pattern](https://martinfowler.com/articles/injection.html)
- [Extreme Programming Explained](https://www.pearson.com/en-us/subject-catalog/p/extreme-programming-explained-embrace-change/P200000000118/9780321278654)
