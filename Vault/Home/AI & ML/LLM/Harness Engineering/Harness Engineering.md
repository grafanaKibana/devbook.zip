---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Designing the tools, protocol wiring, and execution boundary that a model acts through."
tags: [FolderNote]
publish: true
level:
  - "3"
priority: Medium
status: Done
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

- **Keep the surface small.** Expose only what the current task needs. Every connected schema competes for attention on every request. Large toolsets cost tokens and reduce selection accuracy, as the MCPGauge results in [[Tool Design]] show. [[Home/AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] manages that token cost. The harness decides which tools exist.
- **Make the contracts consistent.** Shared naming, return shapes, and error conventions let the model reuse what it learned from one tool when it calls another. [[Tool Design]] covers the lower-level naming and consolidation patterns.

Individual descriptions, parameters, compact results, and failure behavior belong in [[Tool Design]]. Skills, plugins, hooks, coding agents, and repository instructions live together under [[Home/AI & ML/LLM/Harness Engineering/Tooling/Tooling|Tooling]].

# The Execution Environment

The execution environment takes over after the model emits a call. Since the model does not execute the operation itself, the runtime can enforce rules that no prompt or injected instruction can bypass.

- **Sandbox execution.** A scoped filesystem, network allowlist, or container limits the damage from a mistaken or hostile call.
- **Gate by risk.** Read-only operations may run automatically. State-changing or irreversible work such as deploying, deleting, sending, or paying should pass through explicit policy and least-privilege credentials.
- **Stop for human approval.** The highest-risk actions need a person at the boundary. Too many pauses turn the agent into a form filler. Too few leave room for a poisoned tool description to exfiltrate secrets, as the attacks in [[Model Context Protocol]] demonstrate.

These are the deterministic controls described by [[Guardrails]]. A prompt can request safe behavior. The harness can make an unsafe operation impossible or force it through review.

# Harness Quality and Agent Reliability

A weak harness can waste a strong model. Agents reuse the same surface across many [[Agent Loop]] iterations, so one ambiguous name or vague error can send a run down the wrong path and keep it there. Those failures often look like model failures even though the interface caused them.

The "tool quality" principle in the [[Home/AI & ML/LLM/Agents/Agents|Agents]] hub gives harness work the same weight as prompt work. One repaired tool contract improves every run that shares it. [[Tool Design]] covers that amortization argument and the SWE-bench case study behind it.

# Questions

> [!QUESTION]- What does harness engineering control that context engineering does not?
> Context engineering decides what information the model receives. Harness engineering decides what the runtime allows the model to do with that information: which tools are exposed, what permissions they have, how calls are validated, and where execution is sandboxed or stopped for approval. Tool schemas and results connect the two areas because they consume context, but capability and permission decisions still belong to the harness. Loop engineering then controls whether another turn is allowed.

> [!QUESTION]- Why does harness quality deserve as much investment as prompt quality for agent reliability?
> Agents reuse the harness on every iteration. An ambiguous tool or vague error can redirect one step and then contaminate every later step. A precise contract helps the model recover, and repairing it improves every run that shares the surface.

# References

- [Writing effective tools for agents (Anthropic Engineering)](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Model Context Protocol (Official docs)](https://modelcontextprotocol.io/)
