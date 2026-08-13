---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "A model grades candidate output with anchored scorecards or pairwise preference, then human labels calibrate the judge."
level:
  - "3"
priority: Medium
status: Done
publish: true
---

LLM-as-a-judge uses a model to grade a candidate output against an explicit rubric. It scales semantic evaluation beyond what exact-match checks can measure, but its verdict is another model output rather than ground truth. Reliability has to be measured against human labels.

Two modes cover most comparisons. **Absolute scoring** assigns anchored scores to dimensions such as correctness or groundedness. It fits a stable release threshold. **Relative preference** presents two candidates and asks which is better, which is often easier to calibrate during prompt or model iteration.

The judge is part of the test harness. Version its prompt, rubric, model, and sampling settings together. Then track agreement with a fixed human-labeled set as those inputs change.

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

Reduce avoidable noise:

- State what "better" means and resolve conflicts between dimensions.
- Randomize answer order.
- Allow a tie when neither difference matters.

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

Calibrate on labeled cases before trusting the aggregate. Inspect disagreements, because they reveal whether the rubric is ambiguous, the reference is incomplete, or the judge is biased. Repeated judgments can estimate instability, but voting does not repair a consistently wrong rubric.

# How Judges Distort Results

**Verbosity bias.** A longer answer may score higher even when the extra text only repeats the same claim. Zheng et al. demonstrated this with repetitive-list attacks. Calibration examples should give full credit to concise answers, and the rubric should penalize irrelevant repetition.

**Position bias.** Pairwise judges can favor A or B independently of content. Randomize order and measure whether the verdict changes when the same pair is swapped. Persistent disagreement is an abstention or human-review case, not evidence for either candidate.

**Prompt sensitivity.** Small instruction changes can move scores across the whole set. Keep the prompt in version control and run it against the calibration set before comparing a new judge version with historical results.

**Self-preference.** A judge may favor outputs from its own model family or a familiar response style. A different judge family can reduce the coupling, but only agreement with diverse human-labeled examples demonstrates that the choice helped.

**Calibration drift.** A model update can make an unchanged judge stricter or looser. Pin the model version when possible and rerun the fixed human-labeled set after every judge change. Historical scores are comparable only while the measurement contract stays stable.

# Questions

> [!QUESTION]- When does LLM-as-a-judge fit better than a deterministic metric, and what evidence makes the judge trustworthy?
> Use a judge when acceptance depends on meaning that fixed rules cannot capture. Keep exact constraints in deterministic checks. Trust comes from measured agreement with representative human labels, stability under answer-order swaps, and repeated calibration after the judge changes.

# References

- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (Zheng et al., NeurIPS 2023)](https://arxiv.org/abs/2306.05685): primary evidence on position, verbosity, and self-enhancement biases in model judges.
- [LLM-as-a-judge evals guide (OpenAI API Docs)](https://developers.openai.com/api/docs/guides/evals): practical judge configuration and evaluation workflow.
- [Evaluation best practices (OpenAI API Docs)](https://developers.openai.com/api/docs/guides/evaluation-best-practices): guidance on pairwise comparison, classification, and continuous evaluation.
- [Define your success criteria (Anthropic Docs)](https://docs.anthropic.com/en/docs/test-and-evaluate/define-success): criteria and rubric design before evaluation begins.
- [Evaluating LLM outputs in production (Eugene Yan)](https://eugeneyan.com/writing/llm-evaluations/): practitioner analysis of evaluation methods and judge calibration.
- [Microsoft.Extensions.AI.Evaluation docs (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/ai/conceptual/evaluation-libraries): .NET evaluators, reporting, and quality metrics.
- [MEAI evaluation samples (dotnet/ai-samples)](https://github.com/dotnet/ai-samples/tree/main/src/microsoft-extensions-ai-evaluation): runnable examples for the Microsoft evaluation libraries.
- [AI Risk Management Framework (NIST)](https://www.nist.gov/itl/ai-risk-management-framework): vendor-neutral governance context for measurement and validation.
