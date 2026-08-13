---
topic:
  - AI & ML
subtopic:
  - Machine Learning
summary: "Measuring whether a model solves its real problem in production by picking the right metric."
tags: [FolderNote]
publish: true
priority: Medium
level:
  - "3"
status: Done
---

Evaluation asks a plain question: does the model solve the problem it was built for under production conditions? An offline score is only a proxy for that answer. The work is choosing a metric that matches the decision, knowing what the score hides, and setting a release gate that reflects the cost of mistakes. The dedicated pages on [[Classification Evaluation]], [[ROC-AUC and PR-AUC]], and [[Calibration]] cover the individual metric families in more depth.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# The Evaluation Discipline

Metric choice comes after four decisions:

- **Start with the decision cost.** A metric should represent what a wrong answer costs. Accuracy says little on a fraud dataset with a 0.1% positive rate. The choice to block or allow a transaction, and the cost of each error, determines whether precision, recall, or expected value matters.
- **Make the split resemble the future.** Random splits suit independent, identically distributed records. Time-based or group-based splits are safer when events share a user, session, or time window. Keep a holdout set outside the tuning loop.
- **Use enough metrics to expose the tradeoff.** A single score can hide the operating threshold or poor probability estimates. Pair threshold and ranking metrics, then check calibration when downstream logic consumes probabilities.
- **Inspect operational slices.** Aggregate results smooth over the cohorts and time windows where regressions tend to appear. A weak critical slice is still a defect when the global score looks healthy.

All four decisions feed the same risk: the **offline-online gap**. A change can improve a frozen test score while doing nothing for live traffic, or even making the outcome worse. Offline evaluation can block a bad release. Production monitoring and controlled experiments establish whether the release was actually better.

# Metric Families

Threshold metrics such as precision, recall, and F1 describe a chosen operating point. ROC-AUC and PR-AUC compare ranking quality across thresholds. Brier score and expected calibration error test whether predicted probabilities deserve their numerical meaning. Retrieval ranking has a separate set of measures, including NDCG, MAP, and MRR, covered in [[Home/AI & ML/LLM/Context Engineering/RAG/Monitoring#Retrieval Quality Metrics\|RAG Monitoring]].

## Regression Metrics

Continuous targets need a different family:

- **RMSE** squares each error before averaging, so a few large misses dominate the result. It fits decisions where a large miss is much more expensive than several small ones.
- **MAE** weights error linearly. It is easier to interpret and less sensitive to outliers.
- **MAPE** expresses error relative to the true value. It breaks at zero and behaves poorly when targets span several orders of magnitude.
- **Quantile loss** estimates a chosen conditional quantile. It fits prediction intervals and decisions with different costs for overprediction and underprediction.

RMSE and MAE are worth reporting together. A wide gap between them often points to a heavy-tailed error distribution. MAPE is useful only for strictly positive targets where percentage error is meaningful. Quantile loss belongs in systems that need a range or an asymmetric decision, rather than one point estimate.

# Pitfalls

**Optimizing the proxy.** A recommender tuned only for click-through rate can learn to surface clickbait and reduce retention. Guardrail metrics need to cover the outcome the optimization target can damage.

**Leakage making every score look excellent.** A post-event timestamp or label-correlated identifier can reveal the answer during training. That information disappears at inference time. Suspiciously strong results call for an audit of feature availability, especially around time-based joins.

**Choosing and reporting a threshold on the same data.** This makes precision and recall optimistic. Select the operating point on validation data, then report it once on the untouched test set.

# Questions

> [!QUESTION]- When is a single evaluation metric insufficient for a release decision?
> - The metric ignores the cost difference between false positives and false negatives
> - The test split does not represent production traffic or the order in which data arrives
> - An aggregate score hides a regression in a critical cohort
> - A ranking score looks strong while downstream logic depends on calibrated probabilities

> [!QUESTION]- Why can an offline improvement fail to produce a better production outcome?
> - The frozen test sample can miss shifts in traffic, behavior, or rare cases
> - Leakage and an unrealistic split can reward patterns that are unavailable in production
> - The chosen metric may be only loosely connected to the business decision
> - Offline metrics should gate the release. Monitoring and controlled experiments verify the live effect

# References

- [scikit-learn model evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html) — Official guide to scoring APIs, classification and regression metrics, calibration, and model-selection caveats.
- [ML.NET model evaluation metrics](https://learn.microsoft.com/dotnet/machine-learning/resources/metrics) — Microsoft reference for interpreting the metrics exposed by ML.NET evaluators.
