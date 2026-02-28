---
topic:
  - AI & ML
subtopic:
  - Tooling
tags:
  - FolderNote
dg-publish: false
status: Creation
level:
  - '2'
priority: Medium
---

# Intro

AI development tooling is the practical layer that turns large language models into day-to-day engineering leverage: faster implementation, wider codebase understanding, and lower friction for repetitive work. This category matters because the value is not just "generate code"; it is orchestration around your repo, terminal, CI checks, and team rules. In practice, tool choice determines how reliably an assistant can plan work, edit files safely, run verification, and follow project conventions.

The landscape now breaks into three operational buckets: coding agents that can execute multi-step tasks, review agents that focus on pull-request quality, and IDE extensions that blend autocomplete, chat, and limited automation in the editor. Across all buckets, the same control surfaces show up repeatedly: **skills** (reusable capability packs), **plugins** (integrations and extensions), **hooks** (automation triggers before/after actions), and **agent instructions** (repo-scoped rules such as `AGENTS.md`, `CLAUDE.md`, or tool-specific rules files).

## Categories

### Coding agents

Coding agents are the most autonomous class. They can inspect project files, propose plans, apply edits, run commands, and iterate based on test or lint output. Common tools include Claude Code, Cursor, GitHub Copilot (agent mode), Cline, Aider, Windsurf, and Opencode. See [[Software Engineering/11 AI & ML/Tooling/Coding Agents|Coding Agents]] for mechanism details and tradeoffs.

### Code review agents

Code review agents optimize a narrower loop: pull-request analysis, risky change detection, and actionable review comments. A representative tool is CodeRabbit, which integrates into GitHub/GitLab workflows and provides automated review feedback so humans can focus on architecture and business correctness.

### IDE extensions

IDE extensions prioritize in-flow assistance: inline completion, chat panes, refactor suggestions, and basic command execution from the editor. This category includes Copilot extension workflows and extension-backed agents such as Cline. Compared with terminal-first agents, IDE integrations usually reduce context switching but can hide execution details if the tool does not expose a clear action log.

## Major Tool Comparison

| Tool | Type (Terminal/IDE/Both) | Model Support | Key Differentiator |
|---|---|---|---|
| Claude Code | Both | Claude models (Anthropic) | Strong agent loop with hooks, MCP support, and repo instruction conventions (`AGENTS.md`/`CLAUDE.md`) |
| Cursor | IDE | Multi-model (Anthropic, OpenAI, Google, others by plan/provider) | VS Code-based IDE with integrated agent mode, chat, and high-quality tab completion |
| GitHub Copilot | Both | Multi-model via GitHub platform | Tight GitHub + IDE integration, PR and coding workflows in existing enterprise GitHub setups |
| Cline | IDE | Multi-provider via API keys | Open-source VS Code agent with transparent actions and user-controlled provider choice |
| Aider | Terminal | Many providers/models | Git-aware terminal workflow that is explicit, scriptable, and strong for commit-oriented iteration |
| Windsurf (Codeium) | IDE | Codeium-hosted + provider options by product tier | Cascade agent + Supercomplete focused on end-to-end coding flow inside a VS Code-style IDE |
| Opencode | Both | Multi-provider including local and hosted models | Open-source agent with skill system and `AGENTS.md` project instructions across terminal/IDE experiences |

## Core Building Blocks

The tooling ecosystem shares four control surfaces that determine how reliably agents integrate with real codebases:

- **[[Software Engineering/11 AI & ML/Tooling/Skills|Skills]]:** reusable instruction packages loaded on demand that give the agent domain-specific expertise (code review, docs lookup, framework conventions)
- **[[Software Engineering/11 AI & ML/Tooling/Plugins|Plugins]]:** integrations that connect agents to external services, databases, and APIs at runtime
- **[[Software Engineering/11 AI & ML/Tooling/Hooks|Hooks]]:** event-based automation points (pre-edit, post-edit, pre-commit) that enforce policy or run checks without modifying the agent itself
- **[[Software Engineering/11 AI & ML/Tooling/Agent Instructions|Agent Instructions]]:** project-local guidance files that align agent behavior with architecture, coding standards, and security boundaries

Working teams usually combine all four: instructions define policy, hooks enforce it, plugins connect external systems, and skills keep repeated workflows fast.

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

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/11 AI & ML|11 AI & ML]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Tooling/Agent Instructions|Agent Instructions]]
> - [[Software Engineering/11 AI & ML/Tooling/Coding Agents|Coding Agents]]
> - [[Software Engineering/11 AI & ML/Tooling/Hooks|Hooks]]
> - [[Software Engineering/11 AI & ML/Tooling/Plugins|Plugins]]
> - [[Software Engineering/11 AI & ML/Tooling/Skills|Skills]]
<!-- whats-next:end -->
