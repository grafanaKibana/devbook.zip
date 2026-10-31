---
publish: true
created: 2026-06-12T18:21:46.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-31T08:53:28.458Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: How to structure, label, generate, and size the cases that every evaluation method relies on.
level:
  - "3"
priority: High
status: Done
qard-deck: AI & ML
qard-topic: LLM/Evaluation/Building an Evaluation Set
flashcard_uid: e5bc3ffc
---

An evaluation set is the common input to [[LLM-as-a-Judge]], [[Deterministic Checks]], and regression gates. If its cases do not represent the workload, a precise scorer still produces a misleading result. The set defines what is measured before any metric assigns a number.

Two choices matter most. Labels describe acceptable behavior, which quickly becomes domain-specific: [[Retrieval Evaluation Sets]] shows how queries map to relevant evidence, while an agent may need correct tool choice and trajectory constraints. Sample size determines whether the set can distinguish a real change from sampling noise. A stable subset becomes the release gate described in [[Golden Test Set and Regression Runs]], and [[Online Evaluation and AB Tests]] carries the comparison into production traffic.

# Structure

Each case needs an input and a testable description of acceptable behavior. That description may be a reference answer, a rubric, hard constraints, or some combination. Supporting evidence is part of the case when the system is expected to ground its answer in a particular source.

The label determines which scorer is valid. Exact or structured expectations support deterministic checks. Open-ended criteria need rubric-based grading. Reference-free methods can measure properties such as faithfulness against supplied context, but they do not replace domain ground truth when correctness depends on facts outside that context. ARES combines synthetic data with a smaller human-labeled set and uses prediction-powered inference to estimate performance over more examples.

# Synthetic Generation

Synthetic generation is a practical bootstrap. It starts from source material with known provenance. A model writes plausible requests that the material can answer, and each generated case keeps its source identifier. This reverses the expensive part of labeling: the evidence is known before the input is written.

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

The minimum detectable effect is chosen before the set is sized, and each result reports an interval around the observed difference. Paired evaluation, where baseline and candidate answer the same cases, often reduces variance because each case acts as its own control. End-to-end outcomes may still need many observations when user behavior or task difficulty varies widely.

# Pitfalls

## Eval Set Drift

The corpus or product changes while the evaluation set stays frozen. Cases begin to reference deleted material or obsolete behavior, yet the dashboard remains stable.

The set is versioned with the data and policy it describes. Referenced sources are checked to confirm they still exist, and cases are reviewed when the product contract changes. Otherwise a score change cannot be attributed cleanly to the system, the data, or the labels.

## Threshold Cargo-Culting

A threshold copied from another workload has no local meaning. The same score can represent different risks when the rubric, traffic, or cost of failure changes.

Thresholds are calibrated against human labels and product outcomes from the workload being shipped. Relative regression limits are useful when the measurement scale is stable, but they cannot make an unsafe baseline acceptable.

# Questions

<!-- qard-id: 7517de71-7dad-4890-bec0-b62b49a788f0 -->

> [!qard]- When should a team add human-labeled evaluation cases instead of relying only on synthetic generation?
> Human-labeled cases become necessary when synthetic cases can no longer be trusted to represent the workload or to label it correctly. That happens when correctness depends on expert judgment, when failures are costly, or when production inputs differ from the generated ones.
>
> - **What synthetic generation does well:** a model writes plausible requests from source material with known provenance. Coverage and a working evaluation harness therefore arrive quickly and cheaply.
> - **Where it falls short:** generated cases share the generator's phrasing and preferred difficulty, so ambiguous, messy or adversarial real inputs are under-represented. Generated labels can also miss subtle domain distinctions.
> - **What human labels add:** reviewed cases ground the evaluation in real inputs and expert judgment. They also show whether synthetic labels and automated judges agree with people. ARES, for example, pairs synthetic training data with a small human-annotated set that corrects its automated estimates.
>
> A practical evaluation set often combines synthetic breadth, human-reviewed cases and regression cases taken from real failures. The balance depends on the task's risk and on how closely synthetic cases match production traffic.
>
> [ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems (arXiv)](https://arxiv.org/abs/2311.09476) · [Evaluation best practices (OpenAI)](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

# References

- [A statistical approach to model evaluations (Anthropic)](https://www.anthropic.com/research/statistical-approach-to-model-evals)
- [ARES (Stanford)](https://arxiv.org/abs/2311.09476)
