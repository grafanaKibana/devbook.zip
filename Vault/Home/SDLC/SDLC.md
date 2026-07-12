---
icon: area-chart
order: 110
color: "#a855f7"
topic:
  - SDLC
subtopic: []
summary: "The phases and process models that carry a feature from idea to production."
tags:
  - FolderNote
publish: true
priority: Medium
level:
  - '4'
status: Done
---

# Intro

The Software Development Lifecycle is the sequence of phases a feature travels from idea to production and beyond: requirements, design, implementation, testing, deployment, and maintenance. Choosing the right process model (waterfall, iterative, agile) determines how quickly a team gets feedback and how expensive a wrong assumption becomes. Example: skipping a spike before committing to a sprint estimate is how two-week tasks become two-month projects.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Process Models

The lifecycle phases are constant; process models differ in how they *sequence and revisit* them, which sets how fast a team gets feedback and how expensive a wrong assumption becomes:

| Model | How it flows | Fits when | Cost of late change |
|---|---|---|---|
| Waterfall | Each phase once, in order | Requirements are fixed and well understood (regulated, contractual) | High — mistakes surface late |
| Iterative / incremental | Repeated cycles, each adding function | Requirements are partly known and will evolve | Medium |
| Agile (Scrum/Kanban) | Short iterations (Scrum) or continuous flow (Kanban), frequent re-planning | Requirements are uncertain and feedback is frequent | Low — change is expected |

Real teams blend these. The honest question is not "which methodology" but "how short is our feedback loop, and how cheaply can we change course when we learn we were wrong?"

## References

- [Software development process (Wikipedia)](https://en.wikipedia.org/wiki/Software_development_process) — overview of the lifecycle phases and the major process models.
- [Manifesto for Agile Software Development](https://agilemanifesto.org/) — the four values and twelve principles behind agile process models.
- [Atlassian Agile Coach](https://www.atlassian.com/agile) — practical guides to Scrum, Kanban, estimation, and sprint mechanics.
