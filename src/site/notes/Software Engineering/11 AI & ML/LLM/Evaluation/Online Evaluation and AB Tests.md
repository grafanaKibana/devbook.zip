---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/llm/evaluation/online-evaluation-and-ab-tests/","noteIcon":"1"}
---


# Intro

Online evaluation measures an LLM application in production. A/B tests compare two variants (prompt/model/retrieval/tooling) on real traffic to determine which improves user outcomes.

## Deeper Explanation

What to measure (prefer outcomes over style):

- Task success (resolved vs escalated)
- Time-to-resolution
- User satisfaction or re-contact rate
- Safety incidents (PII leakage, policy violations)
- Cost and latency

How to run safe experiments:

- Define guardrails and abort criteria (safety first).
- Start with small traffic percentages.
- Segment results (geography, language, user tier) to avoid averages hiding regressions.
- Monitor drift: the best offline prompt can degrade when traffic changes.

## Example

Minimal experiment plan:

```text
Hypothesis: Prompt v2 increases resolution rate without increasing safety incidents.

Primary metric: resolution_rate
Guardrail metrics: pii_leak_rate, policy_violation_rate
Secondary: latency_p95, cost_per_conversation

Ramp: 1% -> 10% -> 50%
Abort if guardrail metrics worsen by >X%.
```

## Questions

> [!QUESTION]- Should I rely on online metrics only?
> No. Use offline evals to prevent obvious regressions and online evals to validate real-world impact.

## Links

- [Define your success criteria (Anthropic Docs)](https://docs.anthropic.com/en/docs/test-and-evaluate/define-success)
- [Observability in generative AI (Azure AI Foundry)](https://learn.microsoft.com/azure/ai-foundry/concepts/observability)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM\|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks\|Deterministic Checks]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs\|Golden Test Set and Regression Runs]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/LLM-as-a-Judge\|LLM-as-a-Judge]]
<!-- whats-next:end -->
