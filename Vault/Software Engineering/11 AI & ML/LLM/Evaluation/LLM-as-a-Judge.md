---
topic:
  - AI & ML
subtopic:
  - LLM
level:
  - "3"
priority: Medium
status: Creation
dg-publish: true
tags:
---

# Intro

LLM-as-a-judge is an evaluation pattern where one model grades another model's output against an explicit rubric (for example: relevance, completeness, groundedness). It is useful for scalable, semantics-aware regression testing when human labels are expensive.

## Deeper Explanation

- Treat the judge as a test harness: define rubric, scale, and required evidence (citations, quotes, or retrieved passages).
- Calibrate: spot-check judge outputs with humans, track agreement, and update rubric/prompt when drift appears.
- Reduce noise: run multiple judgments (different seeds/models) and aggregate (median/majority vote).
- Defend against gaming: keep rubrics specific, include reference context for groundedness, and avoid judge prompts that can be influenced by the candidate answer.

## Example

Judge prompt template (groundedness-focused):

```text
System: You are a strict evaluator. Score from 0 to 5.
Rules:
- Only use the provided REFERENCE to judge factual correctness.
- If the ANSWER claims facts not supported by REFERENCE, penalize heavily.
- Output JSON only with: {"score": number, "rationale": string, "unsupported_claims": [string]}.

User:
QUESTION:
<question>

REFERENCE:
<snippets or retrieved passages>

ANSWER:
<candidate answer>
```

## Questions

> [!QUESTION]- When should I prefer LLM-as-a-judge over classic metrics?
> Think in terms of task semantics: use judges for open-ended generation, and classic metrics for deterministic outputs or when you need hard guarantees.

> [!QUESTION]- How do I know whether my judge is trustworthy?
> Measure agreement with a small human-labeled set, track judge drift over time, and periodically re-run calibration on a fixed gold dataset.

> [!QUESTION]- What are common pitfalls?
> Judge bias (preferring verbosity), sensitivity to prompt wording, and hidden coupling (judge rewards the same style it produces).

## Links

- [Microsoft.Extensions.AI.Evaluation source (dotnet/extensions)](https://github.com/dotnet/extensions)
- [Microsoft.Extensions.AI.Evaluation docs (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/ai/conceptual/evaluation-libraries)
- [MEAI evaluation samples (dotnet/ai-samples)](https://github.com/dotnet/ai-samples/tree/main/src/microsoft-extensions-ai-evaluation)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
<!-- whats-next:end -->
