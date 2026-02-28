---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/machine-learning/evaluation/evaluation/","tags":["FolderNote"],"noteIcon":"3"}
---


# Intro

Evaluation is how you measure whether a model actually solves the problem it was built for, under the conditions it will face in production. The gap between offline metrics and real-world usefulness is where most ML projects fail silently. A senior engineer needs to pick the right metric for the decision, understand what each curve and score hides, and connect evaluation to business outcomes and deployment gates.

## Deeper Explanation

Key decisions when evaluating a classifier or regressor:

- Define the success metric from business constraints first, then map it to a technical metric
- Always evaluate on data the model has never seen, with a split strategy that simulates the future
- Report multiple metrics: a single number hides tradeoffs between precision, recall, calibration, and ranking
- Slice evaluation by segments that matter operationally: user cohorts, time windows, edge cases

Common metric families:

- Classification ranking: [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/ROC-AUC and PR-AUC\|ROC-AUC and PR-AUC]], F1, precision at k, recall at k
- Calibration: Brier score, reliability diagrams, expected calibration error
- Regression: RMSE, MAE, MAPE, quantile loss
- Information retrieval: NDCG, MAP, MRR

## Questions

> [!QUESTION]- When should you distrust a single evaluation metric?
> - When the metric does not encode the cost asymmetry of the decision, for example accuracy on imbalanced classes
> - When the test set does not represent production traffic, for example random split on time-dependent data
> - When the metric looks good overall but fails on critical slices or cohorts
> - When the metric is a ranking metric but you need calibrated probabilities for downstream logic

## Links

- [scikit-learn model evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html)
- [ML.NET model evaluation metrics](https://learn.microsoft.com/dotnet/machine-learning/resources/metrics)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/Machine Learning/Machine Learning\|Machine Learning]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/Classification Evaluation\|Classification Evaluation]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/ROC-AUC and PR-AUC\|ROC-AUC and PR-AUC]]
<!-- whats-next:end -->
