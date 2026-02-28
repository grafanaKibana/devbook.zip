---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/llm/evaluation/llm-as-a-judge/","noteIcon":"3"}
---


# Intro

LLM-as-a-judge is an evaluation pattern where one model grades another model's output against an explicit rubric. It's useful for scalable, semantics-aware regression testing when human labels are expensive or slow. The judge reads the question, the candidate answer, and optionally a reference context, then returns a structured verdict.

Two judging modes cover most use cases. **Absolute scoring** (rubric scorecards) assigns a numeric score per dimension, like correctness 0-2 or groundedness 0-5. **Relative preference** (pairwise comparisons) shows the judge two candidate answers side-by-side and asks which is better. Absolute scoring works when you need hard pass/fail thresholds. Pairwise works when quality is subjective or you're iterating quickly and care about "better than baseline" more than a specific number.

The core workflow: define a rubric, write a judge prompt that enforces it, run the judge at scale, and periodically spot-check its verdicts against human labels to catch drift.

## Rubric Scorecards

Rubric scorecards measure multiple dimensions of an LLM output using a small, consistent scale with clear scoring anchors. Each dimension gets its own score so you can see exactly where a response fails.

Good rubrics:

- Are explicit and testable (define what a 0, 1, and 2 each mean in concrete terms).
- Separate concerns (don't mix correctness and tone in one score).
- Are calibrated through periodic human spot checks and judge agreement tracking.
- Include required evidence when needed (citations, quotes, tool outputs).

Common dimensions:

- **Correctness** (factual and task correctness)
- **Groundedness** (claims supported by provided sources)
- **Safety/policy compliance**
- **Actionability** (clear next steps)
- **Format compliance** (schema, required fields)

Scorecard example (0-2 scale) for a support assistant:

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

## Pairwise Comparisons

Pairwise comparisons evaluate two candidate outputs side-by-side and pick the better one. Humans and judge models are generally better at relative preference than absolute scores, which makes pairwise more reliable when quality is subjective or multi-dimensional.

Pairwise results aggregate naturally into rankings: win-rate percentages or Elo-style ratings across a test set. This makes it easy to compare prompt versions or model checkpoints without needing a fixed numeric threshold.

To make pairwise reliable:

- Use a clear rubric for what "better" means (correctness first, then groundedness, then style).
- Randomize which answer appears as A vs B to control for position bias.
- Include "tie" as a valid output when both answers are acceptable.

Pairwise judge prompt (rubric-first):

```text
You are evaluating two answers to the same question.
Choose the better answer.
Priority order: correctness > groundedness > safety > clarity.

Output JSON only: {"winner": "A", "rationale": "..."}  (winner must be "A", "B", or "tie")
```

## Judge Prompt Design

The judge prompt is the most important lever. A vague prompt produces noisy, unreliable scores. A well-structured prompt locks in the rubric, specifies the output format, and gives the judge the reference context it needs to evaluate groundedness.

Groundedness-focused judge prompt template:

```text
System: You are a strict evaluator. Score from 0 to 5.
Rules:
- Only use the provided REFERENCE to judge factual correctness.
- If the ANSWER claims facts not supported by REFERENCE, penalize heavily.
- Output JSON only. Required keys: score (0-5 integer), rationale (string), unsupported_claims (array of strings).

User:
QUESTION:
<question>

REFERENCE:
<snippets or retrieved passages>

ANSWER:
<candidate answer>
```

Calibration tips:

- Treat the judge as a test harness: define rubric, scale, and required evidence before writing the prompt.
- Spot-check judge outputs with humans, track agreement, and update the rubric or prompt when drift appears.
- Reduce noise by running multiple judgments (different seeds or models) and aggregating with median or majority vote.
- Defend against gaming by keeping rubrics specific and including reference context for groundedness checks.

## Pitfalls

**Verbosity bias.** Judge models tend to prefer longer, more detailed answers even when a shorter answer is correct. Mitigate by adding a conciseness dimension to the rubric, capping acceptable length, and including counterexamples where short answers score full marks.

**Position bias in pairwise.** When the same answer appears as A in one run and B in another, judges often prefer whichever position they saw first. Always randomize A/B order and check that win-rates are symmetric.

**Prompt sensitivity.** Small wording changes in the judge prompt can shift scores significantly. Lock the prompt in version control, run regression checks when you change it, and treat prompt changes like code changes.

**Hidden coupling.** If the judge model is the same model (or a close relative) as the one generating answers, it may reward its own style and penalize outputs from other models. Use a different judge model, or at minimum validate with human labels on a diverse sample.

**Calibration drift.** Judge behavior shifts as the underlying model is updated. Maintain a fixed gold dataset with known human labels and re-run calibration periodically to catch drift early.

## Questions

> [!QUESTION]- When should I prefer LLM-as-a-judge over classic metrics, and how do I know the judge is trustworthy?
> Expected answer:
> - Use judges for open-ended generation where semantics matter and deterministic metrics (exact match, BLEU) can't capture quality.
> - Use classic metrics for deterministic outputs or when you need hard guarantees.
> - The key signal: if a human would need to read the answer to evaluate it, a judge model probably should too.
> - Measure judge trustworthiness by checking agreement with a small human-labeled set.
> - Track drift over time by re-running a fixed gold dataset after model updates.
> - Why: judge reliability is not assumed — it must be validated and maintained like any other test harness.

> [!QUESTION]- When should I prefer pairwise comparisons over rubric scorecards?
> Expected answer:
> - Pairwise works best when iterating rapidly and the goal is "better than baseline" rather than a specific threshold.
> - Scorecards work better when you need hard pass/fail criteria, want to track specific dimensions over time, or need to gate a release on a minimum score.
> - Pairwise results aggregate into win-rates or Elo ratings, which are useful for comparing prompt versions or model checkpoints.
> - Why: relative preference is cognitively easier for both humans and models than assigning an absolute score, so pairwise tends to produce more consistent verdicts on subjective quality.

> [!QUESTION]- What are the most dangerous pitfalls when using LLM-as-a-judge in production?
> Expected answer:
> - Verbosity bias: judges prefer longer answers even when shorter ones are correct. Mitigate with a conciseness dimension and length caps.
> - Position bias: in pairwise, judges favor whichever answer appears first. Always randomize A/B order.
> - Hidden coupling: using the same model as judge and candidate inflates scores. Use a different judge model.
> - Calibration drift: judge behavior shifts as the underlying model is updated. Maintain a gold dataset and re-run calibration periodically.
> - Why: these biases are systematic, not random — they silently corrupt your eval signal and can cause you to ship regressions.

## References

- [Microsoft.Extensions.AI.Evaluation docs (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/ai/conceptual/evaluation-libraries)
- [MEAI evaluation samples (dotnet/ai-samples)](https://github.com/dotnet/ai-samples/tree/main/src/microsoft-extensions-ai-evaluation)
- [Microsoft.Extensions.AI.Evaluation source (dotnet/extensions)](https://github.com/dotnet/extensions)
- [LLM-as-a-judge evals guide (OpenAI API Docs)](https://developers.openai.com/api/docs/guides/evals)
- [Evaluation best practices (OpenAI API Docs)](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Define your success criteria (Anthropic Docs)](https://docs.anthropic.com/en/docs/test-and-evaluate/define-success)
- [AI Risk Management Framework (NIST)](https://www.nist.gov/itl/ai-risk-management-framework)

- [Evaluating LLM outputs in production (Eugene Yan)](https://eugeneyan.com/writing/llm-evaluations/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM\|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks\|Deterministic Checks]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs\|Golden Test Set and Regression Runs]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Online Evaluation and AB Tests\|Online Evaluation and AB Tests]]
<!-- whats-next:end -->
