---
publish: true
created: 2026-07-11T21:45:47.936Z
modified: 2026-07-11T21:45:47.937Z
published: 2026-07-11T21:45:47.937Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - Tooling
summary: "The layer that turns LLMs into engineering leverage: coding agents, review agents, and IDE extensions."
status: Done
level:
  - "2"
priority: Medium
---

# Intro

AI development tooling is the practical layer that turns large language models into day-to-day engineering leverage: faster implementation, wider codebase understanding, and lower friction for repetitive work. This category matters because the value is not just "generate code"; it is orchestration around your repo, terminal, CI checks, and team rules. In practice, tool choice determines how reliably an assistant can plan work, edit files safely, run verification, and follow project conventions.

The landscape now breaks into three operational buckets: coding agents that can execute multi-step tasks, review agents that focus on pull-request quality, and IDE extensions that blend autocomplete, chat, and limited automation in the editor. Across all buckets, the same control surfaces show up repeatedly: **skills** (reusable capability packs), **plugins** (integrations and extensions), **hooks** (automation triggers before/after actions), and **agent instructions** (repo-scoped rules such as `AGENTS.md`, `CLAUDE.md`, or tool-specific rules files).

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Tooling section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Agent Instructions">Agent Instructions</span></span></div><p class="db-card-summary">Project-level config files telling AI coding agents how a specific repository works.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Tooling/Agent Instructions.md" data-tooltip-position="top" aria-label="Agent Instructions">Agent Instructions</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Coding Agents">Coding Agents</span></span></div><p class="db-card-summary">An LLM running in an action loop to complete engineering tasks end to end.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Tooling/Coding Agents.md" data-tooltip-position="top" aria-label="Coding Agents">Coding Agents</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Hooks">Hooks</span></span></div><p class="db-card-summary">Lifecycle callbacks that run custom logic at defined agent execution points.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Tooling/Hooks.md" data-tooltip-position="top" aria-label="Hooks">Hooks</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Plugins">Plugins</span></span></div><p class="db-card-summary">Extension mechanisms adding tools, data, and workflows to coding agents, standardized by MCP.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Tooling/Plugins.md" data-tooltip-position="top" aria-label="Plugins">Plugins</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Skills">Skills</span></span></div><p class="db-card-summary">Reusable instruction packages that give a coding agent specialized domain expertise on demand.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Tooling/Skills.md" data-tooltip-position="top" aria-label="Skills">Skills</a></span></article></div><style>
.db-card {
  position: relative;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.db-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--card-accent, 125, 125, 125), 0.09) 0%,
    rgba(var(--card-accent, 125, 125, 125), 0.04) 38%,
    rgba(var(--card-accent, 125, 125, 125), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.db-card:hover,
.db-card:focus-within {
  border-color: rgba(var(--card-accent, 125, 125, 125), 0.55);
  background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.db-card:hover::before,
.db-card:focus-within::before { opacity: 1; }
.db-card-body {
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: var(--db-card-pad, 0.85rem 0.9rem);
}
.db-card-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--card-accent, 125, 125, 125));
}
.db-card-icon svg { display: block; width: 100%; height: 100%; }
.db-card-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}
/* Element-qualified (p.db-card-summary) on purpose: it ties the specificity of
   Obsidian reading view's ".markdown-rendered p" and, being injected later in
   the body, wins. A bare ".db-card-summary" loses to it, so Obsidian keeps its
   default paragraph spacing and the description gets large gaps above/below.
   Quartz doesn't add those margins, which is why the gap only showed there. */
p.db-card-summary {
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.db-card-hit { position: absolute; inset: 0; z-index: 1; }
.db-card-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.db-card-hit a:focus-visible {
  outline: 2px solid rgb(var(--card-accent, 125, 125, 125));
  outline-offset: -0.3rem;
}
@media (prefers-reduced-motion: reduce) {
  .db-card { transition: none; }
  .db-card::before { transition: none; }
  .db-card:hover,
  .db-card:focus-within { transform: none; }
}

.folder-structure-map {
\--card-accent: 16, 185, 129;
\--map-gap: 0.75rem;
width: 100%;
box-sizing: border-box;
margin: 0.5rem 0 0.75rem;
container-name: folder-map;
container-type: inline-size;
}
.folder-map-children {
/\* Flex (not grid) so each card sizes to its own title — a long title widens
its card and pushes to another row instead of being truncated, and rows
grow to fill the width with no empty tracks when there are few cards. _/
display: flex;
flex-wrap: wrap;
gap: var(--map-gap);
}
.folder-map-node {
/_ No overflow:hidden on a flex item whose min-width:auto collapses to 0: that
would let the card shrink below its title + note-count and clip them.
Without it the card's min size is its content, so long titles widen the card
(and wrap to another row) instead of being cut off. The shared ::before
accent uses border-radius:inherit to stay inside the rounded corners. _/
flex: 1 1 12rem;
min-height: 2.75rem;
\--db-card-pad: 0.5rem 0.75rem;
}
.folder-map-node .db-card-body {
min-height: 2.75rem;
justify-content: center;
}
.folder-map-node-heading {
display: flex;
align-items: center;
justify-content: space-between;
gap: 0.75rem;
}
.folder-map-node-title-group {
display: flex;
align-items: center;
gap: 0.5rem;
}
.folder-map-node .db-card-title {
white-space: nowrap;
}
.folder-map-node-count {
display: block;
flex: 0 0 auto;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
white-space: nowrap;
}
.folder-map-node .db-card-summary {
display: none;
}
/_ Empty-section placeholder: a muted gray dashed card (not raw text), reusing
the .db-card chrome but with the accent gradient and hover lift neutralized. \*/
.folder-map-node-empty {
border-style: dashed;
background-color: var(--background-secondary, rgba(125, 125, 125, 0.06));
cursor: default;
}
.folder-map-node-empty::before { display: none; }
.folder-map-node-empty:hover,
.folder-map-node-empty:focus-within {
border-color: var(--background-modifier-border, var(--lightgray, #d8dee9));
background-color: var(--background-secondary, rgba(125, 125, 125, 0.06));
box-shadow: none;
transform: none;
}
.folder-map-node-empty .db-card-body {
justify-content: center;
align-items: center;
text-align: center;
}
.folder-map-empty-text {
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.9rem;
font-style: italic;
}
@container folder-map (min-width: 40rem) {
.folder-map-node {
min-height: 6rem;
\--db-card-pad: 0.85rem 0.9rem;
}
.folder-map-node .db-card-body {
min-height: 6rem;
justify-content: flex-start;
}
.folder-map-node .db-card-summary { display: block; }
}
@container folder-map (min-width: 64rem) {
.folder-map-node,
.folder-map-node .db-card-body { min-height: 6.75rem; }
} </style></nav>

## Categories

### Coding agents

Coding agents are the most autonomous class. They can inspect project files, propose plans, apply edits, run commands, and iterate based on test or lint output. Common tools include Claude Code, Cursor, GitHub Copilot (agent mode), Cline, Aider, Windsurf, and Opencode. See [[Coding Agents]] for mechanism details and tradeoffs.

### Code review agents

Code review agents optimize a narrower loop: pull-request analysis, risky change detection, and actionable review comments. A representative tool is CodeRabbit, which integrates into GitHub/GitLab workflows and provides automated review feedback so humans can focus on architecture and business correctness.

### IDE extensions

IDE extensions prioritize in-flow assistance: inline completion, chat panes, refactor suggestions, and basic command execution from the editor. This category includes Copilot extension workflows and extension-backed agents such as Cline. Compared with terminal-first agents, IDE integrations usually reduce context switching but can hide execution details if the tool does not expose a clear action log.

## Questions

> [!QUESTION]- How do you choose between a terminal-first coding agent and an IDE-first coding agent?
>
> - Start with team workflow: terminal-first fits script-heavy and CI-centric teams, IDE-first fits interactive editing-heavy teams
> - Compare observability: terminal-first often exposes every command clearly, while IDE-first may optimize UX but hide low-level steps
> - Validate integration needs: if your process depends on PR workflows, issue trackers, and editor navigation, IDE integration can reduce friction
> - Check policy controls: hooks, rules files, and approval gates matter more than UI style in regulated or production-sensitive environments

> [!QUESTION]- Why are agent instructions and hooks more important than model quality in long-running repos?
>
> - Instructions encode project constraints (architecture, naming, testing expectations) that the base model does not know
> - Hooks create automatic guardrails, catching policy violations before merge
> - Better models can still make wrong local decisions without repo-specific constraints
> - Reliable behavior over months depends on repeatable controls, not one-off prompt quality

> [!QUESTION]- What is the practical difference between a coding agent and a code review agent?
>
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
