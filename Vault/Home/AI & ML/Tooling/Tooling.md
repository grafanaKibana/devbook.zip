---
topic:
  - AI & ML
subtopic:
  - Tooling
summary: "The practical layer that turns LLMs into day-to-day engineering leverage — coding agents, review agents, and IDE extensions, plus the shared control surfaces of skills, plugins, hooks, and instructions."
tags:
  - FolderNote
publish: true
status: Done
level:
  - "2"
priority: Medium
---

# Intro

AI development tooling is the practical layer that turns large language models into day-to-day engineering leverage: faster implementation, wider codebase understanding, and lower friction for repetitive work. This category matters because the value is not just "generate code"; it is orchestration around your repo, terminal, CI checks, and team rules. In practice, tool choice determines how reliably an assistant can plan work, edit files safely, run verification, and follow project conventions.

The landscape now breaks into three operational buckets: coding agents that can execute multi-step tasks, review agents that focus on pull-request quality, and IDE extensions that blend autocomplete, chat, and limited automation in the editor. Across all buckets, the same control surfaces show up repeatedly: **skills** (reusable capability packs), **plugins** (integrations and extensions), **hooks** (automation triggers before/after actions), and **agent instructions** (repo-scoped rules such as `AGENTS.md`, `CLAUDE.md`, or tool-specific rules files).

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Categories

### Coding agents

Coding agents are the most autonomous class. They can inspect project files, propose plans, apply edits, run commands, and iterate based on test or lint output. Common tools include Claude Code, Cursor, GitHub Copilot (agent mode), Cline, Aider, Windsurf, and Opencode. See [[Coding Agents]] for mechanism details and tradeoffs.

### Code review agents

Code review agents optimize a narrower loop: pull-request analysis, risky change detection, and actionable review comments. A representative tool is CodeRabbit, which integrates into GitHub/GitLab workflows and provides automated review feedback so humans can focus on architecture and business correctness.

### IDE extensions

IDE extensions prioritize in-flow assistance: inline completion, chat panes, refactor suggestions, and basic command execution from the editor. This category includes Copilot extension workflows and extension-backed agents such as Cline. Compared with terminal-first agents, IDE integrations usually reduce context switching but can hide execution details if the tool does not expose a clear action log.

## Questions

> [!QUESTION]- How do you choose between a terminal-first coding agent and an IDE-first coding agent?
> - Start with team workflow: terminal-first fits script-heavy and CI-centric teams, IDE-first fits interactive editing-heavy teams
> - Compare observability: terminal-first often exposes every command clearly, while IDE-first may optimize UX but hide low-level steps
> - Validate integration needs: if your process depends on PR workflows, issue trackers, and editor navigation, IDE integration can reduce friction
> - Check policy controls: hooks, rules files, and approval gates matter more than UI style in regulated or production-sensitive environments

> [!QUESTION]- Why are agent instructions and hooks more important than model quality in long-running repos?
> - Instructions encode project constraints (architecture, naming, testing expectations) that the base model does not know
> - Hooks create automatic guardrails, catching policy violations before merge
> - Better models can still make wrong local decisions without repo-specific constraints
> - Reliable behavior over months depends on repeatable controls, not one-off prompt quality

> [!QUESTION]- What is the practical difference between a coding agent and a code review agent?
> - Coding agents optimize change creation: plan, edit, run checks, iterate
> - Review agents optimize change evaluation: identify risk, gaps, regressions, and missing tests
> - They complement each other: one increases delivery speed, the other protects quality and maintainability
> - Mature teams use both to keep throughput high without lowering merge standards

## References

- [Claude Code overview (Anthropic Docs)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview)
- [Cursor Docs](https://docs.cursor.com/)
- [GitHub Copilot documentation](https://docs.github.com/en/copilot)
- [CodeRabbit Docs](https://docs.coderabbit.ai/)
- [Aider documentation](https://aider.chat/docs/)
- [OpenCode documentation](https://opencode.ai/docs/)
- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents)
