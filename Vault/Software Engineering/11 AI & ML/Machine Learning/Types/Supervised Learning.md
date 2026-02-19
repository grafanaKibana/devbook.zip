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

Supervised learning trains a model on labeled input-output pairs so the model can predict a known target for new examples. It is usually the first choice when reliable labels exist and the business objective is explicit, such as classification or regression. The practical value is straightforward evaluation: you can measure performance directly against ground truth.

## How It Works

Training repeatedly compares model predictions with known labels, computes a loss, and updates parameters to reduce that loss. Good supervised systems depend as much on label quality, feature quality, and split strategy as on model choice.

## Examples

Support tickets are labeled with owning team (`Billing`, `Security`, `Platform`). Train a text classifier on historical labeled tickets, then route new tickets automatically and keep human override for low-confidence cases.

## Pitfalls

- Label leakage can create inflated offline metrics when training features include post-outcome information. This happens when feature pipelines do not enforce time boundaries. Mitigate with time-aware feature audits and strict train/serve parity checks.
- Label noise can cap model quality even with stronger architectures. This happens when annotation rules are inconsistent across reviewers. Mitigate with sampled label audits, disagreement tracking, and relabeling of high-impact slices.

## Questions

> [!QUESTION]- What should be checked first when a fraud model has strong offline ROC-AUC but production loss increases after deployment?
> - Verify leakage by auditing whether any training feature uses post-event information.
> - Compare train, validation, and production distributions for key features and class balance.
> - Inspect threshold calibration against business cost, not just AUC.
> - Review label latency and stale ground-truth pipelines.
> - Check slice-level metrics for high-value segments where loss is concentrated.
> - Why: global metrics can hide operational failures caused by leakage, calibration drift, or segment skew.

> [!QUESTION]- How should the decision be made between collecting 20k more labels and training a larger model now?
> - Measure current label quality using agreement rates and error audits.
> - Estimate expected uplift from better labels versus model capacity via ablation.
> - Check whether current errors are data-limited or representation-limited.
> - Compare cost and timeline of labeling versus training/inference expansion.
> - Prefer the option that improves the highest-cost failure slices first.
> - Why: supervised systems are often bottlenecked by data quality before model size.

## References

- [Supervised learning (Google Developers)](https://developers.google.com/machine-learning/intro-to-ml/supervised)
- [scikit-learn supervised learning](https://scikit-learn.org/stable/supervised_learning.html)
- [Rules of ML engineering](https://developers.google.com/machine-learning/guides/rules-of-ml)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/Machine Learning/Machine Learning|Machine Learning]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Reinforcement Learning|Reinforcement Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Self-Supervised Learning|Self-Supervised Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Semi-Supervised Learning|Semi-Supervised Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Unsupervised Learning|Unsupervised Learning]]
<!-- whats-next:end -->
