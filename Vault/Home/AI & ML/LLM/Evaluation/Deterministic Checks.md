---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Executable checks that reject malformed or policy-violating output before semantic evaluation."
level:
  - "3"
priority: Medium
status: Done
publish: true
---

Deterministic checks turn explicit requirements into executable pass/fail rules. They validate structure, required fields, tool permissions, and other contracts without asking another model for an opinion. Run them before semantic scorers. There is no reason to pay for a judge when the output is malformed or an agent called a forbidden tool.

The boundary is simple: deterministic checks enforce properties that can be stated exactly. They cannot decide whether a valid action was the right action, whether an explanation is persuasive, or whether an answer captured the user's intent.

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

Run deterministic checks first. Malformed JSON and disallowed actions are hard failures.

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

Add deterministic business rules only where the expected behavior is explicit. Cases that require judgment should continue to a rubric scorer rather than hiding a semantic decision inside brittle string matching.

## Treating Deterministic Failures as Soft Warnings

A failed policy rule cannot be repaired by a favorable semantic score. If PII is detected or a disallowed action is invoked, the result fails even when the answer otherwise reads well.

Some scanners are heuristic, so their operational response may be quarantine or human review rather than automatic rejection. That choice belongs in the policy attached to the check.

## Forgetting to Check Tool Inputs, Not Just Outputs

Validating only the final response misses the actions that produced it. An agent can call `delete_record`, receive a successful result, and then return perfectly valid JSON.

Apply permission and argument checks at the tool boundary, before execution. Output validation comes later.

# Questions

> [!QUESTION]- What is the minimum useful set of deterministic checks for a tool-using agent?
> Start with the contracts that can prevent irreversible harm: tool permission, argument validation, and output schema. Add data-loss prevention, citation, rendering, or length rules only when the product contract requires them. Each rule needs an explicit failure policy.

# References

- [JSON Schema Core specification](https://json-schema.org/draft/2020-12/json-schema-core)
