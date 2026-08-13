---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "How to structure, label, generate, and size the cases that every evaluation method relies on."
level:
  - "3"
priority: High
status: Done
publish: true
---

An evaluation set is the common input to [[LLM-as-a-Judge]], [[Deterministic Checks]], and regression gates. If its cases do not represent the workload, a precise scorer still produces a misleading result. The set defines what is measured before any metric assigns a number.

Two choices matter most. Labels describe acceptable behavior, which quickly becomes domain-specific: [[Retrieval Evaluation Sets]] shows how queries map to relevant evidence, while an agent may need correct tool choice and trajectory constraints. Sample size determines whether the set can distinguish a real change from sampling noise. A stable subset becomes the release gate described in [[Golden Test Set and Regression Runs]], and [[Online Evaluation and AB Tests]] carries the comparison into production traffic.

# Structure

Each case needs an input and a testable description of acceptable behavior. That description may be a reference answer, a rubric, hard constraints, or some combination. Supporting evidence is part of the case when the system is expected to ground its answer in a particular source.

The label determines which scorer is valid. Exact or structured expectations support deterministic checks. Open-ended criteria need rubric-based grading. Reference-free methods can measure properties such as faithfulness against supplied context, but they do not replace domain ground truth when correctness depends on facts outside that context. ARES combines synthetic data with a smaller human-labeled set and uses prediction-powered inference to estimate performance over more examples.

# Synthetic Generation

Synthetic generation is a practical bootstrap. Start from source material with known provenance, ask a model for plausible requests that the material can answer, and keep the source identifier with each generated case. This reverses the expensive part of labeling: the evidence is known before the input is written.

```text
for item in sample(source_material, n=2000):
    prompt = f"""You are a real user of this system. Read the material and
    write 1-3 natural questions or tasks it fully satisfies. Paraphrase —
    do not copy phrasing. Skip boilerplate.

    Material:
    {item.text}"""
    for q in llm(prompt):
        eval_set.append({"input": q, "expected_source_id": item.id})
```

The weakness appears across the set rather than in one obvious bad case. Generated requests tend to share the model's phrasing and preferred difficulty, so ambiguous or adversarial production inputs disappear from view. Stratified source sampling helps. Prompt variants can widen the case shapes, and production examples should replace synthetic cases as real traffic becomes available. Retrieval-specific problems such as lexical leakage are covered in [[Retrieval Evaluation Sets]].

# Size and Statistical Power

An evaluation result is an estimate over sampled cases. Its uncertainty depends on the metric, case distribution, correlation between observations, and the effect the gate is meant to detect. A small set may expose large failures while remaining unable to separate two close configurations.

Choose the minimum detectable effect before sizing the set, then report an interval around the observed difference. Paired evaluation, where baseline and candidate answer the same cases, often reduces variance because each case acts as its own control. End-to-end outcomes may still need many observations when user behavior or task difficulty varies widely.

# Pitfalls

## Eval Set Drift

The corpus or product changes while the evaluation set stays frozen. Cases begin to reference deleted material or obsolete behavior, yet the dashboard remains stable.

Version the set with the data and policy it describes. Validate that referenced sources still exist, and review cases when the product contract changes. Otherwise a score change cannot be attributed cleanly to the system, the data, or the labels.

## Threshold Cargo-Culting

A threshold copied from another workload has no local meaning. The same score can represent different risks when the rubric, traffic, or cost of failure changes.

Calibrate thresholds against human labels and product outcomes from the workload being shipped. Relative regression limits are useful when the measurement scale is stable, but they cannot make an unsafe baseline acceptable.

# Questions

> [!QUESTION]- Why are relative regression thresholds preferable to absolute quality targets for release gates?
> Relative thresholds compare a candidate with a measured local baseline, so they are useful for detecting change on a stable set. Absolute thresholds still matter for safety and policy requirements. A release gate often needs both: no meaningful regression from baseline and no violation of a fixed minimum.

> [!QUESTION]- When should a team invest in a human-annotated golden set versus relying on synthetic generation?
> Synthetic cases are enough to bootstrap breadth and test the harness. Human annotation becomes necessary when labels require domain judgment, the failure cost is high, or synthetic phrasing no longer matches production traffic. A practical set combines generated coverage with reviewed incidents and a curated regression subset in [[Golden Test Set and Regression Runs]].

# References

- [A statistical approach to model evaluations (Anthropic)](https://www.anthropic.com/research/statistical-approach-to-model-evals): confidence intervals, paired comparisons, and sample-size reasoning for model evaluations.
- [ARES (Stanford)](https://arxiv.org/abs/2311.09476): automated RAG evaluation using synthetic data, human labels, and prediction-powered inference.
- [RAGAS synthetic test data generation](https://docs.ragas.io/en/stable/concepts/test_data_generation/rag/): corpus-driven generation of question, answer, and context cases.
