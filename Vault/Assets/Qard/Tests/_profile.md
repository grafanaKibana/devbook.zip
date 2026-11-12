## Weak spots
- (2026-11-11) DI lifetimes in ASP.NET Core: static Singleton vs `AddSingleton`, captive scoped dependencies (`DbContext`), thread safety and unbounded growth in singletons. Scored 0/8.
- (2026-11-11) Bridge: spotting two independently growing dimensions (providers × operations) and how Bridge differs from a single injected interface.
- (2026-11-11) Observer in practice: async subscribers, failure policy, explicit ordering, C# event leaks (`-=`), and when a direct call is better.
- (2026-11-11) GRASP: Information Expert vs Low Coupling, High Cohesion and Pure Fabrication when placing persistence and side effects.
- (2026-11-11) Template Method vs Strategy: inheritance-bound variants vs composed variants chosen per request.
- (2026-11-11) Patterns with the same structure but different intent: State (internal lifecycle, owned transitions) vs Strategy (external policy); Proxy vs Facade.

## Improving
- (2026-11-11) Pattern recognition from a scenario is solid: picked Abstract Factory, Command and Flyweight correctly, even when unsure.

## Habits
- (2026-11-11) Long-form answers name the symptom but stop before the mechanism, fix and limit. In interview questions, cover what the pattern buys, how the structure works, the specific pitfalls with their fixes, and when it is overkill.
- (2026-11-11) Overconfident on intent-based distinctions (State/Strategy, Proxy/Facade): sure, but lost marks.
- (2026-11-11) Left several open questions blank. Write a partial answer to earn partial credit.
