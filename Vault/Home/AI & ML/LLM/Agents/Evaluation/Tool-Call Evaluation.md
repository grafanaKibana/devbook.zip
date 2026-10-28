---
topic: [AI & ML]
subtopic: [LLM]
summary: "Scoring each agent tool call on four axes: right tool, correct arguments, valid call, and necessity."
level: ["3"]
priority: High
status: Done
publish: true
qard-deck: "AI & ML"
qard-topic: "LLM/Agents/Evaluation/Tool-Call Evaluation"
flashcard_uid: "1d83d54c"
---

A tool call is where an agent stops describing an action and asks a system to perform it. Failures at this boundary are concrete: the agent can name the wrong tool, send the wrong value in valid JSON, invent a function, or repeat a call that changed nothing.

Four properties are scored separately: validity, selection, arguments, and necessity. A combined "tool accuracy" number hides which decision failed. Separate scores suggest where to investigate: selection failures point toward routing or tool descriptions, and argument failures toward weak grounding or an unsafe schema. These are leads, not proven root causes.

This is the detailed version of tool-call correctness in [[Home/AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]]. A [[Deterministic Checks|deterministic check]] handles structure. An [[LLM-as-a-Judge|LLM judge]] or labeled reference handles decisions whose meaning depends on conversation state.

# What a Tool Call Can Get Wrong

```mermaid
flowchart TD
    S[Tool call] --> V[Valid?]
    V -->|malformed / unknown tool / wrong arity| F1[Invalid call]
    V -->|schema-valid| SEL[Right tool for this step?]
    SEL -->|wrong tool / no call when needed / call when none needed| F2[Selection error]
    SEL -->|correct tool| ARG[Arguments correct?]
    ARG -->|schema-valid but wrong values| F3[Argument error]
    ARG -->|correct| NEC[Necessary?]
    NEC -->|duplicate / no progress| F4[Redundant call]
    NEC -->|advances task| OK[Good call]
```

- **Validity** asks whether the tool exists and whether its arguments parse against the schema. This check is deterministic and can run before execution.
- **Selection** asks whether the current state calls for this tool. It covers both needless calls and the opposite failure: answering from memory when fresh state was required.
- **Arguments** checks meaning after structure has passed. `{"order_id": "4851"}` is valid JSON even when the conversation identifies order `4815`. Time zones and dropped search constraints fail the same way.
- **Necessity** checks whether the call advances the task. Repeating the same read against unchanged state raises cost and often marks the start of a loop.

# Metrics

| Metric | What it measures | Scorer |
| --- | --- | --- |
| Invalid-call rate | Fraction of calls that are malformed, unknown, or schema-invalid | Deterministic |
| Tool-selection accuracy | Right tool chosen for the step (incl. correctly choosing *no* call) | Reference or judge |
| Argument match | Arguments equal the expected values — exact for ids/enums, semantic for free text | Reference (exact) + judge (semantic) |
| Redundant-call rate | Duplicate or no-progress calls per task | Deterministic (hash of tool+args) + judge |
| Calls-per-task | Total calls vs the minimum a clean solve needs | Counter |

Selection and argument accuracy are scored separately. If selection is 95% and argument accuracy is 70%, argument handling is the first area to investigate. Averaging them to 82.5% destroys that diagnosis.

# Ground Truth

Reference-based evaluation stores the expected `(tool, arguments)` for a step. Tool equality scores selection. Field comparison scores the arguments. Successful human or agent traces are usually better raw material than hand-written cases. This is the trace equivalent of deriving [[Retrieval Evaluation Sets|retrieval eval sets]] from known source evidence.

Reference-free evaluation starts with schema validation and exact-duplicate detection. A judge then reads the conversation and tool catalog to score selection or necessity. This works before labeled traces exist, but it is weak at catching a plausible value that differs from the real target by one digit.

# Example

Per-call scoring for one step of a support agent:

```text
State: user asked "refund my order, it arrived broken" (order #4815 in context)
Agent call: issue_refund(order_id="4851", amount="full")

- Valid:      yes (schema-valid, real tool)            [deterministic: PASS]
- Selection:  issue_refund is correct here             [reference: PASS]
- Arguments:  order_id 4851 != expected 4815           [reference: FAIL]
- Necessary:  refund operation needed, not a repeat    [PASS]

Verdict: schema-valid call, wrong target order — the failure deterministic
checks cannot see. Caught only because the reference pinned order_id=4815.
```

# Tradeoffs

| Scorer | Catches | Cost | Blind to |
| --- | --- | --- | --- |
| Deterministic checks | Malformed calls and unknown tools via schema validation; exact duplicates via comparison with earlier calls | Lowest — runs pre-execution | Semantically wrong arguments, wrong tool choice |
| Reference match | Wrong tool, wrong argument values | Medium — needs labeled traces | Valid alternate tools/paths the reference didn't list |
| LLM judge | Tool-choice reasonableness, necessity, semantic args | Highest — a judge call per step, plus judge bias | Subtle value errors a reference would pin exactly |

Deterministic validity checks fit every call: they are cheap and can block malformed requests before execution. Reference matching fits tools where a wrong value is expensive, such as payments or deletion. A judge fits open-ended selection and necessity decisions, provided its scores are calibrated against human labels. Otherwise it may reward a longer trace simply because the trace looks more thorough.

# Pitfalls

## Exact Argument Match Flags Semantically-equal Values

String equality marks `"refund the full amount"` wrong against `"full refund"`, even though the action is identical. Exact matching belongs on identifiers, enums, and booleans. Natural-language fields need normalization or a semantic scorer.

## Order-sensitive Scoring Punishes Valid Reorderings

An exact reference sequence penalizes harmless reordering of independent reads. Comparing those calls as a set avoids that penalty. Order becomes part of correctness only when one call establishes a precondition for the next, such as looking up an order before issuing its refund.

## Schema-valid Hides Semantically Wrong

The riskiest call may be perfectly valid: real tool, valid schema, wrong account. Structural checks should be paired with reference or semantic argument checks. Irreversible actions also need confirmation or a dry run at the execution boundary.

# Questions

<!-- qard-id: 23f9e773-456c-4f3f-b85a-96dcd927918e -->
> [!qard]- Why should tool selection and argument accuracy be measured separately?
> Because they score different decisions that fail for different reasons. Tool selection asks whether the agent called the right tool for the current step, including recognizing when no call is needed. Argument accuracy asks whether a correctly chosen tool received the right values.
>
> A combined score hides which decision failed. For example, 95% selection accuracy and 70% argument accuracy average to 82.5%, and that single number no longer shows that arguments are the weak point. Separate scores point an investigation in a direction:
>
> - **Selection failures** often suggest unclear tool descriptions or a routing problem.
> - **Argument failures** often suggest weak grounding in the conversation or a loosely constrained schema. A call can name the right tool in schema-valid form and still send order `4851` when the conversation identifies order `4815`.
> 
> These patterns are leads to investigate, not proof of the root cause.
>
> How argument accuracy is scored also depends on the field. Exact matching fits identifiers, enums and booleans with one defined value. Free-text fields need normalization or a semantic check, which is valid only where the tool contract accepts equivalent wording.
>
> [Berkeley Function Calling Leaderboard](https://gorilla.cs.berkeley.edu/blogs/8_berkeley_function_calling_leaderboard.html)

# References

- [Berkeley Function-Calling Leaderboard -- AST and executable accuracy for tool/function calls, including irrelevance detection (Gorilla, UC Berkeley)](https://gorilla.cs.berkeley.edu/blogs/8_berkeley_function_calling_leaderboard.html)
- [Tool use (function calling) overview (Anthropic Docs)](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
