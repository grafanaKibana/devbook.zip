---
topic:
  - AI & ML
subtopic:
  - LLM
level:
  - "3"
priority: Medium
status:
  - Done
dg-publish: true
---

# Intro

Deterministic checks are non-LLM tests that validate outputs strictly: schema validity, required fields, safety rules, and tool/policy constraints. They are cheap, fast, and should run on every evaluation.

## Deeper Explanation

Typical deterministic checks:

- JSON/schema validation (parseable, required fields, no extras)
- Allowed actions only (tool allowlist, no unsafe operations)
- Citation rules (must cite sources for factual answers)
- PII and secrets scanning (block or redact)
- Output encoding and injection-resistant formatting (avoid unsafe HTML/SQL)

Where they fit:

- Run before any judge (fail fast).
- Combine with scorecards/judges for semantic quality.

## Example

JSON Schema contract for a tool-using assistant (reject invalid outputs):

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "action": {"type": "string", "enum": ["search", "escalate"]},
    "reason": {"type": "string", "minLength": 1}
  },
  "required": ["action", "reason"]
}
```

## Questions

> [!QUESTION]- Can deterministic checks replace LLM judges?
> No. They enforce format and hard rules, but they do not measure semantic correctness. Use both.

## Links

- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/)
- [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

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
