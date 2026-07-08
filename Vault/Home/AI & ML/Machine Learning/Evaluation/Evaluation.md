---
topic:
  - AI & ML
subtopic:
  - Machine Learning
tags:
  - FolderNote
publish: true
priority: Medium
level:
  - "3"
status: Done
---

# Intro

Evaluation is how you measure whether a model actually solves the problem it was built for, under the conditions it will face in production. The gap between offline metrics and real-world usefulness is where most ML projects fail silently. A senior engineer needs to pick the right metric for the decision, understand what each curve and score hides, and connect evaluation to business outcomes and deployment gates. This hub orients the family of metrics; the dedicated pages — [[Classification Evaluation]], [[ROC-AUC and PR-AUC]], and [[Calibration]] — carry the depth.

## The Evaluation Discipline

Four decisions matter more than the choice of metric itself:

- **Derive the metric from the decision.** Start from the business cost of each error type, then map it to a technical metric — not the reverse. Accuracy on a 0.1% fraud problem is meaningless; the decision (block vs allow, at what cost) dictates whether precision, recall, or expected value is the target.
- **Evaluate on data the model has never seen, split to simulate the future.** Random splits are fine for IID data; use time-based or group-based splits when records are temporally or session correlated, or the metric will be optimistic in a way that only surfaces in production. Keep a true holdout you never tune against.
- **Report multiple metrics.** A single number hides the tradeoff between precision and recall, between ranking and calibration. Pair a threshold metric with a ranking metric, and add calibration whenever probabilities are consumed downstream.
- **Slice by segments that matter operationally.** Aggregate scores average over cohorts, time windows, and edge cases — the exact places regressions hide. Slice by user cohort, geography, device, and time, and treat a degraded slice as a defect even when the aggregate looks healthy.

The recurring failure across all four is the **offline–online gap**: a metric that improves on a static test set but does not move (or reverses) on real traffic. Treat offline metrics as a gate, not as proof — confirm with production monitoring and, where possible, a controlled experiment.

## Metric Families

| Question you are answering | Metric family | Where it is covered |
| --- | --- | --- |
| Is the classifier right at its chosen threshold? | Precision, recall, F1, confusion matrix | [[Home/AI & ML/Machine Learning/Evaluation/Classification Evaluation|Classification Evaluation]] |
| How good is the ranking across all thresholds? | ROC-AUC, PR-AUC | [[Home/AI & ML/Machine Learning/Evaluation/ROC-AUC and PR-AUC|ROC-AUC and PR-AUC]] |
| Can I trust the predicted probabilities? | Brier score, ECE, reliability diagrams | [[Home/AI & ML/Machine Learning/Evaluation/Calibration|Calibration]] |
| How far off are continuous predictions? | RMSE, MAE, MAPE, quantile loss | This hub (summary below) |
| Did the right items rank at the top of a result list? | NDCG, MAP, MRR | [[Home/AI & ML/LLM/RAG/Monitoring#Retrieval Quality Metrics|RAG Monitoring]] |

Pick the family from the decision, not from habit: threshold metrics for a fixed operating point, ranking metrics for comparing models before a threshold exists, calibration metrics when downstream logic consumes probabilities rather than labels.

### Regression Metrics

For continuous targets:

- **RMSE** (root mean squared error) penalizes large errors quadratically — use it when big misses are disproportionately costly and errors are roughly Gaussian. Sensitive to outliers.
- **MAE** (mean absolute error) penalizes errors linearly and is robust to outliers — use it when all errors scale equally and a few large ones should not dominate.
- **MAPE** (mean absolute percentage error) expresses error as a fraction of the true value — readable for stakeholders, but undefined at zero and biased toward under-prediction. Avoid it when targets span zero or vary by orders of magnitude.
- **Quantile (pinball) loss** targets a specific quantile rather than the mean — use it when you need prediction intervals or asymmetric over/under-prediction costs (forecasting safety stock, capacity planning).

Decision rule: default to RMSE when large errors hurt most and MAE when they should not dominate; report both, since a large gap between them signals heavy-tailed errors. Use MAPE only for stakeholder communication on strictly positive targets, and quantile loss when the product needs intervals, not point estimates.

## Pitfalls

**Optimizing the metric instead of the outcome.** A metric is a proxy. Driving a single offline number up can degrade the real objective — a recommender tuned purely for click-through can surface clickbait that lowers retention. Pair every optimization target with a guardrail metric for the outcome it is supposed to serve.

**Leakage inflating every metric at once.** When a feature encodes the label (a post-event timestamp, an ID that correlates with the target), all metrics look excellent offline and collapse in production. Suspect leakage when results are too good; audit features for information unavailable at inference time, especially in time-based joins.

**Threshold chosen on the same data it is reported on.** Selecting the operating point and reporting precision/recall on the same split overstates performance. Choose the threshold on a validation split, then report on a separate test split.

## Questions

> [!QUESTION]- When should you distrust a single evaluation metric?
> - When the metric does not encode the cost asymmetry of the decision, for example accuracy on imbalanced classes
> - When the test set does not represent production traffic, for example a random split on time-dependent data
> - When the metric looks good overall but fails on critical slices or cohorts
> - When the metric is a ranking metric but you need calibrated probabilities for downstream logic

> [!QUESTION]- Why is the offline–online gap the central risk in ML evaluation?
> - Offline metrics are computed on a frozen sample; production traffic shifts in distribution, user behavior, and edge-case mix that the sample never captured
> - A change can improve the offline number while leaving real outcomes flat — or reverse them — because the offline set rewards patterns that do not generalize
> - Leakage, non-representative splits, and metric-proxy mismatch all widen the gap silently
> - The mitigation is layered: offline metrics as a release gate, production monitoring to catch drift, and controlled experiments to confirm a real effect before trusting it

## References

- [scikit-learn model evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html)
- [ML.NET model evaluation metrics](https://learn.microsoft.com/dotnet/machine-learning/resources/metrics)
