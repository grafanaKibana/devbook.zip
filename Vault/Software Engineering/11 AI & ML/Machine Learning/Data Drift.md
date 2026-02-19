---
topic:
  - "AI & ML"
subtopic:
  - "Machine Learning"
level:
  - "1"
priority: Low
status: Creation

dg-publish: true
---

# Intro

Data drift is when the statistical properties of your input data change over time compared to the data your model was trained on. It matters because models usually assume training and serving data come from the same distribution; when that stops being true, predictions can become less reliable.

Concrete examples include:

- A fraud model trained on last year's purchase behavior sees a spike in new payment methods and merchant categories.
- A vision model deployed to a new camera has different brightness/contrast due to sensor and lighting changes.

## Deeper Explanation

What typically drifts:

- Feature distributions (means, ranges, category frequencies)
- Missingness patterns (null rate changes)
- Correlations between features

How it relates to other drift terms:

- Data drift (often used for feature drift): P(X) changes
- Label drift (prior probability shift): P(Y) changes
- Concept drift: P(Y|X) changes (the relationship changes)

How to detect it in practice:

- Define a baseline window (e.g., training data or last 30 days of stable serving)
- Compare baseline vs current window per feature
- Use simple, interpretable tests/metrics (e.g., PSI, KS test for numeric; chi-square for categorical)
- Segment monitoring (region, device, customer tier) to avoid averages hiding drift

Example: compute PSI (Population Stability Index) for one numeric feature using binned proportions:

```python
import numpy as np

def psi(expected, actual, bins=10, eps=1e-6):
    # expected: baseline values, actual: current values
    quantiles = np.quantile(expected, np.linspace(0, 1, bins + 1))
    # ensure unique bin edges
    edges = np.unique(quantiles)
    if len(edges) < 3:
        return 0.0

    exp_counts, _ = np.histogram(expected, bins=edges)
    act_counts, _ = np.histogram(actual, bins=edges)
    exp_p = np.maximum(exp_counts / max(exp_counts.sum(), 1), eps)
    act_p = np.maximum(act_counts / max(act_counts.sum(), 1), eps)
    return float(np.sum((act_p - exp_p) * np.log(act_p / exp_p)))
```

What to do when you detect drift:

- First rule out pipeline issues (schema changes, unit changes, broken ETL, encoding bugs)
- Check performance if labels are available (drift without performance drop can be benign)
- Decide on response: retrain, update features, adjust thresholds, add guardrails, or route to manual review

## Questions

- Which features are the most drift-sensitive for this model, and what are their alert thresholds?
- Can we measure model performance quickly (delayed labels, proxy metrics), or only drift?
- Do we need separate baselines per segment (market, device, seasonality)?

## Links

[Data drift in machine learning models - Evidently AI](https://www.evidentlyai.com/ml-in-production/data-drift)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/11 AI & ML|11 AI & ML]]
>
> **Topics**
> - [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/Evaluation|Evaluation]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Types|Types]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Machine Learning/Natural Language Processing|Natural Language Processing]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Spectrum Of Automations|Spectrum Of Automations]]
<!-- whats-next:end -->
