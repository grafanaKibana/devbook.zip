---
topic: [AI & ML]
subtopic: [LLM]
summary: "Designing the tools, protocol wiring, and execution boundary that a model acts through."
tags: [FolderNote]
publish: true
level: ["3"]
priority: Medium
status: Done
qard-deck: "AI & ML"
qard-topic: "LLM/Harness Engineering/Harness Engineering"
flashcard_uid: "c0ec4e2e"
---

Harness engineering designs the boundary between a model's structured output and the systems that act on it. The boundary includes the callable operations in [[Tool Design]], the developer-facing extension surfaces in [[Home/AI & ML/LLM/Harness Engineering/Tooling/Tooling|Tooling]], the client wiring defined by [[Model Context Protocol]], and the execution environment that controls permissions and filesystem access. The model proposes a call. The harness decides what that call can reach and what happens when it runs.

This puts harness engineering in the middle of the runtime stack. [[Home/AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]] shapes one instruction, while [[Home/AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] decides what the model sees. Harness engineering sets what it can do. [[Home/AI & ML/LLM/Loop Engineering/Loop Engineering|Loop Engineering]] controls how the work continues over time.

The boundaries overlap. Tool schemas consume context, and tool results feed later iterations. Still, the harness owns a different decision: whether an agent should have a `delete_branch` tool at all, and which policy approves its use.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# The Tool Surface Is an API for a Model

The tool surface is an API for a consumer that cannot inspect its implementation. A model chooses among tools from their names, descriptions, and schemas, then interprets whatever each call returns. That makes a few surface-wide decisions especially important:

- **Small surface.** Only the tools the current task needs are exposed. Every connected schema competes for attention on every request. Large toolsets cost tokens because their schemas enter the model's context, and overlapping tools leave more options to choose between. The MCPGauge results in [[Tool Design]] come from whole MCP-assisted runs, including retrieved content, so they show run-level token and accuracy effects rather than isolating the number of schemas. [[Home/AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] manages that token cost. The harness decides which tools exist.
- **Consistent contracts.** Shared naming, return shapes, and error conventions let the model reuse what it learned from one tool when it calls another. [[Tool Design]] covers the lower-level naming and consolidation patterns.

Individual descriptions, parameters, compact results, and failure behavior belong in [[Tool Design]]. Skills, plugins, hooks, coding agents, and repository instructions live together under [[Home/AI & ML/LLM/Harness Engineering/Tooling/Tooling|Tooling]].

# The Execution Environment

The execution environment takes over after the model emits a call. Since the model does not execute the operation itself, the runtime can enforce rules that no prompt or injected instruction can bypass.

- **Sandboxed execution.** A scoped filesystem, network allowlist, or container limits the damage from a mistaken or hostile call.
- **Risk-based gating.** Read-only operations may run automatically. State-changing or irreversible work such as deploying, deleting, sending, or paying passes through explicit policy and runs with least-privilege credentials.
- **Human approval.** The highest-risk actions need a person at the boundary. Too many pauses turn the agent into a form filler. Too few leave room for a poisoned tool description to exfiltrate secrets, as the attacks in [[Model Context Protocol]] demonstrate.

These are the deterministic controls described by [[Guardrails]]. A prompt can request safe behavior. The harness can make an unsafe operation impossible or force it through review.

# Harness Quality and Agent Reliability

A weak harness can waste a strong model. Agents reuse the same surface across many [[Agent Loop]] iterations, so one ambiguous name or vague error can send a run down the wrong path and keep it there. Those failures often look like model failures even though the interface caused them.

The "tool quality" principle in the [[Home/AI & ML/LLM/Agents/Agents|Agents]] hub gives harness work the same weight as prompt work. One repaired tool contract improves every run that shares it. [[Tool Design]] covers that amortization argument and the SWE-bench case study behind it.

# Questions

<!-- qard-id: d15112b8-f911-4f82-baa3-da3d67bbbf35 -->
> [!qard]- How do context, harness, and loop engineering differ in what they control?
> The three disciplines own different decisions about the same agent run. Context engineering decides what the model sees. Harness engineering decides what the model's proposed actions can reach and do. Loop engineering decides whether and how the work continues across turns.
>
> | Discipline | Decision it owns | Typical controls |
> |---|---|---|
> | Context engineering | Which information the model receives on each call | Selecting and compacting instructions, retrieved evidence, history and tool results |
> | Harness engineering | What the runtime allows a proposed action to do once the model emits it | Which tools exist, their permissions and credentials, call validation, sandboxing and approval gates |
> | Loop engineering | Whether another turn happens and when the run stops | Progress and verification checks, iteration and cost budgets, and termination |
>
> The boundaries touch. Tool schemas take up context and tool results feed later turns, so context engineering decides how much of them the model sees. Whether a tool such as `delete_branch` exists at all, and which policy approves its use, remains a harness decision.
>
> Sources: [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

# References

- [Writing effective tools for agents (Anthropic Engineering)](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Model Context Protocol (Official docs)](https://modelcontextprotocol.io/)
