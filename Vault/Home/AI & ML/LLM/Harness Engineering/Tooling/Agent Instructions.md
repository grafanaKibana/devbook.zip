---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Project-level config files telling AI coding agents how a specific repository works."
publish: true
status: Done
level:
  - "2"
priority: Medium
---

Agent instruction files describe how work gets done in one repository. They capture facts the code cannot reliably explain on its own: which commands are safe, where boundaries sit, what conventions matter, and how a change is proved complete.

The runtime adds these instructions to the agent's context. Some files load at session start. Others are selected by path when the agent reads or edits a file. The exact precedence is tool-specific, but the engineering rule is stable. A short file that matches the repository saves exploration and prevents repeat mistakes. A stale file does the opposite with unusual confidence.

# Instruction File Landscape

| Tool | Main repository surface | Scope behavior |
|---|---|---|
| Claude Code | `CLAUDE.md`, `.claude/rules/*.md` | Root instructions load broadly. Rules and nested files can narrow guidance by path |
| OpenCode | `AGENTS.md` | Project instructions can be discovered while walking from the working directory to the worktree root |
| Cursor | `.cursor/rules/*.mdc` | Modular rules can apply always, by glob, or when selected. `.cursorrules` is legacy |
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, `AGENTS.md` | Support varies by Copilot surface. Repository-wide, path-specific, and agent instructions are distinct |
| Cline | `.clinerules/` | Version-controlled project rules shared with the repository |
| Windsurf | `.windsurf/rules/*.md` | Workspace rules replace the older single-file `.windsurfrules` convention |

Configuration is not automatically an instruction surface. A file such as Aider's `.aider.conf.yml` can set models or commands, but that does not make it equivalent to prose the model reads as repository policy.

# What Good Instruction Files Include

- **Commands that have been tested here:** setup, build, targeted checks, and any required order or workaround.
- **Boundaries with consequences:** protected paths, dependency direction, generated files, and operations that need approval.
- **Local conventions:** naming, error contracts, logging rules, and the preferred pattern when several valid ones exist.
- **Completion evidence:** the smallest check that proves a change works, plus broader gates when the risk justifies them.
- **Repository facts:** domain terms or operational constraints that are easy to miss during code search.

For modular, reusable behavior packs that complement instruction files, see [[Skills]].

# Example

Minimal but effective `AGENTS.md` for a .NET API project:

````markdown
# Project Instructions

- Stack: .NET 9, ASP.NET Core, PostgreSQL 16, xUnit
- Run `dotnet test` before proposing any change as complete
- Prefer explicit DTO mapping; never return EF entities from API handlers
- Feature code lives under `src/Features/<FeatureName>/`
- Do not introduce new top-level folders without explicit rationale
- Error responses use ProblemDetails (RFC 9457) with `type` URI
- All new endpoints require at least one integration test
````

The file gives the agent a tested command, a data boundary, and a clear definition of done. Each rule can be checked against a diff or command result.

A long architecture essay is a poor substitute. It consumes context, hides the few rules that can break the build, and usually drifts into describing the repository a team hopes to have. Keep always-loaded guidance tight. Move task procedures into on-demand skills and keep deeper explanations in ordinary documentation.

# Pitfalls

- **Bloat:** always-loaded prose competes with the code and the task for context. Keep the root contract small. Load specialized procedures only when needed.
- **Conflicting scopes:** two files that name different test commands leave the runtime to guess. Local rules should refine the root, not quietly reverse it.
- **Aspirational guidance:** an agent follows the documented architecture even when the code has not reached it. Describe the current boundary and track the migration elsewhere.
- **Drift:** renamed scripts and retired paths turn good instructions into a failure generator. Update the rule in the same change that makes it false.

# Tradeoffs

| Strategy | Benefits | Costs | Best fit |
|---|---|---|---|
| Detailed instruction files | More repository knowledge is immediately available | More context cost and more facts that can drift | Stable repositories with boundaries that code search cannot reveal |
| Minimal instruction files | Cheap to maintain and hard to contradict | More exploration and greater variation between runs | Small or fast-changing repositories where conventions remain obvious |

# Questions

> [!QUESTION]- Why do hierarchical instruction files often outperform a single giant root file?
> - Root guidance carries invariants shared by the whole repository.
> - A local file can add the build command or dependency rule for one subtree when the runtime supports path-scoped loading.
> - The agent receives less irrelevant material while working in another area.
> - The cost is governance: precedence must be explicit, and local rules cannot silently contradict the root.

# References

- [Manage Claude Code memory (`CLAUDE.md`, project and user scope) (Anthropic)](https://docs.anthropic.com/en/docs/claude-code/memory)
- [Adding repository custom instructions for GitHub Copilot (`.github/copilot-instructions.md`) (GitHub Docs)](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
- [Cursor Rules documentation (`.cursorrules` and `.cursor/rules`) (Cursor)](https://cursor.com/docs/context/rules)
- [OpenCode documentation (AGENTS-style project instructions) (OpenCode)](https://opencode.ai/docs/)
