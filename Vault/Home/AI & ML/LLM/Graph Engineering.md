---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Designing an agentic system's execution topology, state transitions, and recovery boundaries."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

Graph engineering is an emerging name for designing an agentic system as an executable graph: which units perform work, which transitions are legal, what state crosses each boundary, and where execution can stop, pause, or recover. The label is new; the mechanics come from established workflow engines, state machines, and graph-processing runtimes.

This is an **execution graph**, not a knowledge graph. GraphRAG and graph databases model relationships in data. An execution graph models control flow: what runs next and under which condition.

A graph places model judgment inside an application-owned structure. Known rules remain deterministic edges or code. Semantic decisions can remain model-driven inside a node or routing function. This constrains the possible paths without pretending that model output is deterministic.

The boundary with adjacent disciplines is responsibility, not a rigid hierarchy. [[Home/AI & ML/LLM/Prompt Engineering/Prompt Engineering|Prompt Engineering]] shapes one model request. [[Home/AI & ML/LLM/Context Engineering/Context Engineering|Context Engineering]] shapes what a node's model can see. [[Home/AI & ML/LLM/Harness Engineering/Harness Engineering|Harness Engineering]] supplies tools, permissions, and runtime policy. [[Home/AI & ML/LLM/Loop Engineering/Loop Engineering|Loop Engineering]] controls progress, verification, budgets, and termination across repeated work. Graph engineering composes those units into a larger topology. A loop is one possible directed cycle inside that graph.

# The Graph Contract

An executable graph has three core parts:

- **Nodes do work.** A node can be ordinary code, a tool call, one model call, a complete agent loop, or a nested graph. A graph is not necessarily multi-agent.
- **Edges route work.** A fixed edge always selects the same successor. A conditional edge inspects an outcome or current state. Dynamic routing can create a runtime-dependent fan-out, while a terminal edge ends the run.
- **State records progress.** Nodes read a defined state and return updates. The schema determines what crosses boundaries, and merge rules determine how concurrent updates combine.

![[Assets/Excalidraw/Graph Engineering.excalidraw|900|center]]

This topology fixes the high-level contract: research precedes writing, review is mandatory, and only an accepted draft may publish. The nodes can still contain different kinds of work. Research might be an agent with search tools, writing a single model call, review deterministic checks plus a model evaluator, and publishing ordinary code behind an authorization gate.

The same shapes recur across [[Home/AI & ML/LLM/Agents/Workflow Patterns|Workflow Patterns]]: sequences, routing, parallel branches, orchestrator-workers, and evaluator-optimizer loops. Graph engineering turns one of those shapes into explicit state, transition, synchronization, and recovery contracts.

## State and Merging

State is more than the conversation history. It may contain the request, gathered evidence, intermediate artifacts, validation results, retry counts, approvals, and the version of the workflow that owns the run. Model context is a projection of that state, not the whole state.

Each field needs an update rule. A scalar status may use last-write-wins. Parallel researchers may append findings. A reviewer verdict may replace an earlier verdict but must not silently erase the draft it evaluated. Frameworks express these rules differently: LangGraph uses reducers on state fields, while Microsoft Agent Framework exposes private and shared workflow state with superstep-based visibility. The portable requirement is explicit ownership, merge behavior, and visibility timing.

Keep transient dependencies such as model clients and database connections outside serialized state. Separate checkpointed run state from long-term memory shared across runs. Conflating them makes retention, privacy, and recovery behavior difficult to reason about.

# Execution and Recovery

Arrows describe topology, but the runtime decides when work becomes runnable and when its updates become visible.

LangGraph and Microsoft Agent Framework both document Pregel-inspired **supersteps**. Nodes or executors triggered in the same superstep run concurrently. A synchronization barrier waits for that group before the next superstep begins, then routes the resulting messages and state updates. This produces stable checkpoint boundaries and a consistent view of state, but a slow parallel branch can delay later work. Other graph runtimes may use different scheduling semantics; bulk-synchronous execution is a framework choice, not a property of graphs in general.

Cycles need the same safeguards as any [[Home/AI & ML/LLM/Loop Engineering/Agent Loop|Agent Loop]]: a checkable exit condition, an iteration or cost limit, an unrecoverable-error path, and an explicit result when the budget is exhausted. Drawing a back edge does not solve termination.

## Checkpoints and Human Input

A checkpoint persists enough execution state to resume a run after a failure or interruption. It enables long-running work, inspection, time-travel debugging, and human approval before a consequential action. It also changes the programming model.

When checkpointing is configured, the graph runtimes in LangGraph and Microsoft Agent Framework capture state at superstep boundaries. Recovery after a process restart also requires a durable checkpoint backend; in-memory storage survives only the current process. If execution stops inside work that was not committed, resuming may run that work again. Side effects therefore need idempotency keys, upserts, or a read-before-write check. Sending an email, charging a card, or publishing a document cannot rely on the checkpoint to provide exactly-once behavior.

Human-in-the-loop control also needs a real resume protocol. The runtime persists state, records the pending request, waits without holding the model call open, validates the response, and resumes from an authorized continuation. An instruction such as “ask before publishing” is not equivalent to an interrupt enforced by the runtime.

Checkpoint storage is a trust boundary because it may contain prompts, tool results, approvals, and intermediate artifacts. Live runs also make graph changes a migration problem: renaming a node or changing a state field can strand an execution paused under the old definition.

# When a Graph Earns Its Cost

An explicit graph is useful when the work has structure worth enforcing:

- the allowed paths and approval gates must be inspectable or auditable;
- stages need different models, tools, permissions, or failure policies;
- independent work must fan out and later join;
- retry, revision, escalation, or human-review cycles need explicit bounds;
- a long-running process must pause, checkpoint, and recover;
- node or subgraph boundaries materially improve isolation and testing.

Ordinary code or one agent loop is usually better when the flow is a short sequence, a simple `if`, or one coherent task with a clear verifier. Open-ended research is another warning sign: if useful next steps cannot be anticipated, forcing them into many predefined nodes can make the graph fight the agent. Anthropic's practical distinction is useful here: workflows follow predefined code paths, while agents choose their own process. A system can use both by fixing policy-critical transitions and leaving discovery inside an agent node.

Complexity should be paid for by a real boundary. A node that adds no distinct tools, policy, parallelism, state ownership, recovery behavior, or test surface is probably just a function wearing a box in a diagram.

# Testing the Graph

Graph tests separate structural correctness from model quality:

1. **Validate topology.** Check reachability, input/output type compatibility, duplicate or missing edges, bounded cycles, and at least one legal terminal path.
2. **Test nodes and guards.** Keep routers, merge functions, policy gates, and deterministic transforms independently testable.
3. **Exercise paths and recovery.** Cover acceptance, rejection, fan-out/fan-in, timeout, retry exhaustion, interruption, resume, and repeated side effects.
4. **Evaluate stochastic behavior.** Measure final outputs, individual model decisions, and the path across nodes on a representative dataset. [[Home/AI & ML/LLM/Agents/Evaluation/Trajectory Evaluation|Trajectory Evaluation]] covers the last case.

Exact-path assertions fit compliance workflows where only one route is valid. Agentic work may have several correct routes, so tests should often check invariants: required evidence was gathered, a dangerous action passed approval, the retry budget held, and the terminal artifact passed its evaluator.

Production traces need node identity, edge decisions, state and workflow versions, latency, errors, retries, and checkpoint events. Sensitive state still follows the system's logging and retention policy; observability is not permission to record every prompt or tool result.

# Questions

> [!QUESTION]- What does graph engineering add beyond loop engineering and workflow patterns?
> Loop engineering controls progress, verification, budgets, and termination across repeated work. Workflow patterns name reusable shapes such as routing or evaluator-optimizer. Graph engineering makes the chosen shape executable by defining nodes, legal transitions, shared state, merge rules, scheduling assumptions, checkpoints, and recovery behavior. A loop can remain inside one node or appear as a cycle across several nodes.

> [!QUESTION]- Why does an explicit graph not make an agentic system deterministic?
> Fixed edges constrain which paths are legal, and deterministic guards can make some transitions reproducible. Nodes may still contain model calls, external APIs, mutable data, or concurrent work whose results vary. The graph makes control flow more inspectable; it does not guarantee the quality or repeatability of the work inside each node.

> [!QUESTION]- Why does checkpointing require idempotent node design?
> A runtime normally checkpoints at a step boundary rather than after every instruction inside a node. If a process stops after performing a side effect but before committing the checkpoint, resume can execute that side effect again. Idempotency keys, upserts, or read-before-write checks make re-execution safe; a checkpoint alone does not provide exactly-once delivery.

# References

- [3 Years of Graph Engineering with LangGraph](https://www.langchain.com/blog/3-years-of-graph-engineering-with-langgraph)
- [Graph Engineering Guide (2026)](https://www.aibuilderclub.com/blog/graph-engineering-guide-2026)
- [LangGraph Graph API overview](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [Microsoft Agent Framework workflow concepts](https://learn.microsoft.com/en-us/agent-framework/concepts/workflows/)
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [State Chart XML (SCXML): State Machine Notation for Control Abstraction](https://www.w3.org/TR/scxml/)
- [Pregel: a system for large-scale graph processing](https://research.google/pubs/pregel-a-system-for-large-scale-graph-processing/)
