# Week 03 — Agents, Tool Use, and MCP
> [!note] Back to [[Hackathon - Senior AI Engineering Training Plan]]

Previous: [[Hackathon - Senior AI Engineering Training Plan - Week 02 - Evaluation-First AI Engineering]] | Next: [[Hackathon - Senior AI Engineering Training Plan - Week 04 - .NET Runtime and Concurrency for AI Workloads]]

## Goal

Add one bounded workflow with tool use to the Support Copilot Platform. This is not an autonomy week. It is a workflow-design week where you deliberately keep control, permissions, and observability tighter than “agent” marketing language suggests.

## Weekly Outcome

By the end of the week, you should have one bounded support workflow that can decide between retrieval-only and tool-assisted handling, call one allowlisted tool safely, and log enough detail to explain every decision. You should also have a written tool contract and a clear justification for why the design stays workflow-first instead of turning into an open-ended agent loop.

## Task Checklist

- [ ] Choose one low-risk but useful support action, for example fetch ticket status, fetch support policy, or draft escalation summary.
- [ ] Write the tool contract before writing orchestration code.
- [ ] Define input schema, output schema, error states, and refusal states.
- [ ] Document the permission model, especially who is allowed to trigger the tool and with what parameters.
- [ ] Add request classification that chooses retrieval-only or tool-needed handling.
- [ ] Implement one allowlisted tool invocation path.
- [ ] Log tool selection, tool input, tool output, and final response.
- [ ] Add a safe fallback when the tool cannot be called or should not be called.
- [ ] Write 5 to 8 workflow test cases, including unsupported or unsafe requests.
- [ ] Save a short decision memo that explains why this remains a bounded workflow.

## Suggested Session Plan

### Session 1, choose the workflow

- Pick one support action that creates real value but has limited risk.
- Define the boundary of the workflow, what starts it, what it may do, and where it must stop.
- List unsafe cases that should never trigger the tool.

### Session 2, contract-first design

- Write the tool contract in plain language and in a machine-friendly shape.
- Define required parameters, optional parameters, and refusal reasons.
- Write sample inputs and outputs, including error responses.

### Session 3, orchestration path

- Add request classification.
- Route between retrieval-only and tool-assisted handling.
- Call the allowlisted tool.
- Return a grounded answer that makes the tool involvement visible.

### Session 4, observability and safeguards

- Add structured logs for workflow stage, tool decision, and tool result.
- Add explicit fallback behavior for unsafe, unsupported, or failed calls.
- Test that the system does not hide side effects behind polished wording.

### Session 5, MCP framing and review

- Document where MCP-style interfaces could help later.
- Explain which control points stay outside the model.
- Review whether the current design is still a workflow or has started to drift toward uncontrolled autonomy.

## Suggested Steps

### Step 1 — Pick one bounded action

- Fetch ticket status
- fetch support policy
- draft escalation summary

Choose something useful but low-risk.

### Step 2 — Define tool contracts

- Inputs
- outputs
- refusal or error states
- permission model
- audit/logging expectations

### Step 3 — Implement workflow orchestration

- classify request
- decide retrieval-only versus tool-needed path
- call one allowlisted tool if required
- return grounded final answer

## Implementation Tasks

Keep the implementation concrete and support-focused.

- Write a tool contract for one `Support Copilot Platform` action, including input validation rules, output shape, permission checks, timeout budget, and audit fields.
- Add request classification that decides whether the question can be answered from retrieved knowledge or needs a tool.
- Create a narrow tool adapter for one support action, for example ticket-status lookup or policy fetch.
- Add parameter validation before the tool call so the model cannot invent unsupported fields.
- Add a safe fallback response when the tool request is ambiguous, unsafe, or missing permissions.
- Log workflow stage transitions, the selected path, the tool request payload, the tool response summary, and the final user-visible answer.
- Write tests for at least one success path, one unsupported path, one permission failure, and one tool timeout or tool error path.
- Save a one-page memo that explains why you are using a bounded workflow now and where MCP could fit later.

## Deep Study

- Read [[Software Engineering/11 AI & ML/LLM/Agents/Agents|Agents]].
- Read [[Software Engineering/11 AI & ML/LLM/Agents/Model Context Protocol|Model Context Protocol]].
- Read [[Software Engineering/11 AI & ML/Tooling/Coding Agents|Coding Agents]].

## Resource Pack

### Internal notes

- [[Software Engineering/11 AI & ML/LLM/Agents/Agents|Agents]]
- [[Software Engineering/11 AI & ML/LLM/Agents/Model Context Protocol|Model Context Protocol]]
- [[Software Engineering/11 AI & ML/Tooling/Coding Agents|Coding Agents]]

### External docs

- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2025-03-26), primary source for MCP concepts, client and server responsibilities, and tool surface design.
- [Anthropic tool use overview](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview), practical guidance on tool schemas, tool calling flow, and safety boundaries.
- [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling), useful reference for structured tool definitions and controlled invocation patterns.

## Build Plan

- Implement one tool contract.
- Add request classification for tool eligibility.
- Log tool selection, input, output, and final answer.
- Add one explicit fallback path when tool invocation is unsafe or unsupported.

Concrete outputs for the week:

- tool contract spec
- workflow diagram
- bounded workflow implementation
- decision memo: workflow now, not agent loop

## System Design Drill

Describe the control points:

- where tool permissions are enforced
- where approvals would sit if mutations were introduced
- where MCP could help later
- why hidden side effects are unacceptable in support workflows

## DSA Plan

- Solve 1 queue or stack problem.
- Solve 1 state-machine or backtracking problem.
- Map those patterns to workflow branching and safe state transitions.

## Best Practices

- Design the tool contract first.
- Keep tool effects visible in logs.
- Allowlist tools and parameter shapes.
- Prefer one reliable flow over multiple partially-defined tools.
- Keep permission checks outside prompt wording, the service should enforce them directly.
- Make the final answer say when it used a tool, hidden automation erodes trust in support workflows.

## Common Mistakes

- Calling everything an agent.
- Allowing tools with fuzzy side effects.
- Hiding orchestration logic inside prompts.
- Adding multiple tools before one is trustworthy.

## Useful Links

- [[Software Engineering/11 AI & ML/LLM/Agents/Agents|Agents]]
- [[Software Engineering/11 AI & ML/LLM/Agents/Model Context Protocol|Model Context Protocol]]
- [[Software Engineering/11 AI & ML/Tooling/Coding Agents|Coding Agents]]
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2025-03-26)
- [Anthropic tool use overview](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview)

## Review and Checkpoint

Use these prompts at the end of the week:

- Can I explain why this workflow needs a tool at all, instead of only retrieval?
- Where exactly are permissions enforced, and could the model bypass them through prompt wording alone?
- If the tool fails, does the user get a safe, honest answer or a polished fiction?
- Are the logs sufficient to reconstruct what happened in one workflow run?
- Which part of the design is MCP-ready, and which part should remain product-specific service code?
- Did I build a bounded workflow, or did I quietly create an uncontrolled agent loop?

## Definition of Done

- One bounded support workflow works end to end.
- Tool boundaries are explicit.
- The system logs enough information to debug decisions.
- You can explain why this is a workflow-first design choice.
