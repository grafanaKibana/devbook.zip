---
topic:
  - AI & ML
subtopic:
  - LLM
summary: The developer-facing tools and extension points that make an agent useful inside a repository.
tags:
  - FolderNote
publish: true
status: Done
level:
  - "3"
priority: Medium
---

Tooling is the developer-facing part of an agent harness: coding agents, repository instructions, reusable skills, plugins, and lifecycle hooks. These surfaces connect a model to repository context, file edits, commands, and verification. [[Tool Design]] covers the lower-level API contract between the model and each callable operation.

The tools fall into three broad groups. Coding agents execute changes across multiple steps. Review agents inspect proposed changes. IDE extensions keep completion and chat close to the editor, sometimes with a smaller execution loop.

The interface matters less than what the agent can read, change, and run. [[Skills]] package repeatable workflows. [[Plugins]] bundle and install capabilities, while [[Model Context Protocol|MCP]] servers, apps, and integrations connect agents to external systems. [[Hooks]] run checks around actions. [[Agent Instructions|Repository instructions]] such as `AGENTS.md` or `CLAUDE.md` carry local rules into every task. Together, those controls decide how much autonomy is safe.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Categories

## Coding Agents

Coding agents own an edit-test loop. They inspect the repository, change files, run commands, and react to failures. Some operate from a terminal and others from an editor, but the useful distinction is the authority they receive and the evidence they return. [[Coding Agents]] covers the execution model and its tradeoffs.

## Code Review Agents

Review agents work on a narrower target: a diff, pull request, or proposed patch. They look for regressions and missing tests, then report findings without owning the implementation. CodeRabbit is one example of this model in GitHub and GitLab workflows. A review agent is most useful when it stays independent. Letting the writer approve its own change removes the check that matters.

## IDE Extensions

IDE extensions keep suggestions and conversation inside the editor. That reduces context switching for small edits. The cost can be weaker visibility into commands or changed files, depending on the extension. A useful IDE agent still needs a readable action log and clear approval before sensitive actions.

# References

- [CodeRabbit Docs](https://docs.coderabbit.ai/)
- [Aider documentation](https://aider.chat/docs/)
