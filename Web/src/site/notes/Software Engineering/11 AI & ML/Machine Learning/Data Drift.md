---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/machine-learning/data-drift/","dg-note-properties":{"topic":["AI & ML"],"subtopic":["Machine Learning"],"level":["1"],"priority":"Low","status":"Done"}}
---

# Intro

Data drift is when the statistical properties of your input data change over time compared to the data your model was trained on. It matters because ML models assume training and serving data come from the same distribution — when that stops being true, predictions can become less reliable without any obvious error. A fraud model trained on last year's purchase behavior silently degrades when new payment methods emerge; a vision model deployed to a new camera produces worse results due to different lighting.

## Types of Drift

| Type | What changes | Example |
|------|-------------|---------|
| **Data drift** (feature drift) | P(X) — input distribution | Users start asking questions in a new language |
| **Label drift** (prior probability shift) | P(Y) — label distribution | Fraud rate increases from 1% to 5% |
| **Concept drift** | P(Y\|X) — the relationship between inputs and labels | "Spam" patterns change as spammers adapt |
| **Covariate shift** | P(X) changes but P(Y\|X) stays the same | New user segment with different demographics |

**Concept drift is the most dangerous** — the model's learned relationship is no longer valid, so retraining on new data is the only fix. Data drift may be benign if the model generalizes well to the new distribution.

## Detection Methods

**Population Stability Index (PSI)** — measures how much a feature's distribution has shifted. Commonly used in credit scoring and finance.

```python
import numpy as np

def psi(expected, actual, bins=10, eps=1e-6):
    """Compute PSI between baseline and current feature distributions."""
    quantiles = np.quantile(expected, np.linspace(0, 1, bins + 1))
    edges = np.unique(quantiles)
    if len(edges) < 3:
        return 0.0

    exp_counts, _ = np.histogram(expected, bins=edges)
    act_counts, _ = np.histogram(actual, bins=edges)
    exp_p = np.maximum(exp_counts / max(exp_counts.sum(), 1), eps)
    act_p = np.maximum(act_counts / max(act_counts.sum(), 1), eps)
    return float(np.sum((act_p - exp_p) * np.log(act_p / exp_p)))

# PSI < 0.1: no significant drift
# PSI 0.1–0.2: moderate drift, investigate
# PSI > 0.2: significant drift, action required
```

**Kolmogorov-Smirnov (KS) test** — non-parametric test for numeric features. Tests whether two samples come from the same distribution.

**Chi-square test** — for categorical features. Tests whether observed frequencies match expected frequencies.

**Jensen-Shannon divergence** — symmetric measure of distribution distance. Bounded [0, 1], easier to interpret than KL divergence.

## Monitoring Workflow

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

## Pitfalls

**Drift without performance drop**
Drift in a feature the model does not rely on heavily may not affect predictions. Always check model performance metrics (if labels are available) before triggering a retrain. Unnecessary retraining wastes resources and can introduce instability.

**Averages hiding drift**
A global PSI of 0.05 (no drift) can coexist with PSI of 0.4 for a specific user segment. Always monitor drift per segment.

**Delayed labels**
For many production systems, ground truth labels arrive days or weeks after prediction (e.g., fraud confirmed after investigation). Use proxy metrics (escalation rate, user complaints) for early drift detection while waiting for labels.

**Treating all drift as concept drift**
Data drift (P(X) changes) does not always require retraining — the model may generalize. Concept drift (P(Y|X) changes) always requires retraining. Distinguish between them before deciding on a response.

## Tradeoffs

### Detection Method Selection

| Method | Feature type | Sensitivity | Interpretability | Use when |
|--------|------------|------------|-----------------|----------|
| PSI | Numeric | Medium | High (thresholds: 0.1, 0.2) | Credit scoring, finance; well-understood thresholds |
| KS test | Numeric | High | Medium (p-value) | General numeric features; sensitive to small shifts |
| Chi-square | Categorical | Medium | Medium | Categorical features with stable cardinality |
| Jensen-Shannon divergence | Any | High | Low (0–1 scale) | Comparing distributions symmetrically; bounded output |
| Model performance metrics | Any | Highest | High | When labels are available; most direct signal |

**Decision rule**: use PSI for numeric features in regulated domains (finance, healthcare) where thresholds are well-established. Use KS test for general numeric monitoring. Use model performance metrics when labels are available — they are the most direct signal. Use proxy metrics (escalation rate, confidence distributions) when labels are delayed.

### Retraining Strategy

| Strategy | Trigger | Cost | Risk | Use when |
|----------|---------|------|------|----------|
| Scheduled retraining | Time-based (weekly, monthly) | Predictable | May retrain unnecessarily | Stable domains with predictable drift cycles |
| Drift-triggered retraining | PSI/KS threshold breach | Variable | May miss slow drift | Domains with irregular drift patterns |
| Continuous learning | Every new batch | High | Catastrophic forgetting | High-velocity data streams with fast-changing patterns |
| Manual review + retrain | Human decision | Low (infrequent) | Slow response | Low-volume, high-stakes models where retraining is expensive |

**Decision rule**: start with scheduled retraining (weekly or monthly) for most models. Add drift-triggered alerts as a safety net. Move to drift-triggered retraining only when scheduled retraining is too slow to respond to real-world changes.


## Questions

> [!QUESTION]- What is the difference between data drift and concept drift?
> Data drift: the input distribution P(X) changes (users ask different questions, new product categories appear). The model's learned relationship P(Y|X) may still be valid.
> Concept drift: the relationship P(Y|X) changes (what constitutes spam evolves, fraud patterns shift). The model's learned relationship is no longer valid — retraining is required.
> Cost of confusing them: retraining on new data for concept drift is necessary; retraining for benign data drift wastes resources and may reduce performance on the original distribution.

> [!QUESTION]- How do you detect drift when labels are delayed?
> Use proxy metrics: escalation rate, user complaints, re-contact rate, or model confidence distributions. Monitor input feature distributions (PSI, KS test) as an early warning signal. When labels arrive, compute actual performance metrics and compare to baseline.

## References

- [Data drift in machine learning models (Evidently AI)](https://www.evidentlyai.com/ml-in-production/data-drift) — practitioner guide to drift types, detection methods, and monitoring workflows with Python examples.
- [Population Stability Index (PSI) explained](https://www.listendata.com/2015/05/population-stability-index.html) — detailed explanation of PSI calculation, interpretation thresholds, and use in credit scoring.
- [Monitoring ML models in production (Google MLOps)](https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning) — Google's MLOps guide covering data validation, model monitoring, and retraining triggers.
- [Failing Loudly: An Empirical Study of Methods for Detecting Dataset Shift (Rabanser et al., 2019)](https://arxiv.org/abs/1810.11953) — empirical comparison of drift detection methods across different shift types and dataset sizes.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/11 AI & ML\|11 AI & ML]]
>
> **Topics**
> - [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/Evaluation\|Evaluation]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Types\|Types]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Machine Learning/Natural Language Processing\|Natural Language Processing]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Spectrum Of Automations\|Spectrum Of Automations]]
<!-- whats-next:end -->
