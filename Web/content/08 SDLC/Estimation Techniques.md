---
publish: true
created: 2026-07-05T10:53:58.581+03:00
modified: 2026-07-05T10:53:58.581+03:00
---

# Estimation Techniques

Software estimation techniques provide structured ways to forecast the effort, time, or complexity of development work. No technique is perfectly accurate — estimation is inherently uncertain. Studies consistently show that software projects overrun initial estimates by 30-100%, with the Standish Group's CHAOS report finding that only 29% of projects are delivered on time and on budget. The goal is to reduce uncertainty enough to make planning decisions, not to predict the future precisely.

## Common Techniques

### Planning Poker

A consensus-based technique where each team member independently selects a card from a Fibonacci-like sequence (1, 2, 3, 5, 8, 13, 20, 40, 100) representing their estimate. Cards are revealed simultaneously to prevent anchoring. When estimates diverge, the team discusses and re-estimates until consensus is reached.

**Best for**: sprint planning in Scrum teams. The discussion triggered by divergent estimates is often more valuable than the number itself — it surfaces hidden complexity and misunderstandings.

### T-Shirt Sizing

Items are categorized as XS, S, M, L, XL, XXL. Faster than Planning Poker for large backlogs. Useful for roadmap-level planning where precise numbers aren't needed yet.

**Best for**: backlog grooming, roadmap planning, early-stage scoping when the team needs relative sizing without committing to hours.

### Story Points

An abstract unit representing relative effort, complexity, and uncertainty — not hours. A 5-point story is roughly twice as complex as a 2-point story. Teams calibrate their own scale by comparing new stories to reference stories.

**Key insight**: story points measure relative complexity, not time. A team's velocity (points per sprint) emerges from historical data and accounts for team-specific factors (skill, interruptions, tech debt).

**Common mistake**: treating story points as hours. "8 points = 8 hours" destroys the abstraction and makes estimates meaningless.

### PERT (Program Evaluation and Review Technique)

PERT uses three estimates per task to model uncertainty:

```text
Expected = (Optimistic + 4 × Most Likely + Pessimistic) / 6
```

Example: a feature estimated at O=2d, ML=5d, P=14d:

```text
Expected = (2 + 4×5 + 14) / 6 = 36 / 6 = 6 days
```

**Best for**: projects with high uncertainty where a single-point estimate is misleading. PERT makes the uncertainty explicit and produces a weighted average that accounts for the pessimistic tail.

## Comparison

| Technique | Granularity | Speed | Best for |
|---|---|---|---|
| Planning Poker | Story-level | Slow (discussion-heavy) | Sprint planning, team alignment |
| T-Shirt Sizing | Epic/feature-level | Fast | Roadmap planning, backlog triage |
| Story Points | Story-level | Medium | Velocity tracking, sprint capacity |
| PERT | Task-level | Slow (3 estimates per task) | High-uncertainty projects, critical path analysis |

**Decision rule**: use T-Shirt sizing for roadmap planning and early backlog grooming. Use Planning Poker with story points for sprint planning. Use PERT when you need to communicate uncertainty to stakeholders or when a task has a wide range of possible outcomes.

## Pitfalls

**Anchoring bias**
The first estimate heard influences all subsequent estimates. In one team's retrospective analysis, stories estimated after hearing the tech lead's number first clustered within ±1 point of the lead's estimate 78% of the time — compared to 35% when simultaneous reveal was enforced. Mitigation: simultaneous reveal is mandatory — all cards shown at the same time.

**Planning fallacy**
Teams consistently underestimate because they focus on the best-case scenario and ignore past overruns. Mitigation: use PERT's three-point estimate to force explicit consideration of the pessimistic case. Track actual vs estimated velocity over 3-5 sprints and use historical data for capacity planning.

**Story point inflation**
Teams gradually inflate story points to make velocity look better or to avoid pressure. A 5-point story this quarter is estimated as 8 points next quarter for the same complexity. Mitigation: periodically re-calibrate against reference stories. Velocity is a planning tool, not a performance metric — never use it to compare teams.

**Velocity gaming**
When velocity is used as a performance metric, teams optimize for points rather than value: splitting stories artificially, marking stories done before they are truly complete, or avoiding complex work. Mitigation: measure outcomes (features shipped, bugs fixed, customer satisfaction) not velocity.

## Questions

> [!QUESTION]- Why are story points measured in relative complexity rather than hours?
> Hours are absolute and vary by person, day, and context. A senior engineer estimates 2 hours; a junior estimates 8 hours for the same task. Story points measure relative complexity: a 5-point story is roughly twice as complex as a 2-point story, regardless of who does it. A team's velocity (points per sprint) emerges from historical data and automatically accounts for team-specific factors like skill level, interruptions, and tech debt. Treating story points as hours destroys this abstraction and makes velocity meaningless.

> [!QUESTION]- What is the most common estimation mistake and how do you avoid it?
> Treating story points as hours ('8 points = 8 hours'). This forces estimators to think in absolute time, reintroduces the person-dependency problem, and makes velocity comparisons between teams meaningless. The fix: calibrate story points against reference stories ('this is a 2-point story because it's similar to the login feature we built last sprint'), track velocity over 3-5 sprints to establish a baseline, and use that baseline for capacity planning — never convert points to hours.

## References

- [Planning Poker (Mountain Goat Software)](https://www.mountaingoatsoftware.com/agile/planning-poker) — the original Planning Poker description by Mike Cohn; explains the technique, card values, and why simultaneous reveal prevents anchoring.
- [Story Points (Martin Fowler)](https://martinfowler.com/bliki/StoryPoint.html) — Fowler's explanation of story points: what they measure, why they're not hours, and how velocity emerges from historical data.
- [PERT (Wikipedia)](https://en.wikipedia.org/wiki/Program_evaluation_and_review_technique) — PERT history, the three-point formula, and how it's used in critical path analysis.
