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

Semi-supervised learning combines a small labeled dataset with a larger unlabeled dataset. It matters when labeling is expensive but you still need supervised-level performance on a clear target variable.

## How It Works

The model first learns from labeled data, then extends training signal with unlabeled examples through pseudo-labeling, consistency regularization, or graph-based propagation. The key risk is reinforcing incorrect pseudo-labels.

## Examples

A moderation team has 8,000 labeled toxic comments and 2 million unlabeled comments. They train an initial classifier, pseudo-label only high-confidence predictions, and retrain with confidence thresholds and validation guards.

## Pitfalls

- Pseudo-label confirmation bias can amplify early mistakes. This happens when low-confidence predictions are fed back as ground truth. Mitigate with conservative confidence thresholds and periodic reset to trusted labels.
- Class imbalance can worsen during pseudo-labeling. This happens when majority-class predictions dominate unlabeled data. Mitigate with class-aware sampling, per-class thresholds, and monitored recall on minority classes.

## Questions

> [!QUESTION]- What should be done next if pseudo-labeling raises overall accuracy but lowers minority-class recall?
> - Inspect pseudo-label precision per class, not only global accuracy.
> - Raise thresholds for noisy classes and rebalance sampling weights.
> - Add class-conditional calibration before accepting pseudo-labels.
> - Re-run evaluation on minority-heavy slices with fixed supervised baseline.
> - Keep rollback criteria based on business-costed recall targets.
> - Why: pseudo-labeling often amplifies majority classes unless explicitly constrained.

> [!QUESTION]- Should a supervised-only baseline be removed after pseudo-labeling gains?
> - Keep the supervised-only baseline as a safety and regression reference.
> - Compare uplift across multiple time windows to detect drift in pseudo-label quality.
> - Use baseline deltas to decide when to retrain or tighten thresholds.
> - Retire the baseline only after long-term stability and slice-level consistency.
> - Why: without a trusted baseline, noise accumulation is hard to detect early.

## References

- [Pseudo-Label: The Simple and Efficient Semi-Supervised Learning Method](https://arxiv.org/abs/1908.02983)
- [FixMatch: Simplifying Semi-Supervised Learning](https://arxiv.org/abs/2001.07685)
- [scikit-learn semi-supervised learning](https://scikit-learn.org/stable/modules/semi_supervised.html)
- [FixMatch reference implementation (Google Research)](https://github.com/google-research/fixmatch)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/Machine Learning/Machine Learning|Machine Learning]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Reinforcement Learning|Reinforcement Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Self-Supervised Learning|Self-Supervised Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Supervised Learning|Supervised Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Unsupervised Learning|Unsupervised Learning]]
<!-- whats-next:end -->
