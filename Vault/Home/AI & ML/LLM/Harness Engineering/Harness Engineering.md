---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Designing the capability surface and scaffold the model acts through — tools, protocols, execution environment."
tags:
  - FolderNote
publish: true
level:
  - "3"
priority: Low
status: Done
---

Harness engineering is the discipline of deliberately designing everything the model acts *through*: the scaffold between the model's text output and the real world. It has three layers — the **tool surface** (which tools exist, how they are named, documented, and scoped — see [[Tools]]), the **wiring protocol** that connects tools to clients (see [[Model Context Protocol]]), and the **execution environment** (sandboxes, permissions, filesystem access — what the model is allowed to touch). The model only ever emits structured calls; the harness decides what those calls can reach and what happens when they run.

The scope ladder places it among its neighbors: [[Home/AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]] shapes the single instruction, [[Context Engineering]] decides what the model *sees*, harness engineering decides what the model *can do*, and [[Loop Engineering]] decides how it iterates over time. The layers interact constantly — every tool schema the harness exposes is context the model must read, and every tool result feeds the next loop iteration — but the design questions are distinct: a harness question is "should this agent have a `delete_branch` tool, and who approves it?", not "which evidence goes first in the window?".

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# The Tool Surface Is an API for a Model

Designing the tool surface is API design where the consumer cannot read source code, ask clarifying questions, or debug — it selects tools by matching names and descriptions against its current subgoal. The harness-level decisions sit above any single tool's design:

- **Minimal, high-signal toolsets.** Expose only what the current task needs. Every connected schema is sent with every request and competes for attention — large toolsets measurably lower accuracy, not just raise cost (the MCPGauge numbers in [[Tools]]). The token side of this is a [[Context Engineering]] concern; deciding *which* tools exist at all is a harness one.
- **Surface-wide consistency.** A surface where every tool follows the same naming scheme, return shape, and error contract lets the model transfer what it learned from one tool to the rest — consolidation patterns and naming specifics are covered in [[Tools]].

Depth on individual tool design — descriptions, parameters, return minimalism, fault tolerance — lives in [[Tools]].

# The Execution Environment

The third layer of the harness is what happens *after* the model emits a call. Because the model never executes anything directly, the runtime is a natural enforcement point — controls placed here hold regardless of what the prompt says or what an injected instruction asks for:

- **Sandboxing.** Run tool execution in a constrained environment: a scoped filesystem root, a network allowlist, a container. The blast radius of a wrong or hostile call is bounded by the sandbox, not by the model's judgment.
- **Permission gating.** Classify operations by risk. Read-only calls can auto-approve; state-mutating or irreversible ones (deploy, delete, send, pay) route through explicit policy — allowlists, per-tool scopes, least-privilege credentials for whatever the tool touches downstream.
- **Human approval boundaries.** For the highest-risk actions, the harness pauses and asks. Where that boundary sits is a per-deployment design decision: too tight and the agent is a form-filler, too loose and one poisoned tool description can exfiltrate secrets (the tool-poisoning attacks in [[Model Context Protocol]]).

These are the deterministic, code-level controls that [[Guardrails]] recommends over prompt-level pleading: the prompt asks the model to behave; the harness makes misbehavior impossible or reviewable.

# Harness Quality and Agent Reliability

Harness effort deserves parity with prompt effort — the "tool quality" principle from the [[Agents]] hub. The reason is compounding: agents interact with the harness across many [[Agent Loop]] iterations, so a surface flaw doesn't cause one bad answer — it causes a wrong turn that every subsequent step builds on, and the resulting failures masquerade as model failures. The SWE-bench case study and the amortization argument (a fixed tool contract helps every run that shares the surface) are covered in [[Tools]].

# Questions

> [!QUESTION]- What is harness engineering, and how does it differ from context engineering?
> - Harness engineering designs everything the model acts *through*: the tool surface (which tools exist, how they're named and scoped), the wiring protocol (MCP), and the execution environment (sandboxes, permissions, approval boundaries)
> - Context engineering decides what the model *sees* in its window; harness engineering decides what it *can do*; loop engineering decides how it iterates over time
> - They intersect — tool schemas consume context budget, tool results feed the loop — but the design questions differ: capability and safety boundaries versus signal selection and ordering

> [!QUESTION]- Why is the runtime, not the prompt, the right place to enforce what an agent may do?
> - The model never executes tools directly — it only emits structured calls; the runtime executes, so controls placed there cannot be talked around
> - Prompt-level rules fail under prompt injection or poisoned tool descriptions; code-level sandboxes, permission gates, and human-approval boundaries hold regardless of what enters the context
> - Practical layering: sandbox execution to bound blast radius, auto-approve read-only calls, gate state-mutating ones by policy, require a human for irreversible actions

> [!QUESTION]- Why does harness quality deserve as much investment as prompt quality for agent reliability?
> - Agents hit the harness on every loop iteration, so tool-surface flaws compound: one ambiguous name or vague error causes a wrong turn that later steps build on
> - Precise contracts and structured errors let the model self-correct; sloppy ones produce failures that masquerade as model failures
> - Harness fixes amortize across every run and every agent sharing the surface; prompt tweaks are flow-specific and fragile

# References

- [Writing effective tools for agents (Anthropic Engineering)](https://www.anthropic.com/engineering/writing-tools-for-agents) — practitioner guidance on designing, consolidating, and evaluating agent tool surfaces.
- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents) — source of the tool-quality principle and the treat-tools-as-API-design framing.
- [Model Context Protocol (Official docs)](https://modelcontextprotocol.io/) — the open standard for wiring tools and data sources to LLM clients.
- [Effective context engineering for AI agents (Anthropic Engineering)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — the neighboring discipline; covers why tool schemas count against the context budget.
