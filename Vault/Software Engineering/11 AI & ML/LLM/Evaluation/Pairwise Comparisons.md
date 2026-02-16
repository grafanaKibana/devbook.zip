---
topic:
  - "AI & ML"
subtopic:
  - "LLM"
level:
  - "3"
priority: Medium
status: Creation

dg-publish: true
---

# Intro

Pairwise comparisons evaluate two candidate outputs side-by-side and pick the better one. This is often more reliable than absolute scoring when quality is subjective or multi-dimensional.

## Deeper Explanation

Why pairwise works well:

- Humans (and judge models) are usually better at relative preference than absolute scores.
- It supports quick iteration on prompts/models.
- It can be aggregated into rankings (e.g., win-rate, Elo-style ratings).

How to make it reliable:

- Use a clear rubric for what "better" means (correctness first, then groundedness, then style).
- Randomize the order (A/B position bias).
- Include "tie" if both are acceptable.

## Example

Pairwise judge prompt (rubric-first):

```text
You are evaluating two answers to the same question.
Choose the better answer.
Priority order: correctness > groundedness > safety > clarity.

Output JSON only: {"winner": "A"|"B"|"tie", "rationale": "..."}
```

## Questions

> [!QUESTION]- When should I prefer pairwise over scorecards?
> When you iterate rapidly and care about "better than baseline" more than absolute thresholds. Use scorecards when you need hard pass/fail criteria.

## Links

- [Evaluation best practices (OpenAI API Docs)](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Define your success criteria (Anthropic Docs)](https://docs.anthropic.com/en/docs/test-and-evaluate/define-success)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks|Deterministic Checks]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs|Golden Test Set and Regression Runs]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/LLM-as-a-Judge|LLM-as-a-Judge]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Online Evaluation and AB Tests|Online Evaluation and AB Tests]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Overfitting|Overfitting]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Rubric Scorecards|Rubric Scorecards]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Targeted Evals|Targeted Evals]]
<!-- whats-next:end -->
