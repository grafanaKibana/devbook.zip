---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Designing control flow, stopping, verification, and recovery across repeated model calls."
tags: [FolderNote]
publish: true
level:
  - "3"
priority: Medium
status: Done
---

Loop engineering designs the runtime around repeated model calls. It controls the observe → decide → act cycle, defines when work is finished, checks progress between steps, and hands uncertain decisions to a person.

A single call is bounded. A loop carries each result into the next iteration, so mistakes can accumulate just as easily as useful progress. Good loop design keeps small errors small. Model quality alone cannot do that.

This is the last rung of the runtime stack. [[Home/AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]] shapes one instruction. [[Home/AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] shapes what the model sees, while [[Home/AI & ML/LLM/Harness Engineering/Harness Engineering|Harness Engineering]] controls what it can do. Loop engineering adds time: how behavior develops across turns. [[Agent Loop]] covers the mechanics of that cycle, and [[Multi-Agentic Systems]] covers coordination among several loops.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Termination and Budgets

An agent loop has no natural end. It can keep calling tools for as long as the runtime asks for another step, with every weak result becoming input to the next one. Hard bounds belong in the initial design.

- **Iteration caps** set a hard per-request limit on loop cycles. The cap is the final defense against an infinite tool-call sequence. [[Agent Loop]] shows concrete framework controls and the failure they prevent.
- **Token and cost budgets** track cumulative use and stop or compact the run before it exhausts the context window or spend ceiling.
- **Checkable stop criteria** define completion in terms the runtime can verify: no remaining tool calls, a passing test suite, or a schema-valid artifact. Instructions to stop may help, but they do not replace hard limits.
- **A budget fallback** determines what happens at the cap. The runtime can return the best partial result with a warning or escalate to a person. Silent truncation hides the failure.

# Verification Inside the Loop

A loop that only generates will drift. Verification turns each iteration into a chance to recover.

- **Gates between steps** validate an intermediate result before another iteration consumes it. A rejected schema or failed output check should return a clear error that the next pass can act on.
- **Self-checks** use a second model pass to compare a draft with explicit criteria and feed revisions back. This is the evaluator-optimizer pattern described in [[Home/AI & ML/LLM/Agents/Agents|Agents]].
- **Ground-truth signals** give the strongest feedback: a test passes, code compiles, or a claim traces to a source. Loops work best when success is externally checkable. [[Home/AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]] covers trajectory quality and reliability across stochastic runs.
- **Human escape hatches** pause work when an action is irreversible or its result cannot be checked safely. [[Guardrails]] explains why the boundary must live in code and infrastructure rather than the prompt.

# State Across Iterations

Each iteration adds calls and results to the history. Without intervention, context grows until the runtime truncates it or the model reaches its limit. [[Home/AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] decides what belongs in the window. Loop engineering decides when to compact, offload, or stop.

- **Compaction cadence** schedules summaries against a token threshold before overflow removes old, potentially important messages.
- **Offloading between turns** moves large artifacts to external storage and keeps lightweight references in context. [[Multi-Agentic Systems]] uses the same filesystem-artifact pattern for handoffs.
- **State outside the window** gives the loop a durable plan or progress log to reread after compaction. Long runs remain tied to the original goal even when early turns have been summarized away.

# Questions

> [!QUESTION]- What does loop engineering add on top of a model with tools, and why is it its own discipline?
> A model with tools can still be a single call. Loop engineering adds the runtime that repeats observe → decide → act until a checkable stop condition. It owns budgets and verification between turns, which determines whether an early mistake is corrected or amplified.

> [!QUESTION]- What are the main ways to bound a loop, and why are prompt-level stop instructions not enough?
> The runtime needs a hard iteration cap, a cumulative token or cost budget, and a stop condition it can verify. Prompt instructions are advisory, so they cannot replace those limits. At the cap, return an explicit partial result or escalate instead of truncating silently. The unbounded run documented in [[Agent Loop]] shows the failure mode: 369 repeated tool calls consumed 9.7M tokens without converging.

> [!QUESTION]- How do loop engineering and context engineering divide the work of managing a long run's history?
> Context engineering decides what belongs in the window and what a summary must preserve. Loop engineering decides when to compact, offload artifacts, or stop. Durable state such as a plan file bridges them by surviving compaction and keeping later iterations tied to the original goal.

# References

- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents) — the loop as "LLM using tools in a loop", plus the simplicity/transparency/feedback principles that motivate gates and stop criteria.
- [Multi-Agent Research System — Engineering (Anthropic)](https://www.anthropic.com/engineering/multi-agent-research-system) — production lessons on budgets, artifact offloading, and coordinating many loops.
- [Effective context engineering for AI agents (Anthropic Engineering)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — compaction, note-taking, and sub-agent isolation as long-horizon loop techniques.
- [Claude Agent SDK — overview (Anthropic)](https://platform.claude.com/docs/en/agent-sdk/overview) — a production harness whose runtime implements the loop: automatic context compaction, permission gates, and session state.
