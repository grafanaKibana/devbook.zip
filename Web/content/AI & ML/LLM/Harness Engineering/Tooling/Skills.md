---
publish: true
created: 2026-08-20T20:41:15.495Z
modified: 2026-08-20T20:41:15.495Z
published: 2026-08-20T20:41:15.495Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Reusable instruction packages that give a coding agent specialized domain expertise on demand.
status: Done
level:
  - "2"
priority: Medium
---

Skills package instructions for a recurring task. The runtime advertises a short name and description, then loads the full body only when the skill is selected. This keeps a review checklist or release procedure out of every prompt without hiding it in a private convention.

Most implementations use a `SKILL.md` file with frontmatter for discovery and Markdown for the procedure. Loading a skill changes the context available to the model. It does not create a new executable tool by itself. Permissions remain runtime-specific. Claude Code can pre-approve tools through `allowed-tools`, while OpenCode controls access to the skill tool in `opencode.json`.

# Discovery and Scope

Claude Code, OpenCode, and GitHub Copilot all discover `SKILL.md` packages from project and user directories. OpenCode searches `.opencode/skills`, `.claude/skills`, and `.agents/skills` along the worktree path, then exposes matching definitions through its `skill` tool. Claude Code can select a skill from its description or run one explicitly as a slash command.

GitHub Copilot recognizes project skills under `.github/skills`, `.claude/skills`, and `.agents/skills`, plus personal skills under `~/.copilot/skills` and `~/.agents/skills`. Agent skills are available across Copilot's cloud agent, code review, CLI, app, and agent modes in Visual Studio Code and JetBrains IDEs. Custom instructions remain a separate, mostly always-on surface.

Project skills belong with the repository when every contributor should get the same procedure. User skills hold personal workflows. This is different from always-on project instructions: [[Agent Instructions]] state facts that should shape most work, while a skill earns its context cost only when its procedure applies. And [[Plugins]] add executable capabilities rather than prose alone.

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

OpenCode note: OpenCode requires `name` and `description`, and supports `license`, `compatibility`, and `metadata`. Unknown frontmatter fields are ignored.

Frontmatter makes the skill discoverable. The body contains the procedure a reviewer can inspect as ordinary Markdown. `allowed-tools` is a Claude Code permission convenience, not a portable restriction across every runtime.

# Practical Example

Suppose an API has a fixed error contract. A task-specific skill can tell the agent to read the schema, use the expected error shape, and run the focused contract test. The skill does not guarantee compliance. It makes the right procedure available at the moment the agent chooses how to work.

# Pitfalls

## Skills That Are Too Broad

A `coding-conventions` skill that covers every kind of engineering work becomes another root instruction file with worse discoverability. Split only at real activation boundaries. `api-error-contracts` is useful when endpoint work needs a procedure. A tiny naming rule belongs in always-on project guidance.

## Stale Skills

A skill can preserve an obsolete SDK call long after the application moves on. Keep project skills in version control and update them in the change that invalidates the procedure. A review date does not repair stale instructions. An executable check is stronger evidence.

## Conflicting Scopes

A personal skill that prefers `var` can collide with a repository rule requiring explicit types. Team policy belongs in the repository. Personal skills should avoid restating it, and no assumed precedence should replace the runtime's documented resolution rules.

# Tradeoffs

| Choice | Option A | Option B | Decision criteria |
|---|---|---|---|
| Scope | Project-specific skills | User-global skills | Put shared procedures with the repository. Keep personal shortcuts global only when they cannot override team policy. |
| Detail level | Detailed procedure | Short guidance | Use a procedure when order and verification matter. A small fact usually belongs in project instructions instead. |

# References

- [Extend Claude with skills (Claude Code Docs)](https://code.claude.com/docs/en/skills)
- [Agent Skills (OpenCode Docs)](https://opencode.ai/docs/skills/)
- [About agent skills (GitHub Docs)](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
