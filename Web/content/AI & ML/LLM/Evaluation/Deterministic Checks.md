---
publish: true
created: 2026-10-21T13:29:32.425Z
modified: 2026-10-21T13:29:32.425Z
published: 2026-10-21T13:29:32.425Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Executable checks that reject malformed or policy-violating output before semantic evaluation.
level:
  - "3"
priority: Medium
status: Done
qard-deck: AI & ML
qard-topic: LLM/Evaluation/Deterministic Checks
flashcard_uid: 29dd80f1
---

Deterministic checks turn explicit requirements into executable pass/fail rules. They validate structure, required fields, tool permissions, and other contracts without asking another model for an opinion. They run before semantic scorers, so no judge call is paid for when the output is malformed or an agent called a forbidden tool.

The boundary is simple: deterministic checks enforce properties that can be stated exactly. They can judge correctness only where an explicit rule encodes it. Without such a rule, they cannot decide whether a valid action was the right action, whether an explanation is persuasive, or whether an answer captured the user's intent.

# Types of Deterministic Checks

| Check type | What it validates | Example |
|-----------|------------------|---------|
| **Schema validation** | Output is parseable and matches expected structure | JSON schema, required fields, no extra fields |
| **Allowlist enforcement** | Only permitted actions/tools are invoked | `action` must be one of `["search", "escalate"]` |
| **Citation rules** | Factual answers must cite sources | Response contains at least one `[source]` reference |
| **PII scanning** | Known personal-data patterns are blocked or flagged | Email, account, and phone-number detectors |
| **Safe rendering** | Output cannot introduce active content | Escaped HTML and an allowlist for permitted elements |
| **Length constraints** | Output is within expected bounds | Response is 10–500 characters |
| **Language/encoding** | Output is in the expected language and encoding | UTF-8, English only |

# Example — JSON Schema Contract

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "action": {"type": "string", "enum": ["search", "escalate"]},
    "reason": {"type": "string", "minLength": 1},
    "citations": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["action", "reason"]
}
```

An output that fails this schema is rejected immediately. No judge is needed.

# Where Deterministic Checks Fit in the Evaluation Pipeline

```text
LLM Output
    │
    ▼
[1] Deterministic checks  ← fast, cheap, run first
    │ FAIL → reject immediately
    │ PASS
    ▼
[2] LLM-as-judge          ← slow, expensive, run only on valid outputs
    │ FAIL → flag for review
    │ PASS
    ▼
[3] Human review          ← for high-stakes or ambiguous cases
```

Deterministic checks run first because malformed JSON and disallowed actions are hard failures.

# Deterministic Checks Vs LLM-as-Judge

| Aspect | Deterministic checks | LLM-as-judge |
|--------|---------------------|--------------|
| Speed | Usually local and fast | Usually a model call |
| Cost | Compute for parsing or scanning | Model inference per judgment |
| Repeatability | Stable for the same rule and input | Can vary by model and sampling settings |
| What it measures | Format, structure, hard rules | Semantic quality, relevance, tone |
| Error boundary | Exact for schema and allowlist rules. Heuristic scanners can misclassify | Judge can misread the rubric or candidate |
| Coverage | Only explicitly defined properties | Open-ended quality dimensions |

The two layers solve different problems. Hard contracts belong in code. Semantic quality belongs in a calibrated judge or human review.

# Pitfalls

## Over-Relying on Schema Validation Alone

Schema validation can pass an output that is semantically wrong. The `action` field may contain `"search"` even when the case required `"escalate"`. Both values are valid under the contract.

Deterministic business rules fit only where the expected behavior is explicit. Cases that require judgment belong with a rubric scorer, since brittle string matching would hide a semantic decision.

## Treating Deterministic Failures as Soft Warnings

A failed policy rule cannot be repaired by a favorable semantic score. If PII is detected or a disallowed action is invoked, the result fails even when the answer otherwise reads well.

Some scanners are heuristic, so their operational response may be quarantine or human review rather than automatic rejection. That choice belongs in the policy attached to the check.

## Forgetting to Check Tool Inputs, Not Just Outputs

Validating only the final response misses the actions that produced it. An agent can call `delete_record`, receive a successful result, and then return perfectly valid JSON.

Permission and argument checks belong at the tool boundary, before execution. Output validation comes later.

# Questions

<!-- qard-id: a37f0da1-2f80-49e2-90ed-6c7ef87f195f -->

> [!qard]- Which deterministic checks should run before and after a tool-using agent calls a tool?
> Before a tool runs, deterministic checks confirm that the caller is allowed to perform the requested action and validate the arguments against the tool's contract. After the call, they validate any returned data against the schema the next step expects.
>
> - **Before execution:** a permission or allowlist rule rejects an action the caller may not take. Argument validation rejects missing, malformed or out-of-range inputs. These checks must come first because later validation cannot undo a side effect: an agent can call `delete_record`, receive a success result and still return perfectly valid JSON.
> - **After execution:** result validation stops malformed or unexpected data from reaching the next step.
>
> A strict function schema constrains the shape of arguments. Schema validity neither authorizes the action nor shows that it was the right action. A schema-valid request can still choose the wrong permitted action, such as `search` when the case required `escalate`. The product's risks determine which further checks are needed and whether a failure is rejected outright or routed to review.
>
> Sources: [OpenAI: Function calling](https://developers.openai.com/api/docs/guides/function-calling) · [OWASP: LLM06 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) · [JSON Schema Core](https://json-schema.org/draft/2020-12/json-schema-core)

# References

- [JSON Schema Core specification](https://json-schema.org/draft/2020-12/json-schema-core)
