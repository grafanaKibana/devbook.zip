---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/llm/evaluation/rubric-scorecards/","noteIcon":"1"}
---


# Intro

Rubric scorecards measure multiple dimensions of an LLM output (correctness, groundedness, safety, style) using a small, consistent scale with clear scoring anchors.

## Deeper Explanation

Good rubrics:

- Are explicit and testable (define what a 0/1/2 means).
- Separate concerns (do not mix correctness and tone in one score).
- Are calibrated (periodic human spot checks, judge agreement tracking).
- Include required evidence when needed (citations, quotes, tool outputs).

Common dimensions:

- Correctness (factual and task correctness)
- Groundedness (claims supported by provided sources)
- Safety/policy compliance
- Actionability (clear next steps)
- Format compliance (schema, required fields)

## Example

Scorecard (0-2) for a support assistant:

```text
Correctness:
0: wrong policy / wrong action
1: partially correct
2: correct

Groundedness:
0: unsupported claims
1: mixed or unclear
2: all key claims supported by sources

Safety:
0: unsafe or policy violation
1: questionable
2: safe
```

## Questions

> [!QUESTION]- How do I stop the rubric from rewarding verbosity?
> Add a separate conciseness dimension, cap maximum acceptable length, and include counterexamples where short answers are correct.

## Links

- [LLM-as-a-judge (rubric-driven evaluation)](https://developers.openai.com/api/docs/guides/evals)
- [AI Risk Management Framework (NIST)](https://www.nist.gov/itl/ai-risk-management-framework)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM\|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Classification Evaluation\|Classification Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks\|Deterministic Checks]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs\|Golden Test Set and Regression Runs]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/LLM-as-a-Judge\|LLM-as-a-Judge]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Online Evaluation and AB Tests\|Online Evaluation and AB Tests]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Overfitting\|Overfitting]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Pairwise Comparisons\|Pairwise Comparisons]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Targeted Evals\|Targeted Evals]]
<!-- whats-next:end -->
