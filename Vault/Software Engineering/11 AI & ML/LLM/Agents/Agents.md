---
topic:
  - AI & ML
subtopic:
  - LLM
tags:
  - FolderNote
dg-publish: true
status: Creation
priority: Medium
level:
  - '3'
---

# Intro

An AI agent can be thought of as an autonomous program that **observes** (through sensors or data input), **decides** (using some form of reasoning or inference), and **acts** (outputs or executes changes in its environment).

AI agents are essential when **complex** or **dynamic tasks** arise—situations where the environment may change, or the goal might shift over time.

They provide a way to **delegate** specialized tasks to autonomous systems, potentially saving human effort and ensuring faster or more efficient operations.

### Why Don’t We Use a Single Agent With All Possible Tools?

**Scope and Complexity**: One massive, monolithic agent with every tool tends to become too complex to maintain, or less specialized in each tool.

**Specialization**: In many areas of AI, specialized agents are often better at their narrower tasks (e.g., an agent that handles language translation vs. an agent optimized for image recognition).

**Scalability**: If one agent is overloaded with all the possible tasks and tools, you might run into scalability issues. Multi-agent setups can spread out the workload.

## Deeper Explanation

## Key elements

### Role playing

In AI, “role playing” refers to assigning each agent (or sub-agent) a specific role or persona to better organize tasks. Rather than having a single, general agent, you can split tasks among different roles. Each role (like “planner,” “critic,” or “executor”) can focus on its part and work together more coherently.

> [!TIP]
> When designing a system with multiple agents or sub-agents, **name and define each role** explicitly to avoid overlap.



### Focus

 “Focus” is the agent’s ability to stay on track, maintaining attention on a specific goal or sub-goal. Agents need to avoid distractions in complex environments. Focus helps them filter out irrelevant data and keep tasks aligned with the primary objectives.

> [!TIP]
> Align agent focus with well-defined objectives. The clearer the objective, the easier it is for the agent to stay on track.

### Tools

Tools are external resources or APIs the agent can use—such as language models, databases, web services, or even specialized hardware. Effective tool usage can greatly expand an agent’s capabilities. However, more tools mean more complexity.

> [!TIP]
> Before adding tools, ask: **Do we really need them?** Overly complex toolkits might introduce confusion or errors.
### Cooperation

Cooperation is how different agents or sub-agents collaborate, share information, and work together toward a unified goal. Multi-agent systems often require coordination to avoid conflicting efforts or redundant work. This can involve protocols for communication, conflict resolution, and shared decision-making.

> [!TIP]
> Agents need a way to share relevant data—be it messages, events, or shared state. A simple, consistent protocol will often suffice.

### Guardrails

Guardrails are constraints or safety measures put in place to prevent harmful or unintended behavior. AI agents may encounter ambiguous or open-ended tasks. Guardrailsrails ensure they operate within ethical, legal, or functional boundaries.

> [!TIP]
> Always define guiderails (e.g., limiting access to certain system functions) so that even if an agent makes a poor decision, it can’t cause serious harm.

### Memory

Memory allows an agent to store and recall information about past interactions, decisions, or states.

This is crucial for context continuity, learning from mistakes, and adapting to new situations. Memory can be short-term (working memory for immediate tasks) or long-term (archives of past interactions, results, user preferences).

> [!TIP]
> Consider use structured storage (like a database or key-value store) and define **how long** different pieces of information remain in memory.

## Practical Tips

- **Start Small**: If you are experimenting with AI agents, try building a single task-specific agent first. Once comfortable, you can expand to multiple agents.
- **Define Clear Roles**: For a multi-agent system, clarify each agent’s capabilities and boundaries. Overlapping tasks can cause confusion if not handled carefully.
- **Communication Protocols**: Ensure that agents can **communicate** effectively. In multi-agent systems, shared language or messaging formats are crucial for coordination.
- **Testing & Validation**: Multi-agent systems can exhibit unexpected “emergent” behaviors. Test systematically to ensure agents aren’t working at cross-purposes.
- **Iterate & Scale**: Start with a small system, learn from its interactions, then gradually add more agents or more complex behaviors.

## Questions

## Links

- https://devblogs.microsoft.com/semantic-kernel/using-azure-ai-agents-with-semantic-kernel-in-net-and-python/
- https://devblogs.microsoft.com/semantic-kernel/the-future-of-ai-customizing-ai-agents-with-the-semantic-kernel-agent-framework/

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Agents/Mental Framework|Mental Framework]]
> - [[Software Engineering/11 AI & ML/LLM/Agents/Model Context Protocol|Model Context Protocol]]
> - [[Software Engineering/11 AI & ML/LLM/Agents/Multi-Agentic Systems|Multi-Agentic Systems]]
> - [[Software Engineering/11 AI & ML/LLM/Agents/Tools|Tools]]
<!-- whats-next:end -->
