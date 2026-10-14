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
qard-deck: "AI & ML"
qard-topic: "LLM/Loop Engineering/Loop Engineering"
flashcard_uid: "3d544ed9"
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

> [!qard]- What does a tool-using model need from a runtime to operate as a loop?
> The runtime executes requested tools, returns observations to the model, and decides whether another turn runs. It owns the completion check and operational bounds; the model’s final text alone does not prove the task succeeded. A one-call tool request becomes a loop only when the runtime sends its result back for another decision. [Claude tool-use loop](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)

> [!qard]- What should a runtime report when its loop budget expires before the task is complete?
> Return an explicit partial result and identify the unmet completion condition; budget exhaustion is not success. If the runtime supports a configured continuation or human escalation path, hand off the partial state and what remains unresolved. Anthropic task budgets may leave a partial result when a task exceeds the available budget, and OpenAI Agents SDK supports a max-turn error handler for a run that reaches its limit. [Anthropic task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets) · [OpenAI Agents SDK running agents](https://openai.github.io/openai-agents-python/running_agents/)

> [!qard]- How do context selection and loop control divide long-run compaction work?
> Context engineering decides what information the model needs and what a summary must preserve. Loop engineering decides when to compact, offload an artifact, or stop before the next request. OpenAI Responses API compaction carries selected prior state in a smaller context; durable plans and external artifacts remain application-managed state. [OpenAI compaction](https://developers.openai.com/api/docs/guides/compaction)

# References

- [Claude Agent SDK — overview (Anthropic)](https://platform.claude.com/docs/en/agent-sdk/overview)
