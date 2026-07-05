---
topic:
  - AI & ML
subtopic:
  - LLM
level:
  - "3"
priority: Low
status: Done
publish: true
---

# Intro

A multi-agentic system coordinates two or more LLM agents — each with its own context window, tools, and instructions — to solve a task that a single agent handles poorly. The [[Software Engineering/11 AI & ML/LLM/Agents/Agents|Agents]] page covers what agents are, the augmented LLM building block, the five workflow patterns (prompt chaining through orchestrator-workers), and autonomous agent design. This page covers what changes when multiple agents must coordinate: communication patterns, coordination structures, and the failure modes specific to multi-agent systems.

Multi-agent typically uses 3–10× more tokens than single-agent for equivalent tasks, driven by context duplication and coordination messages. That cost is justified under three specific conditions:

1. **Context pollution** — a subtask generates over 1,000 tokens of irrelevant context that degrades the main agent's reasoning quality.
2. **Parallelization** — independent work paths can run concurrently, and sequential execution is unacceptably slow.
3. **Specialization** — the agent has 20+ tools and selection accuracy drops, or the task requires conflicting behavioral modes (empathetic support vs. precise code review in the same session).

If none of these apply, a single well-prompted agent with good [[Software Engineering/11 AI & ML/LLM/Agents/Tools|tools]] outperforms multi-agent on cost, latency, and debuggability. Anthropic reports that teams have invested months building multi-agent architectures only to discover that improved prompting on a single agent achieved equivalent results.

The key design principle is **context-centric decomposition**: split agents along context boundaries, not problem boundaries. An agent handling a feature should also handle its tests — it already has the context. Only introduce a new agent when one genuinely cannot hold the relevant context in its window. Problem-centric splits (one agent writes code, another writes tests, a third reviews) force constant coordination and lose information at each handoff — a "telephone game" where fidelity drops with every transfer.

## Communication Patterns

Agents must share context to coordinate. Three mechanisms dominate production systems, each with a different fidelity-cost tradeoff.

**Full history passthrough.** The receiving agent gets the entire prior conversation. OpenAI Agents SDK does this by default on handoff. Simple to implement, but context grows unboundedly — after 10+ handoffs the receiving agent's window fills with irrelevant history, and reasoning quality degrades from "lost in the middle" effects.

**Scoped context (filtered handoff).** The orchestrator decides what each downstream agent needs and passes only that subset. Anthropic's Research system uses this: subagents write outputs to a filesystem store and pass lightweight references back to the coordinator, preventing information loss while keeping context compact. OpenAI's SDK provides `input_filter` callbacks and built-in filters like `remove_all_tools` (strips tool call history from handoff context). This is the production-recommended approach.

**Shared external state (blackboard).** A central store — vector database, Redis, filesystem — holds system state. Agents read and write independently without direct messaging. The blackboard pattern works best for non-linear problems where the step sequence is unknown upfront. Agents don't know about each other, only the shared state. The tradeoff: race conditions on concurrent writes and no built-in ordering guarantees.

## Multi-Agent Coordination

Beyond the [[Software Engineering/11 AI & ML/LLM/Agents/Agents#Workflow Patterns|workflow patterns]] — of which orchestrator-workers is the dominant multi-agent topology — multi-agent systems use three structural patterns for organizing agent interactions.

**Handoff / triage.** One active agent at a time. The current agent decides dynamically when to transfer control to a specialist. In Microsoft Agent Framework, `AgentWorkflowBuilder` declares a handoff routing graph where each agent receives transfer targets as tool definitions:

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

When an agent calls a handoff tool, control transfers with the conversation history. The routing decision is LLM-driven — each agent decides when to transfer based on its instructions, not a rule engine. Specialists can transfer back to triage if the issue is outside their scope.

**Group chat / debate.** Multiple agents in a shared conversation thread with a chat manager controlling turn order. When to use: consensus-building, brainstorming, compliance review. Keep to 3 or fewer agents — beyond that, coordination cost dominates.

**Swarm (peer-to-peer).** Agents communicate directly without central control. Each agent independently decides when and where to transfer. Rarely used in production — the lack of central coordination makes debugging and error recovery significantly harder. Most teams eventually add a supervisor.

## Pitfalls

### Context Loss at Handoffs

Information clear to Agent A gets compressed, omitted, or distorted when passed to Agent B. Sequential chains are worst — earlier messages get compressed at each hop, eroding fidelity progressively.

**Why it happens**: the "Goldilocks dilemma" — pass full context and instruction density drops (agent loses focus); summarize and edge cases vanish. Natural language handoffs lack schema enforcement, so semantic errors pass silently without raising runtime exceptions.

**Mitigation**: use the filesystem artifact pattern — agents write structured outputs to external storage and pass lightweight references. Define explicit output schemas for inter-agent communication. Validate agent output before passing to the next agent — reject low-confidence or malformed responses.

### Coordination Cost Explosion

Interaction complexity scales as n(n−1)/2: 2 agents = 1 interaction, 4 = 6, 10 = 45. A task costing $0.10 for a single agent may cost $1.50 for multi-agent after coordination overhead and context duplication. Multi-agent systems use roughly 15× more tokens than equivalent chat interactions.

**Why it happens**: every handoff duplicates context. Coordination messages consume tokens without advancing the task. A known anti-pattern is the "politeness loop" — two agents enter a cycle of thanking each other, burning tokens without advancing the task. Free-form conversation between agents has no built-in termination guarantee, and without `max_turns` caps these loops can run for hours before detection.

**Mitigation**: use structured output types between agents instead of free-form conversation. Set `max_turns` on every agent. Monitor per-run token usage and alert on outliers. Add agents only when you can demonstrate measurable improvement over fewer.

### Deadlocks and Infinite Loops

Circular dependencies — A waits on B, B waits on C, C waits on A — hang silently, burning budgets without crashing. Maker-checker loops without iteration caps refine indefinitely.

**Why it happens**: natural language coordination has no built-in timeout or deadlock detection. Unlike distributed systems with formal protocols, there is no heartbeat or lease mechanism by default.

**Mitigation**: lease-lock patterns with TTL on agent-to-agent waiting. Single orchestrator owning state transitions. Explicit iteration caps on every loop with fallback behavior — escalate to human or return best result with a quality warning. Circuit breaker patterns for agent dependencies.

### Cascading Errors

An error in one agent propagates through the system, amplified at each step. A hallucinated fact from Agent A becomes trusted input for Agent B, which builds further conclusions on it. If those conclusions reach persistent memory, they contaminate future runs.

**Why it happens**: semantic opacity — natural language errors pass as "valid" data. Agents trust upstream output by default, and there is no schema validation for factual correctness. Parallelization amplifies the problem — one faulty planning step spawns dozens of workers propagating the same error.

**Mitigation**: validate outputs at each agent boundary before passing downstream. Use independent verification agents for high-stakes decisions. Enforce guardrails at the infrastructure layer (network egress, filesystem permissions, execution budgets) rather than the prompt layer — agents can reason around app-level restrictions but cannot bypass environment-level enforcement.

## Tradeoffs

| Factor | Single Agent | Multi-Agent |
|---|---|---|
| Token cost | 1× baseline | 3–10× overhead |
| Latency | Sequential tool calls | Parallelizable, but coordination adds overhead |
| Debuggability | Single linear trace | Multiple interleaving traces |
| Context window | Limited by one window | Each agent gets a fresh window |
| Tool management | All tools loaded (degrades at 20+) | Specialized toolsets per agent |
| Failure surface | Agent-level only | Agent + coordination failures |

The "bitter lesson" of multi-agent: elaborate coordination architectures built to work around current model limitations risk obsolescence. A 10-agent system may be outperformed by a single next-generation model with a larger context window. Build multi-agent only when the coordination cost is justified by measurable improvement today — not as speculative architecture for tomorrow's problems.

## Questions

> [!QUESTION]- When is multi-agent coordination justified over a single agent with more tools?
> - Justified under three conditions: context pollution (subtask degrades main agent reasoning), parallelization (independent paths need concurrent execution), specialization (20+ tools degrade selection accuracy, or conflicting behavioral modes needed)
> - If none apply, single agent wins: 3–10× fewer tokens, lower latency, single linear trace for debugging
> - Many teams investing months in multi-agent discover equivalent results from better prompting on one agent
> - Key tradeoff: multi-agent buys context isolation and parallelism at the cost of coordination overhead and debugging complexity

> [!QUESTION]- Why does context-centric decomposition outperform problem-centric decomposition?
> - Problem-centric (code agent + test agent + review agent) forces constant coordination — each agent needs context from the others, creating lossy handoffs
> - Context-centric splits along natural context boundaries — agent handling a feature also handles its tests because it already has the context
> - Introduce a new agent only when context genuinely cannot fit in one window
> - Reduces handoff count, cuts token overhead, prevents compounding information loss at each transfer
> - Key tradeoff: context-centric may produce broader agents (more tools per agent), but avoids the "telephone game" of multi-hop handoffs

> [!QUESTION]- What makes multi-agent failures harder to diagnose than single-agent failures?
> - Semantic opacity: natural language errors pass as "valid" data between agents — no schema violations, no exceptions raised. A hallucinated fact from Agent A becomes trusted input for Agent B
> - Non-linear traces: multiple interleaving reasoning chains with handoffs instead of one sequential trace, making root cause analysis harder
> - Emergent behavior: agent interactions produce outcomes no single agent's instructions predict
> - Known anti-pattern: two agents entering a politeness loop, each thanking the other, consuming budget without task progress — correct behavior per agent, catastrophic in combination
> - Key tradeoff: multi-agent gains specialization but loses the single-trace debuggability that makes single-agent failures straightforward to fix

## References

- [Multi-Agent Research System — Engineering (Anthropic)](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents)
- [OpenAI Agents SDK — Handoffs](https://openai.github.io/openai-agents-python/handoffs/)
- [AI Agent Design Patterns — Orchestration (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [Microsoft Agent Framework — Workflows Documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/agent-framework/workflows/)
- [Why Multi-Agent Systems Fail (Galileo)](https://galileo.ai/blog/why-multi-agent-systems-fail)
- [OWASP Top 10 for LLM Applications — Agentic Security (OWASP)](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/)
- [MAS-FIRE: A Fault Injection Framework for Multi-Agent Systems (arxiv)](https://arxiv.org/abs/2602.19843)
