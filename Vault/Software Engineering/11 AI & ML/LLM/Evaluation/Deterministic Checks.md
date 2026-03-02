---
topic:
  - AI & ML
subtopic:
  - LLM
level:
  - "3"
priority: Medium
status: Done
dg-publish: true
---
# Intro

Deterministic checks are non-LLM tests that validate LLM outputs strictly: schema validity, required fields, safety rules, and tool/policy constraints. They are cheap (microseconds), deterministic (same input always gives same result), and should run on every evaluation before any LLM judge. They catch the obvious failures fast and cheaply, leaving expensive LLM-as-judge calls for semantic quality.

## Types of Deterministic Checks

| Check type | What it validates | Example |
|-----------|------------------|---------|
| **Schema validation** | Output is parseable and matches expected structure | JSON schema, required fields, no extra fields |
| **Allowlist enforcement** | Only permitted actions/tools are invoked | `action` must be one of `["search", "escalate"]` |
| **Citation rules** | Factual answers must cite sources | Response contains at least one `[source]` reference |
| **PII scanning** | No personal data in output | No email addresses, SSNs, phone numbers |
| **Injection-resistant formatting** | Output is safe to render | No `<script>` tags, no SQL injection patterns |
| **Length constraints** | Output is within expected bounds | Response is 10–500 characters |
| **Language/encoding** | Output is in the expected language and encoding | UTF-8, English only |

## Example — JSON Schema Contract

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

Any output that fails this schema is rejected immediately — no LLM judge needed.

## Where Deterministic Checks Fit in the Evaluation Pipeline

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

Run deterministic checks first. A malformed JSON or a disallowed action does not need a judge — it is a hard failure.

## Deterministic Checks vs LLM-as-Judge

| Aspect | Deterministic checks | LLM-as-judge |
|--------|---------------------|--------------|
| Speed | Microseconds | Seconds |
| Cost | Near zero | LLM API cost per call |
| Determinism | Always same result | Non-deterministic |
| What it measures | Format, structure, hard rules | Semantic quality, relevance, tone |
| False positive rate | Zero (rule-based) | Non-zero (LLM can misjudge) |
| Coverage | Only what you explicitly define | Open-ended quality dimensions |

**Use both.** Deterministic checks enforce hard constraints; LLM judges evaluate soft quality. Neither replaces the other.

## Pitfalls

### Over-Relying on Schema Validation Alone

**What goes wrong**: the team adds JSON schema validation and considers deterministic checks done. The output is structurally valid but semantically wrong — the `action` field is `"search"` when it should be `"escalate"`, and the schema allows both.

**Mitigation**: schema validation is necessary but not sufficient. Add allowlist checks (only permitted action values), citation rules (factual answers must cite sources), and PII scanning. Schema catches structure; business rules catch semantic violations.

### Treating Deterministic Failures as Soft Warnings

**What goes wrong**: a deterministic check fails (PII detected in output, disallowed action invoked) but the team logs it as a warning and continues. The LLM judge then evaluates the output and may pass it.

**Mitigation**: deterministic check failures are hard failures. Reject the output immediately. Do not pass it to the LLM judge. The pipeline order matters: deterministic checks first, LLM judge only on outputs that pass all hard rules.

### Forgetting to Check Tool Inputs, Not Just Outputs

**What goes wrong**: the team validates the final LLM response but not the tool calls the agent makes. The agent calls a `delete_record` tool that is not on the allowlist, and the check never fires because it only runs on the text response.

**Mitigation**: apply allowlist checks to every tool invocation, not just the final response. For agentic systems, each tool call is an action that needs validation.


## Questions

> [!QUESTION]- Can deterministic checks replace LLM judges?
> No. They enforce format and hard rules, but they do not measure semantic correctness, relevance, or tone. A response can pass all schema checks and still be factually wrong or unhelpful. Use deterministic checks as a fast pre-filter; use LLM judges for semantic quality.

> [!QUESTION]- What is the minimum useful set of deterministic checks for a tool-using agent?
> (1) Allowlisted tools/actions only, (2) strict output schema validation, (3) PII scanning on outputs, (4) injection-resistant formatting, (5) length constraints. These catch the most common failure modes cheaply before any expensive evaluation.

## References

- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) — the canonical list of LLM security risks including prompt injection, insecure output handling, and data leakage — each maps to a deterministic check category.
- [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) — specific mitigations for prompt injection, including input validation and output sanitization.
- [LLM-as-a-Judge (Zheng et al., 2023)](https://arxiv.org/abs/2306.05685) — the paper that established LLM-as-judge as an evaluation method; useful for understanding what deterministic checks cannot cover.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs|Golden Test Set and Regression Runs]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/LLM-as-a-Judge|LLM-as-a-Judge]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Online Evaluation and AB Tests|Online Evaluation and AB Tests]]
<!-- whats-next:end -->
