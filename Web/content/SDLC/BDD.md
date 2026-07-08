---
publish: true
created: 2026-07-05T10:53:58.532+03:00
modified: 2026-07-05T20:28:24.143+03:00
---

# Intro

Behavior-Driven Development (BDD) is a development approach that uses concrete examples written in business language to align requirements, implementation, and tests. Scenarios are written collaboratively by developers, testers, and business stakeholders before implementation begins — making requirements unambiguous and directly executable as automated tests.

BDD extends TDD by shifting the focus from "does the code work?" to "does the system behave correctly from the user's perspective?" The key artifact is a Gherkin scenario: a structured English description of a behavior that can be automated.

## Gherkin Syntax

Gherkin is the language for writing BDD scenarios. It uses a Given/When/Then structure:

- **Given** — the initial context (preconditions, system state)
- **When** — the action or event that triggers the behavior
- **Then** — the expected outcome

```gherkin
Feature: User login

  Scenario: Valid credentials
    Given a user "alice" exists with password "correct-horse-battery-staple"
    When I log in as "alice" with password "correct-horse-battery-staple"
    Then I should see "Welcome, alice"
    And I should be redirected to the dashboard

  Scenario: Invalid password
    Given a user "alice" exists with password "correct-horse-battery-staple"
    When I log in as "alice" with password "wrong-password"
    Then I should see "Invalid credentials"
    And I should remain on the login page
```

**Additional keywords:**

- `And` / `But` — extend Given/When/Then steps
- `Background` — shared Given steps for all scenarios in a feature
- `Scenario Outline` + `Examples` — parameterized scenarios for data-driven testing

## SpecFlow in .NET

> [!WARNING]
> **SpecFlow is discontinued.** Tricentis stopped maintaining it in late 2024 (no .NET 9+ support, deprecated packages). The drop-in community successor is **[Reqnroll](https://reqnroll.net/)** — a fork with the same Gherkin/`[Binding]`/step-definition model, so the code below is identical apart from the namespaces. **Use Reqnroll for new projects**; migrating an existing SpecFlow suite is mostly a package swap.

SpecFlow (and its successor Reqnroll) is the .NET BDD framework that maps Gherkin scenarios to C# step definitions:

```csharp
// Step definitions — map Gherkin steps to C# code
[Binding]
public class LoginSteps
{
    private readonly WebApplicationFactory<Program> _factory;
    private HttpResponseMessage? _response;

    public LoginSteps(WebApplicationFactory<Program> factory)
        => _factory = factory;

    [Given(@"a user ""(.*)"" exists with password ""(.*)""")]
    public async Task GivenUserExists(string username, string password)
    {
        var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/users", new { username, password });
    }

    [When(@"I log in as ""(.*)"" with password ""(.*)""")]
    public async Task WhenILogIn(string username, string password)
    {
        var client = _factory.CreateClient();
        _response = await client.PostAsJsonAsync("/api/auth/login",
            new { username, password });
    }

    [Then(@"I should see ""(.*)""")]
    public async Task ThenIShouldSee(string expectedText)
    {
        var body = await _response!.Content.ReadAsStringAsync();
        body.Should().Contain(expectedText);
    }
}
```

SpecFlow generates test methods from the `.feature` files and runs them via xUnit, NUnit, or MSTest.

## BDD vs TDD

| Aspect | TDD | BDD |
|--------|-----|-----|
| Focus | Unit behavior (does the code work?) | System behavior (does it meet requirements?) |
| Language | Code (test method names) | Business language (Gherkin) |
| Audience | Developers | Developers + testers + business |
| Granularity | Unit/integration | Acceptance/integration |
| Collaboration | Developer-centric | Cross-functional (3 Amigos) |
| Tooling (.NET) | xUnit, NUnit, MSTest | SpecFlow, Reqnroll |

**They are complementary, not competing.** Use TDD for unit-level design and fast feedback; use BDD for acceptance criteria and cross-functional alignment. A well-tested system uses both.

## When to Use BDD

**Good fit:**

- Complex business rules where misunderstanding requirements is costly.
- Cross-functional teams where business stakeholders need to understand and validate tests.
- Acceptance testing for user-facing features.

**Poor fit:**

- Pure technical components (algorithms, infrastructure) with no business language.
- Small teams where the overhead of Gherkin + step definitions exceeds the benefit.
- Rapidly changing requirements where maintaining `.feature` files becomes a burden.

## Pitfalls

**Gherkin as implementation documentation**
Writing scenarios that describe implementation details ("When I call the `UserService.Login` method") instead of behavior ("When I log in with valid credentials"). Gherkin should describe what the system does, not how.

**Step definition explosion**
Each unique Gherkin step requires a step definition. Without careful reuse, you end up with hundreds of step definitions that are hard to maintain. Use parameterized steps and shared step libraries.

**BDD without collaboration**
Writing Gherkin scenarios alone (without business stakeholders) defeats the purpose. The value is in the conversation that produces the scenarios, not the scenarios themselves.

## Questions

> [!QUESTION]- When does BDD overhead outweigh its benefits?
> BDD adds overhead: Gherkin scenarios must be written and maintained, step definitions must be kept in sync, and the collaboration process takes time. The overhead is not worth it for: pure technical components with no business language (algorithms, infrastructure), small teams where developers and stakeholders communicate directly without formal scenarios, and rapidly changing requirements where maintaining `.feature` files becomes a burden. BDD earns its cost when: business rules are complex and misunderstanding them is expensive, cross-functional alignment is genuinely needed, and scenarios serve as living documentation.

> [!QUESTION]- How does BDD differ from TDD, and are they complementary?
> TDD focuses on unit behavior: does the code work correctly? Tests are written by developers in code. BDD focuses on system behavior: does the system meet requirements from the user's perspective? Scenarios are written in business language (Gherkin) collaboratively with stakeholders. They are complementary: use TDD for unit-level design and fast feedback loops; use BDD for acceptance criteria and cross-functional alignment. A well-tested system uses both — TDD for the inner loop, BDD for the outer loop.

> [!QUESTION]- What is 'specification by example' and how does it reduce requirement ambiguity?
> Specification by example replaces abstract requirement statements ('the system should handle invalid input') with concrete examples ('given a blank email field, when I submit the form, then I see the error message X'). Concrete examples are unambiguous: they can be automated as tests and verified against the running system. Abstract requirements are interpreted differently by developers, testers, and business stakeholders. The Three Amigos practice (developer + tester + business) produces examples collaboratively, surfacing misunderstandings before implementation begins.

## References

- [Gherkin reference (Cucumber)](https://cucumber.io/docs/gherkin/reference/) — complete Gherkin syntax reference including Scenario Outline, Background, and data tables.
- [SpecFlow documentation](https://docs.specflow.org/) — official guide to SpecFlow for .NET including step definitions, hooks, and test runner integration.
- [Reqnroll (SpecFlow successor)](https://reqnroll.net/) — the community-maintained fork of SpecFlow, actively developed for .NET 6+.
- [Introducing BDD (Dan North)](https://dannorth.net/introducing-bdd/) — the original article that defined BDD and the Given/When/Then vocabulary.
- [The Three Amigos (Agile Alliance)](https://www.agilealliance.org/glossary/three-amigos/) — the collaboration practice (developer + tester + business) that makes BDD effective.
