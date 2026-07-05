---
topic:
  - AI & ML
subtopic:
  - Tooling
publish: true
status: Done
level:
  - "2"
priority: Medium
---

# Intro

Agent instruction files are project-level configuration documents that tell AI coding agents how to behave inside a specific repository. They encode the local contract: coding conventions, architectural boundaries, tool preferences, and domain language. This pattern emerged because generic models become much more reliable when they are grounded in how a particular codebase actually works.

Mechanically, the agent loads instruction files when a session starts (and in some tools, while traversing directories). The content is injected into the agent's operating context, so it influences every decision: which files to edit, what patterns to follow, what commands to run, and how to validate changes. This is why a concise, accurate file improves output quality across all tasks, while stale or contradictory rules degrade it.

## Instruction File Landscape

| Tool | Filename | Scope behavior |
|---|---|---|
| Claude Code | `CLAUDE.md` | Supports hierarchical memory; Claude reads project and directory-scoped instruction files from root to current path |
| Opencode | `AGENTS.md` | Hierarchical project instructions; can live at root and subdirectories for local rules |
| Cursor | `.cursorrules` | Legacy single-file project rules in repository root (Cursor also supports newer `.cursor/rules/*`) |
| GitHub Copilot | `.github/copilot-instructions.md` | Repository-wide custom instructions for Copilot in supported clients |
| Cline | `.clinerules` | Project root instruction file convention for persistent Cline behavior |
| Windsurf | `.windsurfrules` (legacy), `.windsurf/rules/*.md` (current) | Legacy single-file convention plus current workspace rules directory |
| Aider | `.aider.conf.yml` | YAML config for default behavior, model settings, and workflow preferences |

## What Good Instruction Files Include

- **Tech stack and versions:** runtime, framework, package manager, and build/test commands the agent should use first
- **Coding conventions:** naming, error handling, logging, testing expectations, and formatting policy
- **Architecture rules:** folder ownership, module boundaries, and allowed dependency directions
- **Project-specific knowledge:** domain terms, business invariants, and integration constraints that are not obvious from code alone
- **Prompt-efficiency discipline:** short, actionable rules with clear verbs; avoid long narrative text that wastes context tokens

For modular, reusable behavior packs that complement instruction files, see [[Software Engineering/11 AI & ML/Tooling/Skills|Skills]].

## Example

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

This works because it sets: execution defaults (stack, verification command), data boundaries (DTO mapping), structural constraints (feature folders), error format (ProblemDetails), and quality gates (integration tests). Each rule is actionable — the agent can verify compliance mechanically.

**Anti-pattern** — a 500-line instruction file that describes ideal architecture, coding philosophy, and team values. This consumes prompt budget, dilutes critical rules, and creates contradictions when the codebase does not match the aspirational description. Keep the core under 30 rules; link to deeper docs for reference.

## Pitfalls

- **Instruction bloat:** very long files consume prompt budget and dilute high-priority rules. Keep a short core and link to deeper docs only when needed.
- **Contradictory hierarchy:** root and subdirectory files that disagree cause unstable behavior (for example, two different testing commands). Define precedence and eliminate overlaps.
- **Aspirational, not actual, guidance:** rules that describe an ideal architecture instead of the current repository state lead to wrong edits. Write what is true now, then migrate gradually.
- **Stale rules:** codebase evolves faster than instructions; outdated commands or paths create repeated failures. Treat instruction files as living operational docs and update with major repo changes.

## Tradeoffs

| Strategy | Benefits | Costs | Best fit |
|---|---|---|---|
| Detailed instruction files | Higher consistency, better architectural alignment, fewer repeated prompt clarifications | Higher context cost, ongoing maintenance burden, more chance of drift | Large repos with multiple contributors and strict standards |
| Minimal instruction files | Low maintenance, small context footprint, easier onboarding | More variability in agent decisions, heavier reliance on codebase inference | Small repos or rapidly changing prototypes |

## Questions

> [!QUESTION]- Why do hierarchical instruction files often outperform a single giant root file?
> - Rules stay close to the code they govern, reducing ambiguity in mixed-language or mixed-architecture repos
> - Subdirectory instructions can refine local constraints without polluting global context
> - Smaller scoped files usually improve relevance-to-token ratio in the agent prompt
> - The tradeoff is governance complexity: teams need clear precedence and periodic cleanup

> [!QUESTION]- What is the fastest way to detect that an instruction file is harming agent quality?
> - Repeated command failures from outdated scripts or wrong paths
> - Inconsistent code style across tasks despite explicit rules
> - Frequent edits that violate architecture constraints the file claims to enforce
> - Rapid fix is to trim to high-signal rules, remove contradictions, then re-add specifics incrementally

> [!QUESTION]- When should a team keep instructions minimal and rely more on repository inspection?
> - Early prototype phases where architecture and conventions are changing weekly
> - Small codebases where implicit conventions are obvious from a few files
> - Teams that cannot maintain rule quality yet; stale detail is worse than concise accurate guidance
> - As complexity grows, move from minimal to layered instructions before inconsistency becomes expensive

## References

- [Manage Claude Code memory (`CLAUDE.md`, project and user scope) (Anthropic)](https://docs.anthropic.com/en/docs/claude-code/memory)
- [Adding repository custom instructions for GitHub Copilot (`.github/copilot-instructions.md`) (GitHub Docs)](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
- [Cursor Rules documentation (`.cursorrules` and `.cursor/rules`) (Cursor)](https://cursor.com/docs/context/rules)
- [Windsurf Cascade memories and workspace rules (`.windsurf/rules/*.md`) (Windsurf Docs)](https://docs.windsurf.com/windsurf/cascade/memories)
- [Claude Code best practices (Anthropic)](https://docs.anthropic.com/en/docs/claude-code/best-practices)
- [OpenCode documentation (AGENTS-style project instructions) (OpenCode)](https://opencode.ai/docs/)
