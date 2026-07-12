---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Systems where an LLM controls part of the workflow, calling tools, making decisions, or directing other LLMs."
tags:
  - FolderNote
publish: true
level:
  - '3'
status: Done
priority: High
---

# Intro

An agentic system is any system where an LLM controls part of the workflow — calling tools, making decisions, or directing other LLMs. The term "agent" gets used loosely, but there is a practical distinction that matters for system design:

- **Workflows** are systems where LLMs and tools are orchestrated through predefined code paths. The developer controls the sequence; the LLM handles individual steps.
- **Agents** are systems where the LLM dynamically directs its own process and tool usage, deciding what to do next based on results so far.

Most production systems that people call "agents" are actually workflows — and that is the right choice. The most effective agentic systems use the simplest pattern that solves the problem. Start with a single LLM call with good prompting and retrieval. Add workflow orchestration when that falls short. Reach for autonomous agents only when the task is genuinely open-ended and unpredictable.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## The Augmented LLM

The building block of every agentic system is an LLM enhanced with retrieval, [[Tools]], and memory. The model generates its own search queries, selects appropriate tools, and decides what information to retain. Before building multi-step systems, invest in making this single building block work well — choose the right model, tune the prompts, and ensure tools have clear, well-documented interfaces.

[[Model Context Protocol|Model Context Protocol (MCP)]] standardizes how an augmented LLM connects to external tools and data sources.

## Workflow Patterns

Five workflow patterns cover the spectrum from simple single-LLM orchestration to dynamic multi-LLM coordination. They form a progression of increasing complexity — start with the simplest pattern that solves the problem.

### Prompt Chaining

```mermaid
flowchart LR
    In[Input] --> S1[Step 1 LLM] --> G1{Gate} --> S2[Step 2 LLM] --> G2{Gate} --> Out[Output]
```

Break a task into sequential steps where each LLM call processes the output of the previous one. Add programmatic checks (gates) between steps to verify the process stays on track.

When to use: tasks that decompose cleanly into fixed subtasks. Example: generate marketing copy then translate it, or write an outline, validate it meets criteria, then write the document.

### Routing

```mermaid
flowchart TD
    In[Input] --> R[Router LLM]
    R --> P1[Prompt or Model A]
    R --> P2[Prompt or Model B]
    R --> P3[Prompt or Model C]
```

Classify the input and direct it to a specialized prompt or model. This lets you optimize each downstream path independently — a change to handle refund requests will not degrade general question answering.

When to use: distinct input categories that need different handling. Example: route customer queries to a small fast model for general questions, a larger model for complex technical issues, a constrained workflow for refund requests.

### Parallelization

```mermaid
flowchart TD
    In[Input] --> A[LLM Call A] & B[LLM Call B] & C[LLM Call C]
    A --> Agg[Aggregator]
    B --> Agg
    C --> Agg
    Agg --> Out[Output]
```

Run multiple LLMs simultaneously and aggregate results. Two variants: **sectioning** splits independent subtasks across parallel calls; **voting** runs the same task through multiple calls for higher confidence.

When to use: independent subtasks that benefit from speed, or tasks where multiple perspectives improve reliability — running guardrails in parallel with the main response, multi-aspect code review, content moderation with vote thresholds.

### Orchestrator-Workers

```mermaid
flowchart TD
    In[Input] --> O[Orchestrator LLM]
    O --> W1[Worker 1] & W2[Worker 2] & W3[Worker 3]
    W1 --> S[Synthesize]
    W2 --> S
    W3 --> S
    S --> Out[Output]
```

A central LLM dynamically decomposes the task, delegates subtasks to worker LLMs, and synthesizes results. The subtasks are not predefined — the orchestrator determines them based on the input. Topologically similar to parallelization, but the key difference is flexibility: workers and their tasks are determined at runtime. Anthropic's Research system uses this pattern — a lead agent spawning 3–5 subagents in parallel — and reports a 90.2% improvement over single-agent on their internal research eval. The dominant production pattern for complex coding and research tasks, and the bridge into [[Multi-Agentic Systems]].

### Evaluator-Optimizer

```mermaid
flowchart TD
    In[Input] --> G[Generator LLM]
    G --> D[Draft]
    D --> E[Evaluator LLM]
    E -->|Revise| G
    E -->|Accepted| Out[Final Output]
```

One LLM generates a response; another evaluates it against criteria and provides feedback. The loop continues until the evaluator approves or an iteration cap is hit. Two indicators of good fit: LLM responses demonstrably improve when given human-like feedback, and the LLM can provide such feedback.

When to use: tasks with clear evaluation criteria — literary translation with nuance, complex search requiring multiple rounds, code review, compliance checking.

## Autonomous Agents

When the task is genuinely open-ended — you cannot predict the number of steps, and no fixed workflow covers the problem — use an autonomous agent. An agent is an LLM using tools in a loop: observe results, decide next action, execute, repeat.

```mermaid
flowchart TD
    H[Human task] --> A[Agent plans next step]
    A --> T[Execute tool or action]
    T --> E[Observe result]
    E --> C{Task complete?}
    C -->|No| A
    C -->|Yes| R[Return result to human]
    E -->|Blocked| HI[Ask human for input]
    HI --> A
```

Agents are powerful but come with higher costs and compounding error risk. Each step that goes slightly wrong can push the agent further off track. Three principles from production experience:

1. **Simplicity** — keep the design minimal. Complex agents are harder to debug and more prone to cascading failures.
2. **Transparency** — show the agent's planning and reasoning steps explicitly. When something fails, you need to see where and why.
3. **Tool quality** — invest as much effort in tool interfaces (documentation, error messages, parameter design) as in prompts. Think of it as designing an API for a junior developer — if the tool is ambiguous to use, the agent will misuse it.

Where agents work well today: coding tasks (verifiable via tests), customer support (measurable via resolution), and research tasks (structured by sources). The common thread is clear success criteria and feedback loops that let the agent assess its own progress. Measuring those criteria rigorously — task success, trajectory quality, tool-call correctness, and reliability across stochastic runs — is [[Home/AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]].

For patterns on coordinating multiple agents, see [[Multi-Agentic Systems]].

## Questions

> [!QUESTION]- When should you use a workflow instead of an autonomous agent?
> - Use a workflow when the task decomposes into predictable steps with clear inputs and outputs at each stage
> - Workflows are cheaper, faster, and more debuggable than autonomous agents
> - Use an autonomous agent only when steps are unpredictable, the task is open-ended, and you have feedback mechanisms (tests, eval criteria) to catch errors
> - Most production "agents" are actually workflows — and that is the right choice for the majority of use cases
> - Key tradeoff: workflows trade flexibility for reliability; agents trade reliability for adaptability

> [!QUESTION]- Why do autonomous agents accumulate error, and how do you bound it?
> Each step an agent takes is conditioned on the output of the last one, so a small early mistake — a misread tool result, a wrong assumption — gets carried forward and compounds, pushing the agent further off track with every loop. That compounding is the main reason to prefer a workflow when you can: fixed code paths don't drift. When you do need autonomy, you bound the damage with hard iteration caps, explicit gates that validate progress before continuing, transparency into the planning steps so you can see where it went wrong, and a human-in-the-loop escape hatch when the agent is blocked. The throughline is feedback: the agent needs a way to catch its own drift before it cascades.

> [!QUESTION]- What makes a task a good fit for an autonomous agent?
> Two things together: the task is genuinely open-ended — you can't predict the number of steps or write a fixed workflow for it — and it has a clear, checkable success signal the agent can use to judge its own progress. That's why coding works (tests pass or fail), customer support works (the issue is resolved or not), and research works (claims trace back to sources). Tasks with vague or delayed success criteria are where agents flail, because there's no feedback to correct the compounding error. If you can't define what "done" and "correct" look like in a way the system can check, the task isn't ready for an agent yet.

## References

- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents) — the source of the workflow-pattern taxonomy and the "simplest pattern that works" principle.
- [Patterns for Basic Agent Workflows — cookbook (Anthropic)](https://platform.claude.com/cookbook/patterns-agents-basic-workflows) — runnable implementations of chaining, routing, and parallelization.
- [Multi-Agent Research System — Engineering (Anthropic)](https://www.anthropic.com/engineering/multi-agent-research-system) — production orchestrator-workers system, including the 90.2% single-agent comparison.
- [Claude Agent SDK — overview and patterns (Anthropic)](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Microsoft Agent Framework — Overview (Microsoft Learn)](https://learn.microsoft.com/en-us/agent-framework/overview/)
- [Semantic Kernel to Agent Framework Migration Guide (Microsoft)](https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-semantic-kernel/)
