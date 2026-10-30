---
publish: true
created: 2026-02-16T18:33:57.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-28T20:52:55.137Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: A model grades candidate output with anchored scorecards or pairwise preference, then human labels calibrate the judge.
level:
  - "3"
priority: Medium
status: Done
qard-deck: AI & ML
qard-topic: LLM/Evaluation/LLM-as-a-Judge
flashcard_uid: 446768f0
---

LLM-as-a-judge uses a model to grade a candidate output against an explicit rubric. It scales semantic evaluation beyond what exact-match checks can measure, but its verdict is another model output rather than ground truth. Reliability has to be measured against human labels.

Two modes cover most comparisons. **Absolute scoring** assigns anchored scores to dimensions such as correctness or groundedness. It fits a stable release threshold. **Relative preference** presents two candidates and asks which is better, which is often easier to calibrate during prompt or model iteration.

The judge is part of the test harness. Its prompt, rubric, model, and sampling settings are versioned together, and agreement with a fixed human-labeled set is tracked as those inputs change.

# Turning Rubric Anchors into Scores

Rubric scorecards use a small scale with concrete anchors. Each dimension receives its own score, so a grounded but incomplete answer does not collapse into one unexplained number.

Useful rubrics:

- Define every score in observable terms.
- Keep separate concerns in separate dimensions.
- Require evidence when a claim must be grounded.
- Use examples that expose the boundary between adjacent scores.

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

# Comparing Two Candidates

Pairwise comparison shows two outputs for the same case and selects the better one under a stated priority order. It avoids asking the judge to maintain a stable absolute scale across unrelated examples.

Across a test set, verdicts become a win rate or ranking. That is useful for deciding whether a candidate beats the baseline. It does not establish that either answer meets a minimum safety or correctness bar.

Three properties reduce avoidable noise in pairwise evaluation:

- The prompt states what "better" means and how conflicts between dimensions are resolved.
- Answer order is randomized.
- A tie is allowed when neither difference matters.

Pairwise judge prompt (rubric-first):

```text
You are evaluating two answers to the same question.
First check whether each answer meets the safety requirements.
An unsafe answer is ineligible to win. If both answers are safe,
choose by correctness, then groundedness, then clarity.

Output JSON only: {"winner": "A", "rationale": "..."}  (winner must be "A", "B", or "tie")
```

# What the Judge Sees

The judge prompt defines the measurement. A vague instruction leaves the model to invent priorities. A stable prompt supplies the rubric, output schema, and evidence needed for the decision.

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

The aggregate is trusted only after calibration on labeled cases. Disagreements with those labels are worth inspecting because they reveal whether the rubric is ambiguous, the reference is incomplete, or the judge is biased. Repeated judgments can estimate instability, but voting does not repair a consistently wrong rubric.

# How Judges Distort Results

**Verbosity bias.** A longer answer may score higher even when the extra text only repeats the same claim. Zheng et al. demonstrated this with repetitive-list attacks. Calibration examples should give full credit to concise answers, and the rubric should penalize irrelevant repetition.

**Position bias.** Pairwise judges can favor A or B independently of content. Answer order is randomized, and each pair is also judged with the answers swapped to check whether the same answer stays preferred. A preference that does not survive the swap marks an abstention or human-review case, not evidence for either candidate.

**Prompt sensitivity.** Small instruction changes can move scores across the whole set. The prompt therefore lives in version control, and a new judge version runs against the calibration set before its scores are compared with historical results.

**Self-preference.** A judge may favor outputs from its own model family or a familiar response style. A different judge family can reduce the coupling, but only agreement with diverse human-labeled examples demonstrates that the choice helped.

**Calibration drift.** A model update can make an unchanged judge stricter or looser. Pinning the model version where possible limits that drift, and the fixed human-labeled set is rerun after every judge change. Historical scores are comparable only while the measurement contract stays stable.

# Questions

<!-- qard-id: 935b5109-8c6e-4c87-80ad-38b3d509182f -->

> [!qard]- When does an LLM judge fit better than a deterministic check?
> An LLM judge fits when acceptance depends on meaning or quality that cannot be written as an exact rule, such as whether an answer is correct for the case, grounded in its sources, relevant or clear. A deterministic check fits any property that can be stated exactly, such as schema validity, an allowed action or a length limit. For those properties it remains the better tool even when a judge is available.
>
> | Aspect | Deterministic check | LLM judge |
> |---|---|---|
> | What it can decide | Exactly stated properties such as format, structure, allowed actions and hard policy rules | Open-ended qualities that a rubric can describe but code cannot fully specify |
> | Repeatability | The same rule and input always give the same result | Verdicts can change with the judge model, prompt and sampling settings |
> | Cost | Local parsing or scanning | A model call for every judgment |
> | How it fails | Exact for schemas and allowlists; heuristic scanners such as PII detectors can misclassify | It can misread the rubric or the answer, or favor irrelevant features such as length |
>
> The two approaches combine. Deterministic checks run first, so a malformed output or a forbidden action fails immediately without the cost of a judge call. A good semantic score cannot rescue a failed hard rule. The judge then evaluates the remaining semantic criteria, and its verdicts are trusted only after calibration against human labels.
>
> Sources: [OpenAI: Evals guide](https://developers.openai.com/api/docs/guides/evals) · [Zheng et al.: Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) · [JSON Schema Core](https://json-schema.org/draft/2020-12/json-schema-core)

<!-- qard-id: a68a413d-a086-4bb3-8ba5-a71f1d99297c -->

> [!qard]- What evidence supports trusting an LLM judge's verdicts?
> An LLM judge earns trust through measured agreement with human judgment on representative cases. It also needs tests showing that its verdicts do not depend on irrelevant features such as answer order. This evidence supports the judge's reliability; it does not prove that the rubric measures the right thing.
>
> - **Agreement with human labels:** the judge scores a fixed set of cases that humans have already labeled, and its agreement with those labels is measured. Disagreements are inspected because they reveal whether the rubric is ambiguous, the reference is incomplete or the judge is biased.
> - **Order-swap consistency:** in pairwise comparison, each pair is judged twice, once in each order. A consistent judge prefers the same underlying answer both times, so its A/B label switches along with the answers. A judge that keeps choosing the same position instead follows position rather than content, which is position bias. A pair whose preferred answer changes with the order is treated as a tie or sent to human review.
> - **Bias probes:** calibration cases set concise correct answers beside padded or repetitive ones to expose verbosity bias. They also include outputs from the judge's own model family to expose self-preference.
> - **Recalibration after changes:** the judge model, prompt, rubric and sampling settings together define the measurement. A change to any of them can make scores stricter or looser, so the calibration set is rerun before new scores are compared with old ones.
>
> High agreement shows only that the judge matches the labelers on those cases. A judge that consistently applies a flawed rubric is stable but still measures the wrong thing.
>
> Sources: [Zheng et al.: Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) · [OpenAI: Evals guide](https://developers.openai.com/api/docs/guides/evals)

# References

- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (Zheng et al., NeurIPS 2023)](https://arxiv.org/abs/2306.05685)
- [LLM-as-a-judge evals guide (OpenAI API Docs)](https://developers.openai.com/api/docs/guides/evals)
- [Microsoft.Extensions.AI.Evaluation docs (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/ai/conceptual/evaluation-libraries)
- [MEAI evaluation samples (dotnet/ai-samples)](https://github.com/dotnet/ai-samples/tree/main/src/microsoft-extensions-ai-evaluation)
