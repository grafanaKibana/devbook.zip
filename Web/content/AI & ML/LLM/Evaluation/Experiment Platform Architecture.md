---
publish: true
created: 2026-07-16T18:32:50.905Z
modified: 2026-07-16T18:32:50.905Z
published: 2026-07-16T18:32:50.905Z
topic:
  - AI & ML
subtopic:
  - LLM
summary: Binding experiment configuration, assignment, exposure, metrics, and analysis to one versioned contract.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

An experiment platform makes a randomized decision reproducible. It binds eligibility, assignment, exposure, metric definitions, and analysis to one immutable experiment version. Without that control plane, a dashboard can compare users who were never exposed, move one user between variants, or recompute the primary metric under rules that did not exist when traffic ran.

![[Assets/System Design 101/04eb4d4688ce484b8d1e506683ed1b40b71256783c43868e05d172234e7617ee.jpg]]

## Configuration lifecycle

An experiment definition contains the hypothesis, owner, eligibility rule, variants and weights, assignment unit, primary metric, guardrails, ramp, and stop policy. Treat a running definition as immutable; changing it creates a new version so exposures collected under different rules remain distinguishable.

```text
draft → approved → running → stopped → analyzed → archived
```

A kill switch can stop new assignments immediately, but it must not delete the historical definition or exposure log needed for audit and analysis.

## Deterministic assignment

Hashing a stable identifier gives the same unit the same variant on every service instance:

```text
bucket = Hash(experimentId, version, accountId, salt) mod 10_000

0..4_999     → control
5_000..9_999 → treatment
```

The assignment unit is part of the product decision. Use an account when users within one account influence each other; use a device only when identity is unavailable and cross-device inconsistency is acceptable. Salt and version prevent accidental reuse of an old allocation.

## Exposure, not eligibility

Assignment is not evidence that treatment affected a response. Record an exposure only at the point where the selected variant can change behavior. The event includes experiment version, assignment-unit identifier, variant, timestamp, and the request or surface needed for attribution. Outcomes join to exposure so eligible-but-never-exposed units do not dilute the estimate.

Log every exposure attempt idempotently or deduplicate it in analysis. Duplicate events must not turn one account into several independent observations.

## Metric and analysis contracts

A versioned metric defines numerator, denominator, attribution window, exclusions, and aggregation unit. Analysis uses the same definition that was approved at launch and checks data quality before treatment effects.

Sample-ratio mismatch is a gate. In a planned 50/50 split, a material 62/38 allocation is evidence of an eligibility, hashing, logging, or filtering defect—not a surprising treatment effect. Stop interpretation until the mismatch is explained. Also check missing exposure fields, duplicate units, delayed outcomes, and guardrail freshness.

The platform should return an estimate, confidence interval, sample counts at the assignment unit, and the predefined decision criteria. Dashboards visualize that record; they do not invent a new analysis after launch.

## Tradeoffs

Centralization adds schema governance and launch ceremony. That cost is justified when several teams run experiments or when decisions affect safety, revenue, or policy. A small product can begin with a versioned config, stable hashing library, exposure table, and reviewed analysis notebook, but those four contracts still need one owner.

## Questions

> [!QUESTION]- Why keep assignment and exposure separate?
> Assignment records intent; exposure records that the variant could affect behavior. Joining outcomes to actual exposure avoids attributing an effect to users who qualified but never reached the changed surface.

> [!QUESTION]- What does sample-ratio mismatch tell you?
> The observed allocation is inconsistent with the planned randomization. It is a diagnostic for instrumentation or eligibility failure and must be resolved before reading the treatment effect.

## References

- [Practical Guide to Controlled Experiments on the Web](https://exp-platform.com/Documents/GuideControlledExperiments.pdf) — primary guidance on randomization, triggering, metrics, and trustworthy experiment analysis.
- [Diagnosing sample-ratio mismatch in online controlled experiments](https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners/) — Microsoft Research’s primary taxonomy of SRM causes and investigation rules.
- [Online Experimentation at Microsoft](https://www.microsoft.com/en-us/research/publication/online-experimentation-at-microsoft/) — primary description of a mature experimentation platform and its operational controls.
- [ByteByteGo source snapshot: possible experiment platform architecture](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/possible-experiment-platform-architecture.md) — the pinned architecture source reconciled here with deterministic assignment, actual-exposure logging, immutable versions, and analysis gates.
