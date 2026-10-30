---
title: Software Architecture Patterns
topic: [Software Architecture]
subtopic: [Patterns]
summary: "Reusable solutions to recurring design problems around boundaries, dependencies, and change."
tags: [FolderNote]
publish: true
priority: High
level: ["4"]
status: Done
qard-deck: "Software Architecture"
qard-topic: "Patterns/Patterns"
flashcard_uid: "cfaa4058"
created: "2026-02-10T01:40:47.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

Patterns name recurring design pressures and the tradeoffs of a known response. They give a team shared language for boundaries, dependencies, and change. A useful pattern makes variation easier to see. A premature one hides simple control flow behind indirection.

> [!IMPORTANT]
> A pattern earns its place when the problem already exists. Dependency injection helps when composition or substitution is real. One concrete dependency with no variation usually needs only a direct call.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: 66d6574d-0bb3-4d17-b1e0-53177c19b42f -->
> [!qard]- What evidence justifies introducing a pattern?
> A pattern is justified when the code already shows a design pressure that the pattern handles more cheaply than the direct design. That pressure takes one of three forms:
>
> - **Recurring variation:** the same point in the code repeatedly needs different behavior. A known structure for substituting or composing that behavior then pays off.
> - **A responsibility boundary:** one concern needs to be separated from another, and the pattern makes that boundary explicit.
> - **A failure mode:** the direct design keeps producing the same defect or cost, and the pattern makes it cheaper to handle.
> 
> The decision is a cost comparison. Every pattern adds indirection, such as extra types and interfaces, and its control flow is less direct. When the pattern answers a problem the code already has, it makes the variation or boundary easier to see. When the problem is only anticipated, the indirection is speculative. It hides simple control flow without solving anything yet.
>
> **Example:** dependency injection behind an interface earns its place when implementations are actually substituted or composed. One concrete dependency with no variation is usually clearer as a direct call.

# References

- [Software design pattern](https://en.wikipedia.org/wiki/Software_design_pattern)
