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

Unsupervised learning finds structure in data without target labels. Use it when you have large unlabeled datasets and need segmentation, anomaly detection, or compact representations before a supervised task exists.
At a high level, the model optimizes an objective that captures structure in the input space, such as grouping similar points, reconstructing inputs with fewer dimensions, or flagging observations that do not match baseline behavior.
For Example, a payments team clusters merchants by transaction behavior to discover hidden risk segments, then uses those segments to guide policy review and prioritize future labeling.

## Questions

> [!QUESTION]- How do you determine whether k-means results are usable when different seeds produce different clusters?
> - Run multiple seeds and compare stability with adjusted Rand index or similar overlap metrics.
> - Evaluate whether clusters remain meaningful to domain experts across runs.
> - Validate downstream utility, for example policy lift or targeting precision.
> - Check sensitivity to feature scaling and distance metric assumptions.
> - Prefer the simplest configuration that is stable and operationally interpretable.
> - Why: unstable clusters usually indicate weak signal or overfitting to initialization noise.

> [!QUESTION]- Should unsupervised learning be the starting point for customer segmentation when churn labels already exist?
> - Start with a supervised churn baseline to quantify immediate business impact.
> - Use clustering as a complementary lens for exploration and cohort discovery.
> - Test whether cluster features improve supervised metrics or intervention design.
> - Avoid replacing a known target task with unsupervised objectives by default.
> - Why: when labels exist, supervised learning usually maps more directly to outcomes.

## References

- [Clustering (Google Developers)](https://developers.google.com/machine-learning/clustering)
- [scikit-learn clustering guide](https://scikit-learn.org/stable/modules/clustering.html)
- [scikit-learn anomaly detection](https://scikit-learn.org/stable/modules/outlier_detection.html)
- [scikit-learn dimensionality reduction](https://scikit-learn.org/stable/modules/decomposition.html)
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
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Supervised Learning|Supervised Learning]]
<!-- whats-next:end -->
