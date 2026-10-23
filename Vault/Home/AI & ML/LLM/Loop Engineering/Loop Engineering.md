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
- **Checkable stop criteria** separate stopping from success. A turn with no remaining tool calls shows only that the model has stopped requesting actions; completion needs task-specific evidence the runtime can verify, such as a passing test suite or a schema-valid artifact. Instructions to stop may help, but they do not replace hard limits.
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

<!-- qard-id: 638a8ef2-9d81-4a06-a5d4-43fd0f3c5d3e -->
> [!qard]- What does a tool-using model need from a runtime to operate as a loop?
> The runtime executes requested tools, returns observations to the model, and decides whether another turn runs. It owns the completion check and operational bounds; the model’s final text alone does not prove the task succeeded. A one-call tool request becomes a loop only when the runtime sends its result back for another decision. [Claude tool-use loop](https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works)

<!-- qard-id: 599da810-5eee-4ed5-ae4b-95b2737c4d8f -->
> [!qard]- What should a runtime report when its loop budget expires before the task is complete?
> The runtime reports that the run stopped incomplete, not that it succeeded. The report names the limit that was reached, the completion condition that is still unmet, and the partial result or state produced so far.
> 
> - **Why it matters:** budget exhaustion is not success. If partial output is presented as a final answer or silently truncated, callers treat unfinished work as done and the failure stays hidden.
> - **What follows:** where the application configures it, the partial state and the unresolved work pass to a continuation run or to a person. Otherwise the run ends with an explicit error.
> 
> Platform behavior differs. The OpenAI Agents SDK treats reaching `max_turns` as an error condition and supports a handler for that case. With Anthropic task budgets, a task that exceeds its budget can end with a partial result.
> 
> Sources: [OpenAI Agents SDK: Running agents](https://openai.github.io/openai-agents-python/running_agents/) · [Anthropic task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets)

<!-- qard-id: 29510b5e-892b-49d6-9b58-c95c4a2ba3d4 -->
> [!qard]- In a long-running agent, how is compaction work split between deciding what context to keep and deciding when to compact?
> Compaction needs two separate decisions. The content decision, owned by context engineering, determines what the model still needs and what a summary must preserve. The timing decision, owned by loop engineering, determines when to compact, offload an artifact or stop. Compaction typically runs at a token threshold, before the next request would overflow the window.
> 
> | Decision | What it settles | Failure when it is neglected |
> |---|---|---|
> | Content (context engineering) | Which goals, decisions, open issues and references a summary keeps | The summary drops a constraint, and later turns proceed without it |
> | Timing (loop engineering) | When to summarize, when to move large artifacts to external storage behind lightweight references, and when to stop | The window overflows, and truncation removes old messages that may still matter |
> 
> Durable state sits outside both decisions. A plan or progress log stored by the application can be reread after compaction, which keeps a long run tied to its original goal. OpenAI Responses API compaction, for example, carries prior state forward as smaller, opaque compaction items. Plans and artifacts that the application must rely on remain application-managed.
> 
> This split is a convention for assigning responsibility, not a boundary defined by an API.
> 
> Source: [OpenAI: Compaction](https://developers.openai.com/api/docs/guides/compaction)

# References

- [Claude Agent SDK — overview (Anthropic)](https://platform.claude.com/docs/en/agent-sdk/overview)
