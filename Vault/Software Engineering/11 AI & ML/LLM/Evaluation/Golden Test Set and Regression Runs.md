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

A golden test set is a curated collection of representative cases (questions, context, expected behaviors) that you run repeatedly to catch regressions when you change prompts, retrieval, tools, or models.

## Deeper Explanation

What a good golden set includes:

- Typical user requests (the 80%)
- Edge cases (ambiguous, multi-hop, long context)
- Adversarial cases (prompt injection, attempts to exfiltrate secrets)
- Unanswerable cases (should abstain or ask clarifying questions)
- High-stakes cases (safety, PII, finance/medical)

Operational practices:

- Version the dataset (treat it like code).
- Keep a true holdout slice you do not tune on.
- Run the suite automatically on every meaningful change.
- Track diffs: compare candidate vs baseline by rubric/judge + deterministic checks.

## Example

Simple JSONL schema for one test case:

```json
{"id":"refund-045","input":{"question":"Refund for damaged item after 45 days?","context_refs":["policy_v3.md#refund-window"]},"expected":{"must_cite":true,"must_not":["ask_for_credit_card"],"should":{"action":"escalate"}}}
```

## Questions

> [!QUESTION]- How big should the golden set be?
> Start small (20-50) with high signal. Grow as you discover real failures. Add targeted mini-suites for each major failure mode.

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
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Classification Evaluation|Classification Evaluation]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks|Deterministic Checks]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/LLM-as-a-Judge|LLM-as-a-Judge]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Online Evaluation and AB Tests|Online Evaluation and AB Tests]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Overfitting|Overfitting]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Pairwise Comparisons|Pairwise Comparisons]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Rubric Scorecards|Rubric Scorecards]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Targeted Evals|Targeted Evals]]
<!-- whats-next:end -->
