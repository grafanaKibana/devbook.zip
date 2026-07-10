---
publish: true
created: 2026-07-08T15:01:12.302Z
modified: 2026-07-08T15:01:12.303Z
published: 2026-07-08T15:01:12.303Z
topic:
  - AI & ML
subtopic:
  - LLM
level:
  - "3"
priority: Medium
status: Done
---

# Intro

Online evaluation measures an LLM application in production using real user traffic. A/B tests compare two variants (different prompts, models, retrieval strategies, or tooling) on live traffic to determine which produces better user outcomes. Unlike offline evaluation on a fixed test set, online evaluation captures real distribution shifts, edge cases, and user behavior that benchmarks miss. This is why a model or prompt change that moves offline scores only marginally can still produce a large swing in outcome metrics like task resolution rate or escalation-to-human — those metrics depend on multi-turn interaction patterns, user trust, and follow-up behavior that no fixed test set simulates. The reverse also holds: an offline win can fail to materialize online.

The key discipline: define success metrics and guardrail metrics before running the experiment. Never optimize for a proxy metric (e.g., response length) without also monitoring the outcome metric (e.g., task resolution rate).

## What to Measure

Prefer outcome metrics over style metrics:

| Metric type | Examples | Why it matters |
|-------------|---------|----------------|
| **Task success** | Resolution rate, escalation rate, task completion | Directly measures whether the system works |
| **User satisfaction** | Thumbs up/down, CSAT, re-contact rate | Captures quality from the user's perspective |
| **Safety** | PII leak rate, policy violation rate, harmful content rate | Non-negotiable guardrails |
| **Efficiency** | Time-to-resolution, cost per conversation, latency p95 | Operational sustainability |
| **Engagement** | Session length, follow-up rate | Proxy for usefulness (use with caution) |

Avoid optimizing for engagement alone — a system that generates long, verbose responses may score high on engagement but low on task success.

## Running a Safe A/B Test

```text
Hypothesis: Prompt v2 increases resolution rate without increasing safety incidents.

Primary metric:   resolution_rate
Guardrail metrics: pii_leak_rate, policy_violation_rate
Secondary:        latency_p95, cost_per_conversation

Traffic ramp: 1% → 10% → 50%
Abort criteria: if any guardrail metric worsens by >X% relative to control.
Minimum runtime: 2 weeks (to capture weekly seasonality).
```

**Statistical significance:** use a two-proportion z-test or t-test depending on the metric type. Require p < 0.05 and a minimum detectable effect size before declaring a winner. Underpowered experiments produce false positives.

**Segmentation:** always break down results by user segment (geography, language, user tier, device). Averages can hide regressions — a prompt that improves English users may degrade non-English users.

## Monitoring vs Experimentation

| Aspect | Continuous monitoring | A/B test |
|--------|----------------------|---------|
| Purpose | Detect degradation over time | Compare two specific variants |
| Traffic split | All traffic to one variant | Split between control and treatment |
| Duration | Ongoing | Fixed window (days to weeks) |
| Decision | Alert on threshold breach | Statistical significance test |
| Use case | Production health | Prompt/model/retrieval changes |

Both are necessary. Monitoring catches silent degradation (model updates, data drift, traffic shifts). A/B tests validate intentional changes.

## Pitfalls

**Novelty effect**
Users interact differently with new systems. A new prompt may score higher initially because users are more engaged with something new, not because it is better — a satisfaction lift in the first week can shrink to almost nothing a few weeks later, once users stop exploring the new response style. Run experiments long enough to see past the novelty period (typically 1–2 weeks) before reading the results.

**Peeking at results early**
Checking significance before the planned end date inflates false positive rates. Use sequential testing methods (e.g., always-valid p-values) if you need to monitor results continuously.

**Averages hiding regressions**
A 2% improvement in average resolution rate can coexist with a 20% regression for a specific language or user tier. Always segment results.

**Optimizing guardrail metrics**
If safety metrics are included in the optimization objective, the system may learn to avoid triggering safety checks rather than actually being safer. Keep guardrail metrics as hard abort criteria, not optimization targets.

## Questions

> [!QUESTION]- How do you determine the minimum sample size for an A/B test?
> Use a power analysis: specify the minimum detectable effect (e.g., 2% improvement in resolution rate), desired statistical power (80%), and significance level (p < 0.05). Tools like statsmodels or online calculators give the required sample size. Underpowered tests produce false positives that waste engineering effort.

> [!QUESTION]- What is the difference between data drift and model degradation in online evaluation?
> Data drift is a change in the input distribution (users asking different types of questions). Model degradation is a drop in output quality for the same input distribution. Both show up as metric regressions in online monitoring, but the remediation differs: drift may require retraining or prompt updates; degradation may indicate a model update or infrastructure issue.

## References

- [Define your success criteria (Anthropic Docs)](https://docs.anthropic.com/en/docs/test-and-evaluate/define-success) — practical guidance on choosing evaluation metrics for LLM applications, including the distinction between proxy and outcome metrics.
- [Observability in generative AI (Azure AI Foundry)](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/observability) — Microsoft's framework for monitoring LLM applications in production including tracing, metrics, and evaluation integration.
- [Trustworthy Online Controlled Experiments (Kohavi et al.)](https://www.cambridge.org/core/books/trustworthy-online-controlled-experiments/D97B26382EB0EB2DC2019A7A7B518F59) — the definitive book on A/B testing methodology including statistical significance, segmentation, and common pitfalls.
- [Sequential testing for A/B tests (Optimizely)](https://www.optimizely.com/optimization-glossary/sequential-testing/) — how to monitor A/B test results continuously without inflating false positive rates.
