---
topic:
  - AI & ML
subtopic:
  - Tooling
dg-publish: false
status: Creation
level:
  - '2'
priority: Medium
---

# Intro

In coding agents, skills are reusable instruction packages that make the model behave like it has specialized domain expertise for a task. Instead of repeating the same guidance in every prompt, you encode conventions once and load them at session start or on demand. Mechanically, a skill is usually a markdown file with structured instructions; when loaded, its content is injected into the agent context (often the system prompt or tool-visible context), which changes tool choice, code style, and decision rules. Tool access control is platform-specific: Claude Code skills can include `allowed-tools`, while OpenCode keeps skill permission policy in `opencode.json`.

For the broader project-level instruction pattern, see [[Software Engineering/11 AI & ML/Tooling/Agent Instructions|Agent Instructions]]. For tool/plugin integration patterns skills often rely on, see [[Software Engineering/11 AI & ML/Tooling/Plugins|Plugins]].

## How Skills Work Across Tools

- **Claude Code / OpenCode**: skills are `SKILL.md` files in project and global directories. OpenCode discovers project skills from `.opencode/skills`, `.claude/skills`, `.agents/skills`, plus global paths like `~/.config/opencode/skills`, `~/.claude/skills`, and `~/.agents/skills`. In OpenCode, skills are loaded on demand through the `skill` tool; in Claude Code, skills can auto-trigger from descriptions or be invoked directly via slash command.
- **Scope model**: project-scoped skills encode repository conventions; user/global skills encode your personal defaults; built-in skills provide core operational behaviors.
- **Cursor**: historically uses a single root `.cursorrules` file (legacy), with newer setups often moving to `.cursor/rules/` for modular rule files.
- **GitHub Copilot**: `.github/copilot-instructions.md` acts as repository-wide instruction context (single-file baseline), with optional path-specific instruction files.
- **Cline**: `.clinerules` moved from a text-box model to version-controlled instruction files, making rule updates shareable and reviewable.

## Minimal Skill Structure

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

## Practical Example

Assume your team has strict API error contracts and logging conventions. Without a skill, the agent may generate mixed error shapes (`{ error: "..." }` in one file, RFC 7807 in another), omit correlation IDs, and forget retry-safe patterns. With a `company-api-conventions` skill loaded, the model consistently applies your contract, calls your API schema tools first, and produces code that passes internal review with fewer manual corrections.

## Tradeoffs

| Choice | Option A | Option B | Decision criteria |
|---|---|---|---|
| Scope | Project-specific skills | User-global skills | Use project scope for repo rules that must be consistent for everyone; use global scope for personal defaults that should not leak into team repos. |
| Detail level | Detailed, procedural skills | Lightweight high-level rules | Detailed skills reduce ambiguity but increase context/token cost; lightweight rules are faster but can under-specify non-obvious standards. |

## Questions

> [!QUESTION]- Why do skills usually improve agent reliability more than repeating instructions in every prompt?
> - Skills are persistent and reusable, so important constraints are present every time instead of being forgotten in ad-hoc prompts
> - They standardize behavior across contributors and sessions, reducing output variance
> - Structured frontmatter plus explicit usage guidance improves skill selection and timing
> - Skills are version-controlled artifacts, so teams can review and evolve them like code

> [!QUESTION]- When should you choose project-scoped skills over user-global skills?
> - Choose project scope when conventions are repository-specific and must be shared by all contributors
> - Choose project scope when CI, linters, or architecture rules are tightly coupled to that codebase
> - Use user-global skills for personal productivity preferences that should not override team policy
> - If a rule would surprise teammates in a PR review, it should be project-scoped, not global

## References

- [Extend Claude with skills (Claude Code Docs)](https://code.claude.com/docs/en/skills)
- [Agent Skills (OpenCode Docs)](https://opencode.ai/docs/skills/)
- [Adding custom instructions for GitHub Copilot CLI (GitHub Docs)](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- [.clinerules: Version-Controlled, Shareable, and AI-Editable Instructions (Cline)](https://cline.ghost.io/clinerules-version-controlled-shareable-and-ai-editable-instructions/)
- [What are Cursor Rules? (WorkOS)](https://workos.com/blog/what-are-cursor-rules)

<!-- whats-next:start -->

---

> [!note] Whats next
<!-- whats-next:end -->
