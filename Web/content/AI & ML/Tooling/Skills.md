---
publish: true
created: 2026-07-18T14:02:43.923Z
modified: 2026-07-18T14:02:43.925Z
published: 2026-07-18T14:02:43.925Z
topic:
  - AI & ML
subtopic:
  - Tooling
summary: Reusable instruction packages that give a coding agent specialized domain expertise on demand.
status: Done
level:
  - "2"
priority: Medium
---

In coding agents, skills are reusable instruction packages that make the model behave like it has specialized domain expertise for a task. Instead of repeating the same guidance in every prompt, you encode conventions once and load them at session start or on demand. Mechanically, a skill is usually a markdown file with structured instructions; when loaded, its content is injected into the agent context (often the system prompt or tool-visible context), which changes tool choice, code style, and decision rules. Tool access control is platform-specific: Claude Code skills can include `allowed-tools`, while OpenCode keeps skill permission policy in `opencode.json`.

For the broader project-level instruction pattern, see [[Agent Instructions]]. For tool/plugin integration patterns skills often rely on, see [[Plugins]].

# How Skills Work Across Tools

- **Claude Code / OpenCode**: skills are `SKILL.md` files in project and global directories. OpenCode discovers project skills from `.opencode/skills`, `.claude/skills`, `.agents/skills`, plus global paths like `~/.config/opencode/skills`, `~/.claude/skills`, and `~/.agents/skills`. In OpenCode, skills are loaded on demand through the `skill` tool; in Claude Code, skills can auto-trigger from descriptions or be invoked directly via slash command.
- **Scope model**: project-scoped skills encode repository conventions; user/global skills encode your personal defaults; built-in skills provide core operational behaviors.
- **Cursor**: historically uses a single root `.cursorrules` file (legacy), with newer setups often moving to `.cursor/rules/` for modular rule files.
- **GitHub Copilot**: `.github/copilot-instructions.md` acts as repository-wide instruction context (single-file baseline), with optional path-specific instruction files.
- **Cline**: `.clinerules` moved from a text-box model to version-controlled instruction files, making rule updates shareable and reviewable.

# Minimal Skill Structure

Claude Code example (`allowed-tools` is Claude-specific frontmatter):

```markdown
---
name: company-api-conventions
description: Enforce internal API conventions for controllers, errors, and telemetry
allowed-tools: Read, Grep, Glob
---

## When to use
Use when creating or modifying HTTP endpoints and integration handlers.

## Instructions
1. Return RFC 7807 problem details for errors.
2. Use correlation IDs in logs and response headers.
3. Prefer idempotent POST handlers with idempotency keys.

## Tool configuration
- If an MCP API-catalog server is available, read endpoint contracts before writing code.
```

OpenCode note: OpenCode requires `name` and `description`, and supports `license`, `compatibility`, and `metadata`; unknown frontmatter fields are ignored.

This format keeps selection metadata in frontmatter and keeps behavioral constraints in markdown, which is easier for teams to review in pull requests.

# Practical Example

Assume your team has strict API error contracts and logging conventions. Without a skill, the agent may generate mixed error shapes (`{ error: "..." }` in one file, RFC 7807 in another), omit correlation IDs, and forget retry-safe patterns. With a `company-api-conventions` skill loaded, the model consistently applies your contract, calls your API schema tools first, and produces code that passes internal review with fewer manual corrections.

# Pitfalls

## Skills That Are Too Broad

**What goes wrong**: a skill named `coding-conventions` tries to cover error handling, logging, API design, testing, and naming conventions in one file. The model loads it for every task, consuming context budget even when only one convention is relevant.

**Mitigation**: split broad skills into focused, single-concern files. A `api-error-contracts` skill and a `logging-conventions` skill are each loaded only when relevant, reducing token cost and improving precision.

## Stale Skills Not Reviewed Like Code

**What goes wrong**: a skill was written six months ago for an older API version. The team has since migrated to a new SDK, but the skill still references deprecated methods. The agent follows the skill and generates code that fails to compile.

**Mitigation**: treat skills as code artifacts. Version-control them, review changes in pull requests, and include them in the same update cycle as the code they govern. Add a `last-reviewed` date in the frontmatter as a lightweight staleness signal.

## Conflicting Project and Global Skills

**What goes wrong**: a user-global skill sets a personal preference (e.g., always use `var` in C#) that conflicts with a project skill requiring explicit types. The agent receives both and produces inconsistent output.

**Mitigation**: project-scoped skills take precedence over user-global skills for repository-specific conventions. Document the precedence rule in the project skill's frontmatter. Avoid encoding team conventions in user-global skills.

# Tradeoffs

| Choice | Option A | Option B | Decision criteria |
|---|---|---|---|
| Scope | Project-specific skills | User-global skills | Use project scope for repo rules that must be consistent for everyone; use global scope for personal defaults that should not leak into team repos. |
| Detail level | Detailed, procedural skills | Lightweight high-level rules | Detailed skills reduce ambiguity but increase context/token cost; lightweight rules are faster but can under-specify non-obvious standards. |

# Questions

> [!QUESTION]- Why do skills usually improve agent reliability more than repeating instructions in every prompt?
>
> - Skills are persistent and reusable, so important constraints are present every time instead of being forgotten in ad-hoc prompts
> - They standardize behavior across contributors and sessions, reducing output variance
> - Structured frontmatter plus explicit usage guidance improves skill selection and timing
> - Skills are version-controlled artifacts, so teams can review and evolve them like code

> [!QUESTION]- When should you choose project-scoped skills over user-global skills?
>
> - Choose project scope when conventions are repository-specific and must be shared by all contributors
> - Choose project scope when CI, linters, or architecture rules are tightly coupled to that codebase
> - Use user-global skills for personal productivity preferences that should not override team policy
> - If a rule would surprise teammates in a PR review, it should be project-scoped, not global

# References

- [Extend Claude with skills (Claude Code Docs)](https://code.claude.com/docs/en/skills) — official Claude Code documentation on skill file format, frontmatter fields, and allowed-tools configuration.
- [Agent Skills (OpenCode Docs)](https://opencode.ai/docs/skills/) — OpenCode's skill system documentation covering discovery paths, frontmatter schema, and loading behavior.
- [Adding custom instructions for GitHub Copilot CLI (GitHub Docs)](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions) — GitHub Copilot's equivalent of skills via `.github/copilot-instructions.md`.
- [.clinerules: Version-Controlled, Shareable, and AI-Editable Instructions (Cline)](https://cline.ghost.io/clinerules-version-controlled-shareable-and-ai-editable-instructions/) — Cline's approach to version-controlled instruction files.
- [What are Cursor Rules? (WorkOS)](https://workos.com/blog/what-are-cursor-rules) — overview of Cursor's `.cursorrules` and `.cursor/rules/` modular rule system.
