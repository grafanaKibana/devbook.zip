# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

DevBook also has an Obsidian authoring and reading surface. Both readers must preserve the same useful content and navigation outcomes.

## Users

DevBook is a personal Senior .NET and AI knowledge base for its author and engineers revisiting technical concepts or preparing for interviews.

## Product Purpose

Make engineering knowledge recoverable: locate a topic, understand its mechanism and boundaries, and return to its source when reviewing a question.

For Interview Questions, the confirmed primary job is to see the whole topic landscape and jump between areas. A conventional list ToC does not meet that need.

## Operating Context

Notes are authored in `Vault/Home/` and published through Quartz Syncer to the Quartz website. Interview questions come from question callouts in those notes. The Obsidian dashboard and the web QuestionsIndex use different renderers.

## Capabilities and Constraints

- Folders and FolderNote metadata own the topic hierarchy, labels, ordering, icons, and colors.
- Question navigation must reflect actual source content and preserve links back to the notes.
- `Vault/` owns authored content; `Web/content/` and `Web/public/` are generated projections.
- `AGENTS.md` owns repository and publishing rules. `DESIGN.md` owns the established visual system.
- Interview Questions preloads every topic’s questions on page open, with wrapping Tabsdown topic tabs and a native Subtopic selector to narrow the displayed questions. Full ancestry disambiguates repeated subtopic names.

## Product Principles

- Author once and preserve useful reading in both Obsidian and Quartz.
- Derive navigation and counts from the vault instead of maintaining a second catalogue.
- Make topic relationships clear before exposing individual questions.

## Accessibility & Inclusion

The existing design contract targets WCAG 2.2 AA for changed UI, including keyboard access, visible focus, readable contrast, and reduced motion.
