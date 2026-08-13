---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Coordinating multiple LLM agents, each with its own context and tools, on tasks one agent handles poorly."
level:
  - "3"
priority: Low
status: Done
publish: true
---

A multi-agent system gives separate LLM agents their own context and tools, then coordinates their work. [[Home/AI & ML/LLM/Agents/Agents|An individual agent]] already has its own tool loop, while [[Home/AI & ML/LLM/Agents/Workflow Patterns|workflow patterns]] arrange bounded calls under one control flow. Adding other agents creates a different problem: handoffs, shared state, and failures that cross several traces.

Anthropic reports that its multi-agent research system used about 15 times as many tokens as ordinary chat interactions. That number belongs to one workload. The general direction still matters: separate contexts and coordination messages are expensive. The cost can make sense when at least one of these conditions holds:

1. **Context isolation.** A large subtask would fill the main context with material the coordinator does not need.
2. **Parallel work.** Independent paths can run at the same time, and latency matters.
3. **Specialization.** One agent has too many similar tools or must follow instructions that conflict with another part of the task.

Without one of those pressures, a single agent with well-defined [[Tools]] is usually cheaper and easier to diagnose. Anthropic's engineering guidance recommends starting with the simplest design that meets the task and adding complexity only when it produces a measurable improvement.

The useful unit of decomposition is context. An agent that implements a feature often has enough local knowledge to test it as well. Splitting implementation and tests across agents creates another lossy handoff without buying context isolation. A new agent should own a bounded body of context that can be summarized back as an artifact or decision.

# Communication Patterns

Coordination depends on how much state crosses an agent boundary.

**Full history passthrough.** The receiving agent gets the prior conversation. OpenAI Agents SDK supports this default handoff behavior. It is easy to wire up, but every transfer carries more irrelevant history and weakens the receiving agent's focus.

**Scoped context.** The orchestrator passes only the material needed for the assigned task. Anthropic's Research subagents return condensed findings, while the lead persists its plan before context truncation. OpenAI's SDK offers `input_filter` callbacks, including filters that remove prior tool calls. This approach makes the handoff contract explicit.

**Shared external state.** Agents read and write a common store rather than talking directly. A filesystem, database, or queue can act as the blackboard. This works for non-linear tasks, but concurrent writes need ownership or version checks because the store provides no coordination by itself.

# Multi-Agent Coordination

The [[Home/AI & ML/LLM/Agents/Workflow Patterns|workflow patterns]] describe several ways to arrange these interactions. Three structures recur in multi-agent systems.

**Handoff or triage.** One agent is active. It can transfer control to a specialist, often through a handoff tool. Microsoft Agent Framework declares the allowed routing graph with `AgentWorkflowBuilder`:

```csharp
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Workflows;
using Microsoft.Extensions.AI;

// Create specialized agents from an IChatClient
ChatClientAgent triageAgent = new(chatClient,
    "Route customer issues to the appropriate specialist.",
    "triage_agent",
    "Routes to the right specialist");

ChatClientAgent statusAgent = new(chatClient,
    "Check order status. Transfer back to triage if not status-related.",
    "order_status_agent",
    "Handles order status queries");

ChatClientAgent refundAgent = new(chatClient,
    "Process refund requests. Transfer back to triage if not refund-related.",
    "refund_agent",
    "Handles refund requests");

// Declare the handoff routing graph
Workflow workflow = AgentWorkflowBuilder
    .CreateHandoffBuilderWith(triageAgent)
    .WithHandoffs(triageAgent, [statusAgent, refundAgent])
    .WithHandoffs([statusAgent, refundAgent], triageAgent)
    .Build();

// Execute the workflow
List<ChatMessage> messages =
    [new(ChatRole.User, "I need a refund for order 321 — item was damaged")];

Run result = await InProcessExecution.RunAsync(workflow, messages);
foreach (WorkflowEvent evt in result.NewEvents)
{
    if (evt is WorkflowOutputEvent output)
        Console.WriteLine($"Result: {output.Data}");
}
```

Calling a handoff tool transfers control along an allowed edge. The model chooses when to transfer, while the workflow restricts where it may go. A specialist can route the task back when it falls outside its scope.

**Group chat or debate.** Several agents share a thread while a manager controls turn order and termination. It can expose competing analyses, but each extra participant adds another history and another chance to repeat earlier work.

**Swarm.** Peers transfer work without a central owner. The topology is flexible, but no single trace explains the run and recovery becomes difficult. In practice, a supervisor often reappears because someone must own budgets and completion.

# Pitfalls

## Context Loss at Handoffs

Information can be omitted or distorted at a handoff. Sequential chains compound the loss because each agent summarizes a summary.

Passing the full history preserves detail but dilutes the assignment. A short summary protects focus but may erase an edge case. Natural-language handoffs also accept semantic mistakes without raising a schema error.

Durable artifacts reduce this tradeoff. The next agent receives a small assignment plus references to exact source material, and structured outputs can be validated before another agent depends on them.

## Coordination Cost Explosion

Potential pairwise relationships scale as n(n−1)/2. A task costing $0.10 for a single agent may cost $1.50 for multi-agent after coordination overhead and context duplication. The exact multiplier depends on the topology, but every handoff consumes tokens without directly completing the task.

Free-form conversations can also produce politeness loops in which agents acknowledge one another without changing shared state. Nothing in natural language guarantees termination.

Bound every conversation with `max_turns`, a token budget, and a completion signal the runtime can check. Structured results are preferable to open-ended messages when the receiver needs data rather than discussion.

## Deadlocks and Infinite Loops

Circular waits can hang without producing an error. Evaluator loops have a similar problem when the reviewer can always request one more revision.

Agent frameworks do not automatically provide the lease and timeout semantics expected in distributed coordination.

A central owner can make state transitions and enforce deadlines. Waiting on another agent needs a timeout, and every revision loop needs an iteration cap with a defined fallback.

## Cascading Errors

One agent's unsupported claim can become the next agent's premise. Once written to persistent state, the error may survive beyond the run that created it.

Schemas can validate shape, not truth. Parallel execution increases the blast radius when many workers consume the same faulty plan.

Validate at the boundary where an output becomes an input. High-stakes conclusions need independent evidence, and permissions should be enforced by the runtime so a propagated mistake cannot exceed its assigned scope.

# Tradeoffs

| Factor | Single Agent | Multi-Agent |
|---|---|---|
| Token cost | 1× baseline | Workload-dependent, usually much higher |
| Latency | Sequential tool calls | Parallelizable, but coordination adds overhead |
| Debuggability | Single linear trace | Multiple interleaving traces |
| Context window | Limited by one window | Each agent gets a fresh window |
| Tool management | Selection depends on model, schema quality, and eval results | Specialized toolsets per agent |
| Failure surface | Agent-level only | Agent + coordination failures |

Multi-agent architecture should solve a measured limit in the current system. If one model can hold the relevant context and choose the right tools, more agents mostly add messages and failure modes. The smallest team that produces a verified improvement is enough.

# Questions

> [!QUESTION]- When is multi-agent coordination justified over a single agent with more tools?
> It is justified when separate contexts protect reasoning quality, independent work materially reduces latency, or specialists need incompatible tools or instructions. The comparison should be empirical: the multi-agent design must improve a relevant quality or latency measure enough to pay for extra tokens and a harder trace.

> [!QUESTION]- Why does context-centric decomposition outperform problem-centric decomposition?
> Context-centric ownership keeps tightly related evidence and decisions in one working window. A problem-centric split often forces agents to reconstruct the same local context at every handoff. The benefit is fewer transfers and less information loss. The cost is a broader responsibility for each agent.

> [!QUESTION]- What makes multi-agent failures harder to diagnose than single-agent failures?
> The failure may cross several traces before it becomes visible. Natural language can carry a false claim while remaining structurally valid, and parallel workers can amplify the same bad premise. Diagnosis therefore needs handoff records, artifact provenance, and budgets tied to a run rather than isolated agent logs.

# References

- [Multi-Agent Research System — Engineering (Anthropic)](https://www.anthropic.com/engineering/multi-agent-research-system) — production account of coordinator-subagent architecture, token cost, parallel search, and persistent planning memory.
- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents) — practical guidance for choosing the simplest workflow that meets the task.
- [OpenAI Agents SDK — Handoffs](https://openai.github.io/openai-agents-python/handoffs/) — official handoff semantics and context-filtering hooks.
- [AI Agent Design Patterns — Orchestration (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) — official architecture guidance for sequential, concurrent, group-chat, handoff, and magentic orchestration.
- [Microsoft Agent Framework — Workflows Documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/agent-framework/workflows/) — official workflow model used by the handoff example.
- [Why Multi-Agent Systems Fail (Galileo)](https://galileo.ai/blog/why-multi-agent-systems-fail) — practitioner analysis of coordination and cascading-error failures.
- [OWASP Top 10 for LLM Applications — Agentic Security (OWASP)](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/) — security boundaries for excessive agency and unsafe downstream actions.
- [MAS-FIRE: A Fault Injection Framework for Multi-Agent Systems (arxiv)](https://arxiv.org/abs/2602.19843) — research framework for injecting and measuring failures across multi-agent interactions.
