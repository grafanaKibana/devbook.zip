---
topic:
  - AI & ML
subtopic:
  - LLM
summary: "Measuring LLM changes on live traffic with outcome metrics, randomized assignment, and uncertainty."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

Online evaluation measures an LLM application on real traffic. An A/B test randomly assigns independent units such as users or accounts to control and treatment, then estimates how a prompt, model, retrieval, or tool change affects outcomes. It catches distribution shifts and multi-turn behavior that a fixed offline set misses, but only when assignment, exposure, metrics, and analysis describe the same experiment. The infrastructure that keeps those contracts aligned is covered in [[#Experiment platform architecture]].

Define the primary outcome and guardrails before traffic starts. A response-length increase is not success if resolution rate falls; a resolution lift is not shippable if safety incidents or p95 latency cross an abort threshold.

# What to measure

| Metric type | Examples | Role |
| --- | --- | --- |
| Task outcome | Resolution rate, escalation rate, completion | Primary product effect |
| User outcome | CSAT, re-contact rate, corrected-answer rate | Quality from user behavior |
| Safety | PII leak rate, policy violation rate | Guardrail and abort condition |
| Efficiency | Cost per resolved case, p95 latency | Operational guardrail or secondary metric |
| Engagement | Follow-up rate, session length | Diagnostic proxy, not success by itself |

A metric contract names the numerator, denominator, attribution window, exclusions, and aggregation unit. “Resolution rate” is ambiguous until it says whether one user, conversation, or message contributes an observation.

# Running a safe A/B test

```text
Hypothesis: prompt v2 improves account-level resolution rate.

Assignment unit: account
Primary metric: resolved_accounts / exposed_accounts
Guardrails: pii_incident_rate, latency_p95
Minimum detectable effect: +2 percentage points
Power: 80%
Significance level: 5%
Runtime: long enough to reach sample size and cover weekly seasonality
Ramp: 1% → 10% → 50%, with guardrail aborts at every stage
```

The assignment unit determines the independent analysis unit. If treatment is assigned per account, ten conversations from one account are correlated observations, not ten independent samples. Analyze account-level outcomes or use a variance estimator that models the clustering. Randomizing by message while the user sees both variants can also create interference and carryover.

Choose the estimator from the metric and design:

- For a binary user-level outcome, estimate a difference in proportions and its confidence interval.
- For a continuous user-level outcome, Welch’s t-test is often a reasonable large-sample default; inspect heavy tails and use a robust or bootstrap estimator when a few users dominate the mean.
- For ratio metrics such as cost per resolved case, preserve the joint numerator/denominator structure rather than treating per-event ratios as independent values.
- For clustered, repeated, or triggered observations, use unit-aware methods; changing the test name does not repair a mismatched assignment and analysis unit.

Pre-register the minimum detectable effect, sample size, stopping rule, and segmentation plan. A `p < 0.05` result can still be too small to matter operationally; report the effect estimate and confidence interval, not only a threshold crossing.

# Power and uncertainty

An underpowered experiment has a high probability of missing a real effect: a false negative. It does not inherently create more false positives when the significance level and stopping rule are respected. The subtler failure is conditional: among the few underpowered studies that do reach significance, the observed effect is often exaggerated because only unusually large estimates cross the threshold. Treat that as an estimate-selection problem, not evidence of a large product win.

Repeatedly peeking and stopping on the first significant result does inflate false positives. Use the predeclared fixed horizon or a valid sequential design when continuous monitoring is required.

# Segmentation

Segments should be defined before analysis when they drive decisions. Geography, language, plan, and device can expose a treatment that improves the average while harming a smaller population. Exploratory slices are useful for finding hypotheses, but many post-hoc comparisons also create false discoveries; label them exploratory and confirm important findings in a later test.

# Monitoring versus experimentation

| Aspect | Continuous monitoring | A/B test |
| --- | --- | --- |
| Purpose | Detect degradation | Estimate the effect of a specific change |
| Traffic | Current production behavior | Randomized control and treatment |
| Duration | Ongoing | Planned sample and stopping rule |
| Decision | Alert on a threshold | Ship, reject, or gather more evidence |

Monitoring catches provider updates, drift, and outages. Randomization estimates causality for an intentional change. One cannot substitute for the other.

# Experiment platform architecture

An experiment platform makes a randomized decision reproducible. Its control plane binds hypothesis, eligibility, assignment, exposure, metrics, and analysis rules to one immutable experiment version. Without that contract, a dashboard can compare users who were never exposed, move one user between variants, or recompute the primary metric under rules that did not exist when traffic ran.

![[AI & ML/AI & ML-Online Evaluation and AB Tests-18120000.jpg]]

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

Assignment is not evidence that treatment affected a response. Record an exposure only where the selected variant can change behavior. Include experiment version, assignment-unit ID, variant, timestamp, and the request or surface needed for attribution. Join outcomes to exposure so eligible-but-never-exposed units do not dilute the estimate.

Log exposure idempotently or deduplicate it in analysis. Duplicate events must not turn one account into several independent observations.

## Metric and analysis contracts

Analysis must use the metric definition approved at launch and check data quality before estimating treatment effects. Sample-ratio mismatch is a gate: a material 62/38 allocation in a planned 50/50 split is evidence of an eligibility, hashing, logging, or filtering defect—not a surprising treatment effect. Stop interpretation until the mismatch is explained. Also check missing exposure fields, duplicate units, delayed outcomes, and guardrail freshness.

The platform should return an estimate, confidence interval, sample counts at the assignment unit, and predefined decision criteria. Dashboards visualize that record; they do not invent a new analysis after launch.

Centralization adds schema governance and launch ceremony. That cost is justified when several teams run experiments or when decisions affect safety, revenue, or policy. A small product can begin with a versioned config, stable hashing library, exposure table, and reviewed analysis notebook, but those four contracts still need one owner.

# Questions

> [!QUESTION]- What does low statistical power mean?
> A real effect often fails to reach the decision threshold, producing a false negative. If an underpowered result is significant, its estimate may be unusually large because only extreme samples crossed the threshold; confirm both practical size and uncertainty.

> [!QUESTION]- Why must analysis follow the assignment unit?
> Randomization makes assigned units independent across variants. Repeated events within one unit remain correlated, so counting them as independent understates uncertainty and can create a confident-looking result from little independent evidence.

> [!QUESTION]- Why keep assignment and exposure separate?
> Assignment records intent; exposure records that the variant could affect behavior. Joining outcomes to actual exposure avoids attributing an effect to users who qualified but never reached the changed surface.

# References

- [Practical Guide to Controlled Experiments on the Web](https://exp-platform.com/Documents/GuideControlledExperiments.pdf) — Kohavi and colleagues’ primary guide to randomization, metrics, power, and trustworthy analysis.
- [Online Experimentation at Microsoft](https://www.microsoft.com/en-us/research/publication/online-experimentation-at-microsoft/) — primary account of large-scale experimentation infrastructure and organizational practice.
- [Diagnosing sample-ratio mismatch in online controlled experiments](https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners/) — Microsoft Research’s primary taxonomy of SRM causes and investigation rules.
- [The ASA statement on p-values](https://doi.org/10.1080/00031305.2016.1154108) — primary statistical guidance explaining why a threshold alone does not measure effect size or practical importance.
- [Beyond Power Calculations](https://doi.org/10.1177/1745691614551642) — Gelman and Carlin’s primary treatment of Type S errors and exaggerated Type M estimates under low-power designs.
- [ByteByteGo source snapshot: possible experiment platform architecture](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/possible-experiment-platform-architecture.md) — the pinned architecture source reconciled here with deterministic assignment, actual-exposure logging, immutable versions, and analysis gates.
