---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/machine-learning/evaluation/evaluation/","tags":["FolderNote"],"dg-note-properties":{"topic":["AI & ML"],"subtopic":["Machine Learning"],"tags":["FolderNote"],"priority":"Medium","level":["3"],"status":"Done"}}
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

- Classification at an operating point: precision, recall, F1, confusion matrix — see [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/Classification Evaluation\|Classification Evaluation]]
- Classification ranking across thresholds: [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/ROC-AUC and PR-AUC\|ROC-AUC and PR-AUC]]
- Calibration: Brier score, reliability diagrams, expected calibration error
- Regression: RMSE, MAE, MAPE, quantile loss
- Information retrieval: NDCG, MAP, MRR — defined in depth in [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring#Retrieval Quality Metrics\|RAG Monitoring]]

## Choosing a Metric Family

| Question you are answering | Metric family | Where it is covered |
| --- | --- | --- |
| Is the classifier right at its chosen threshold? | Precision, recall, F1, confusion matrix | [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/Classification Evaluation\|Classification Evaluation]] |
| How good is the ranking across all thresholds? | ROC-AUC, PR-AUC | [[Software Engineering/11 AI & ML/Machine Learning/Evaluation/ROC-AUC and PR-AUC\|ROC-AUC and PR-AUC]] |
| Can I trust the predicted probabilities? | Brier score, ECE, reliability diagrams | Not yet covered as its own note |
| How far off are continuous predictions? | RMSE, MAE, MAPE, quantile loss | This hub (summary above) |
| Did the right items rank at the top of a result list? | NDCG, MAP, MRR | [[Software Engineering/11 AI & ML/LLM/RAG/Monitoring#Retrieval Quality Metrics\|RAG Monitoring]] |

Pick the family from the decision, not from habit: threshold metrics for a fixed operating point, ranking metrics for comparing models before a threshold exists, calibration metrics when downstream logic consumes probabilities rather than labels.

## Questions

> [!QUESTION]- When should you distrust a single evaluation metric?
> - When the metric does not encode the cost asymmetry of the decision, for example accuracy on imbalanced classes
> - When the test set does not represent production traffic, for example random split on time-dependent data
> - When the metric looks good overall but fails on critical slices or cohorts
> - When the metric is a ranking metric but you need calibrated probabilities for downstream logic

## References

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
