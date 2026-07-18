---
publish: true
created: 2026-07-11T21:45:50.158Z
modified: 2026-07-18T11:30:03.107Z
published: 2026-07-18T11:30:03.107Z
topic:
  - AI & ML
subtopic:
  - Tooling
summary: An LLM running in an action loop to complete engineering tasks end to end.
status: Done
level:
  - "2"
priority: Medium
---

Coding agents are software tools that run an LLM inside an action loop to complete engineering tasks end to end: read code, propose a plan, edit files, run commands, inspect failures, and iterate until a stopping condition is met. They shift AI from suggestion mode (autocomplete predicts the next line) to execution mode (the agent ships a tested change across multiple files). In practice, this changes team throughput only when three conditions hold: the agent follows repository conventions via instruction files, verifies its own changes via build/test/lint, and exposes enough execution detail for humans to trust and correct the result. A concrete example: an agent tasked with adding pagination to the /orders endpoint might read the existing controller, add query parameters, update the repository layer, write an integration test, run `dotnet test`, fix a failing assertion, and re-run until green — all without human intervention.

A useful distinction in daily engineering:

- **Autocomplete** (for example, Copilot inline): predicts the next tokens in your current file; fast but local and non-autonomous
- **Chat assistant** (for example, ChatGPT or Copilot Chat): explains code and proposes snippets; typically waits for manual copy-paste or explicit actions
- **Coding agent** (for example, Claude Code, Cursor Agent, Copilot agent mode): executes multi-step work in a loop across files, tools, and validation commands

# How the Agent Loop Works

```mermaid
flowchart TD
    U[User prompt] --> P[Plan task and choose actions]
    P --> R[Read repo files and context]
    R --> E[Edit code and configs]
    E --> V[Run checks tests or build]
    V --> D{Pass criteria met}
    D -->|No| P
    D -->|Yes| O[Return result and rationale]
```

The key mechanism is iterative tool use, not one-shot generation. The model decides what to do next from observed outputs (test failures, lint errors, command logs), then re-plans. This is what separates agents from chat: a chat assistant suggests code you paste; an agent edits the file, runs the test, sees it fail, reads the error, fixes the code, and re-runs. Better agents expose this loop clearly (step-by-step logs, approval gates) so developers can intervene before incorrect edits cascade. The failure mode is an agent that loops 20+ times without converging — burning tokens and potentially making the codebase worse with each iteration.

# Major Tools

## Claude Code (Anthropic)

Claude Code is a terminal-first agentic environment that can also integrate with IDE workflows. It uses Claude models and executes a tool-use loop around file operations and shell commands. It supports MCP servers for external capabilities, supports reusable skills, and offers hooks to run custom automation around agent actions. Project instructions are commonly stored in `AGENTS.md` or `CLAUDE.md` to constrain behavior consistently across sessions.

## Cursor

Cursor is a VS Code-based IDE with three integrated modes: tab completion, chat, and agent mode. The agent can inspect project files, apply edits, and run commands while preserving editor-native workflows such as navigation and refactoring. Cursor supports multiple model providers and uses rules files in `.cursor/rules/` (`.mdc` with frontmatter), superseding the legacy `.cursorrules` approach.

## GitHub Copilot

GitHub Copilot spans IDE extension workflows, Copilot Chat, CLI support, and newer agent-style experiences in GitHub environments. It is strongest when teams already standardize on GitHub for source control and pull-request operations. Repository-level behavior can be guided with `.github/copilot-instructions.md`, so generated changes align with team architecture, testing policy, and naming standards.

## Cline

Cline is an open-source VS Code extension focused on transparent agentic execution. It supports multiple LLM providers through user-managed credentials and exposes action-by-action behavior so developers can approve or redirect work. Teams often use `.clinerules` to persist local project guidance.

## Aider

Aider is an open-source terminal coding assistant with a strong git-aware workflow. It is optimized for patch-style iteration in existing repositories and works with many model providers. Configuration can be centralized in `.aider.conf.yml`, which helps teams keep consistent defaults for model choice, test commands, and editing behavior.

## Windsurf (Codeium)

Windsurf is a Codeium IDE centered on agentic development via Cascade and assisted editing via Supercomplete. It combines planning, editing, and conversational interaction in one interface, with project rules typically encoded in `.windsurfrules`. It is positioned as an integrated IDE workflow rather than a terminal-first agent.

## Opencode

Opencode is an open-source coding agent that runs in terminal and extended app/editor contexts. It emphasizes provider flexibility, MCP server integration, and a skills system for repeatable workflows. It uses `AGENTS.md` for project instructions, which makes it easier to align automation behavior with repository policy.

## Amazon Q Developer

Amazon Q Developer provides AI coding assistance in IDE and CLI experiences with a stronger AWS-centric operating model. Beyond generation and chat, it focuses on modernization and transformation workflows for enterprise codebases (for example, migration and refactoring assistance tied to AWS services).

# Pitfalls

- **Over-reliance without review** — teams accept large agent-generated diffs without understanding side effects. A 400-line diff that passes tests can still introduce architectural violations, security holes, or maintenance debt. Mitigation: limit task scope to single-concern changes, require human review on all PRs, and use instruction files to encode architecture constraints.
- **Context window limits** — very large repos or long sessions push relevant files out of active context. The agent operates on stale assumptions: it edits a file it read 20 messages ago, not knowing another edit changed the interface. Mitigation: constrain task scope, break large changes into sequential smaller tasks, and use agents that re-read files before editing.
- **Cost drift** — autonomous retry loops can trigger 50+ model calls during a debugging spiral. At $0.015/1K output tokens, a 30-minute debugging session can cost $5-15. In CI pipelines running agents on every PR, this adds up. Mitigation: set token budgets, loop limits (max 10 iterations), and route simple tasks to cheaper models.
- **Hallucinated APIs** — agents invent methods, config keys, or package names when context is weak. Example: an agent calls `HttpContext.GetBearerToken()` (does not exist) instead of parsing the `Authorization` header — the code may even compile against a generated stub and then fail at runtime. Mitigation: run builds and tests, use tool-assisted code search before implementation, and include SDK version constraints in instruction files.

# Tradeoffs

| Decision | Option A | Option B | Practical tradeoff |
|---|---|---|---|
| Interaction model | Terminal agents | IDE agents | Terminal gives scriptability and explicit command logs; IDE gives lower context-switching and faster interactive editing |
| Product model | Open-source tools | Commercial tools | Open-source gives transparency and provider control; commercial tools give polished UX, managed infra, and enterprise support |
| Model strategy | Single-model stack | Multi-model stack | Single-model simplifies behavior and tuning; multi-model improves task fit and cost optimization but adds configuration complexity |

# Questions

> [!QUESTION]- Why is an agentic coding tool not just "better autocomplete"?
>
> - Autocomplete predicts local tokens, while coding agents execute multi-step plans across files and tools
> - Agents can run verification commands and revise output based on failures, which autocomplete does not do autonomously
> - The mechanism changes risk: agent output must be governed with approvals, tests, and repository rules
> - Net benefit comes from closed-loop execution, not from raw text quality alone

> [!QUESTION]- When should a team prefer terminal agents over IDE agents?
>
> - Prefer terminal agents when workflows are command-heavy, scriptable, and CI-first
> - Prefer IDE agents when developers rely on interactive navigation, visual diffing, and editor-native refactors
> - The deciding factor is operational fit with current engineering process, not vendor marketing claims
> - Teams can mix both if shared instruction files and validation gates keep behavior consistent

> [!QUESTION]- What controls reduce production risk when adopting coding agents?
>
> - Repository instruction files to encode architecture and testing constraints
> - Hooks and policy checks to block unsafe operations automatically
> - Bounded execution: cost limits, step limits, and explicit approval points
> - Mandatory verification (build, tests, lint) before merge, regardless of which model produced the patch

# References

- [Claude Code overview (Anthropic Docs)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) — official overview of Claude Code's agentic capabilities, memory system, and tool use.
- [Cursor Documentation](https://docs.cursor.com/) — official docs for Cursor IDE covering AI chat, Composer, and codebase indexing features.
- [GitHub Copilot documentation](https://docs.github.com/en/copilot) — official GitHub Copilot docs covering code completion, chat, and workspace agents.
- [Cline Documentation](https://docs.cline.bot/) — open-source VS Code extension docs for autonomous coding agent with tool use and browser control.
- [Aider Documentation](https://aider.chat/docs/) — CLI-based coding agent docs covering git integration, model selection, and multi-file editing.
- [Windsurf Documentation (Codeium)](https://docs.windsurf.com/) — Windsurf IDE docs covering Cascade agent, flows, and context management.
- [Amazon Q Developer documentation](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/what-is.html) — AWS coding assistant docs covering inline suggestions, chat, and code transformation.
- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents) — Anthropic's engineering guide on agentic system design principles applicable to coding agent workflows.
