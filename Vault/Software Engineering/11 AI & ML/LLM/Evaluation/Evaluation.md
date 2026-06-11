---
topic:
  - AI & ML
subtopic:
  - LLM
tags:
  - FolderNote
dg-publish: true
level:
  - "3"
priority: Medium
status: Done
---

# Intro

Evaluation is how you measure whether an LLM application is doing the right thing: answer quality, grounding, safety, and regressions over time.

This folder focuses on practical evaluation techniques you can apply in day-to-day engineering (offline test sets, automated judges, and scorecards).

Good evaluation is multi-layered:

- Offline: fixed test sets to catch regressions
- Online: production signals and controlled experiments
- Human + automated: combine rubric-based review with scalable judges

## Example

Example scorecard for a customer support assistant (one test case):

```text
Case: "Refund policy for damaged item after 45 days"

Dimensions (0-2):
- Correctness: 0 wrong / 1 partly / 2 correct
- Groundedness: 0 invented / 1 unclear / 2 supported by policy
- Safety: 0 unsafe / 1 questionable / 2 safe
- Actionability: 0 vague / 1 partial / 2 clear steps

Hard checks:
- Must include a citation to the policy section
- Must not request credit card numbers
```

## Evaluation Overfitting

When you iterate on prompts or rubrics against a fixed evaluation set, you can overfit to that benchmark—improvements on your dev set don't transfer to real users. This happens because you're optimizing for the specific distribution and phrasing of your test cases, not for genuine quality.

**Practical signals of evaluation overfitting:**

- You keep iterating on a prompt until it maximizes a single judge score on your dev set.
- It becomes overly verbose and "judge-friendly" while real users complain about slow, indirect answers.
- Improvements only show up on your dev set but not on a holdout set (or online metrics).

**Fix:** Introduce multiple eval dimensions, add human spot checks, and keep a frozen holdout set that you never tune against.

## Questions

> [!QUESTION]- When are classic metrics (BLEU/ROUGE) useful?
> Mainly for narrow summarization/translation style tasks and as weak signals. For open-ended assistants, rubric-based scoring and pairwise ranking usually track real quality better.

## References

- [Evaluation best practices (OpenAI API Docs)](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Working with evals (OpenAI API Docs)](https://developers.openai.com/api/docs/guides/evals)
- [Define your success criteria (Anthropic Docs)](https://docs.anthropic.com/en/docs/test-and-evaluate/define-success)
- [AI Risk Management Framework (NIST)](https://www.nist.gov/itl/ai-risk-management-framework)

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
<!-- whats-next:end -->
