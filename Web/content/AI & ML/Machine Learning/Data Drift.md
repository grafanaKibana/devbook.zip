---
publish: true
created: 2026-08-20T20:41:15.504Z
modified: 2026-08-20T20:41:15.504Z
published: 2026-08-20T20:41:15.504Z
topic:
  - AI & ML
subtopic:
  - Machine Learning
summary: When input data shifts away from the training distribution, silently degrading model predictions.
level:
  - "1"
priority: Low
status: Done
---

Data drift means production inputs no longer look like the data used to train a model. Nothing has to crash. The service can keep returning predictions while their quality slips because customers changed behavior, a new camera changed the image distribution, or an upstream pipeline started encoding a field differently.

Drift is a warning, not proof that the model is wrong. The useful question is whether the change reaches features the model relies on and whether it changes the relationship between inputs and outcomes.

# Types of Drift

| Type | What changes | Example |
|------|-------------|---------|
| **Data drift** (feature drift) | P(X), the input distribution | Users start asking questions in a new language |
| **Label drift** (prior probability shift) | P(Y), the label distribution | Fraud rate increases from 1% to 5% |
| **Concept drift** | P(Y|X), the relationship between inputs and labels | "Spam" patterns change as spammers adapt |
| **Covariate shift** | P(X) changes but P(Y|X) stays the same | New user segment with different demographics |

Concept drift is the stronger failure signal because the learned mapping itself has aged. That usually calls for new labels and an updated model, though a policy or threshold change may contain the immediate risk. Plain feature drift can be harmless when the shifted feature has little influence or the model still generalizes.

# Detection Methods

**Population Stability Index (PSI)** compares binned feature distributions. It is common in credit scoring, but its familiar 0.1 and 0.2 cutoffs are conventions rather than universal statistical guarantees.

```python
import numpy as np

def psi(expected, actual, bins=10, eps=1e-6):
    """Compute PSI between baseline and current feature distributions."""
    if len(expected) == 0 or len(actual) == 0:
        raise ValueError("PSI requires non-empty baseline and current samples")
    if np.unique(expected).size < 2:
        raise ValueError("PSI is undefined for a constant baseline")

    quantiles = np.quantile(expected, np.linspace(0, 1, bins + 1))
    edges = np.concatenate(([-np.inf], np.unique(quantiles[1:-1]), [np.inf]))
    if len(edges) < 3:
        raise ValueError("PSI requires at least two baseline intervals")

    exp_counts, _ = np.histogram(expected, bins=edges)
    act_counts, _ = np.histogram(actual, bins=edges)
    exp_p = np.maximum(exp_counts / max(exp_counts.sum(), 1), eps)
    act_p = np.maximum(act_counts / max(act_counts.sum(), 1), eps)
    return float(np.sum((act_p - exp_p) * np.log(act_p / exp_p)))

# PSI < 0.1: no significant drift
# PSI 0.1–0.2: moderate drift, investigate
# PSI > 0.2: significant drift, action required
```

The function is deliberately small. Infinite outer edges retain current values outside the baseline range. A constant baseline still cannot define useful quantile bins, so the function fails instead of reporting zero drift; monitor that feature as a constant-to-novel categorical change. A production implementation must also define missing-value handling. Its comments show conventional PSI triage bands, not statistical significance or automatic retraining rules. Calibrate those bands for each feature and decision.

**Kolmogorov-Smirnov (KS) test** compares two numeric samples through the largest gap between their empirical cumulative distributions. With large samples it can flag tiny, operationally irrelevant differences, so the effect size and minimum sample size still matter. Monitoring many features also creates many hypothesis tests. The alert policy needs a multiple-testing rule or another way to control the resulting false positives.

**Chi-square test** works with categorical counts. Sparse categories need to be combined or handled separately because low expected counts make the result unreliable.

**Jensen-Shannon divergence** gives a symmetric distance between distributions. Its bound depends on the logarithm base. Base 2 gives a value from 0 to 1.

# Monitoring Workflow

```text
1. Define baseline
   └── Training data distribution OR last 30 days of stable serving

2. Compute drift metrics per feature
   └── PSI for numeric, chi-square for categorical
   └── Run daily or per batch

3. Segment monitoring
   └── Break down by region, device, user tier
   └── Averages hide drift in subpopulations

4. Alert on threshold breach
   └── PSI > 0.2, KS p-value < 0.05

5. Investigate
   └── Rule out pipeline issues first (schema changes, ETL bugs, encoding changes)
   └── Check model performance if labels are available

6. Respond
   └── Retrain on recent data
   └── Update feature engineering
   └── Adjust decision thresholds
   └── Route to manual review for high-risk cases
```

# Pitfalls

**Drift without a performance drop.** A feature can move without changing decisions, especially when the model barely uses it. When labels are available, performance on recent data is stronger evidence than a feature-level alert. Retraining every time PSI crosses a line adds cost and can replace a stable model with a worse one.

**Averages hide affected cohorts.** A global PSI of 0.05 can coexist with 0.4 for one region or device class. Segment the checks along boundaries that matter to the product, while keeping enough samples in each segment to avoid noisy alarms.

**Labels arrive late.** Fraud may be confirmed weeks after scoring. Input drift, confidence distributions, escalation rates, and re-contact rates can provide early warning, but none proves that accuracy fell. The delayed ground truth remains the check that closes the loop.

**Treating every alert as concept drift.** A change in P(X) does not establish a change in P(Y|X). First rule out schema changes and broken joins, then inspect prediction behavior and labeled performance. The response may be a pipeline repair, a threshold adjustment, or retraining. The metric alone cannot choose.

# Tradeoffs

## Detection Method Selection

| Method | Feature type | Sensitivity | Interpretability | Use when |
|--------|------------|------------|-----------------|----------|
| PSI | Numeric | Medium | High (conventional bands: 0.1, 0.2) | Credit scoring and similar workflows. Calibrate bands per feature |
| KS test | Numeric | High | Medium (p-value) | General numeric features. Sensitive to small shifts |
| Chi-square | Categorical | Medium | Medium | Categorical features with stable cardinality |
| Jensen-Shannon divergence | Any | High | Low (0–1 scale) | Comparing distributions symmetrically. Bounded output |
| Model performance metrics | Any | Highest | High | When labels are available. Most direct signal |

Use the monitoring method that matches the feature and the decision. PSI is familiar in regulated credit workflows. KS is useful for numeric samples, and chi-square fits categorical counts. None outranks recent labeled performance. When labels lag, proxy metrics and prediction distributions can narrow the investigation without pretending to be ground truth.

## Retraining Strategy

| Strategy | Trigger | Cost | Risk | Use when |
|----------|---------|------|------|----------|
| Scheduled retraining | Time-based (weekly, monthly) | Predictable | May retrain unnecessarily | Stable domains with predictable drift cycles |
| Drift-triggered retraining | PSI/KS threshold breach | Variable | May miss slow drift | Domains with irregular drift patterns |
| Continuous learning | Every new batch | High | Catastrophic forgetting | High-velocity data streams with fast-changing patterns |
| Manual review + retrain | Human decision | Low (infrequent) | Slow response | Low-volume, high-stakes models where retraining is expensive |

Scheduled retraining is predictable when labels arrive on a regular cadence and the domain changes gradually. Drift-triggered retraining reacts faster, but it needs a second gate: enough fresh labels to show that an update beats the deployed model. High-stakes, low-volume systems often keep a human release decision because one noisy alert is a weak reason to replace a model.

# Questions

> [!QUESTION]- What is the difference between data drift and concept drift?
> Data drift changes P(X), such as a new language appearing in support traffic. Concept drift changes P(Y|X), such as yesterday's fraud cues becoming normal behavior. The first can leave the model useful. The second means its learned mapping no longer describes current outcomes. Recent labeled performance separates a harmless input shift from a model that needs updating.

# References

- [Data drift in machine learning models (Evidently AI)](https://www.evidentlyai.com/ml-in-production/data-drift)
- [Monitoring ML models in production (Google MLOps)](https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning)
- [Failing Loudly: An Empirical Study of Methods for Detecting Dataset Shift (Rabanser et al., 2019)](https://arxiv.org/abs/1810.11953)
