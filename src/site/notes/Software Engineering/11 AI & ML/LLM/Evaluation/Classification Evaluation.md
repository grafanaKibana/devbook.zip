---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/llm/evaluation/classification-evaluation/","noteIcon":"1"}
---


# Intro

Classification evaluation is how you measure whether a model assigns the right label (or set of labels) for an input. In software terms: you want to quantify the failure modes (false alarms vs misses), pick an operating point (threshold), and prevent regressions when data/model changes.

## Deeper Explanation

### Start with the decision you are actually shipping

- Binary classification: yes/no (spam, fraud, safe/unsafe)
- Multi-class: exactly one label among N (intent routing)
- Multi-label: multiple labels can be true (topics, policy flags)

Make sure your eval matches production behavior:

- If you ship a hard label: evaluate label metrics at the chosen threshold.
- If you ship a probability/score: also evaluate probability quality (log loss, calibration).
- If you route work: measure *downstream* impact too (cost of manual review, user harm, latency).

### Confusion matrix (the basic building block)

For binary classification, every prediction falls into one bucket:

```text
TP: predicted positive, actually positive
FP: predicted positive, actually negative
TN: predicted negative, actually negative
FN: predicted negative, actually positive
```

Think of it like an alerting system:

- FP = noisy alerts (wasted time, bad UX)
- FN = missed incidents (risk)

### Core metrics (binary)

All metrics below come from TP/FP/TN/FN.

```text
accuracy   = (TP + TN) / (TP + FP + TN + FN)
precision  = TP / (TP + FP)
recall     = TP / (TP + FN)   # sensitivity, TPR
specificity= TN / (TN + FP)   # TNR
F1         = 2 * (precision * recall) / (precision + recall)
```

- Accuracy = (TP + TN) / (TP + FP + TN + FN)
  - Use when classes are balanced and FP/FN costs are similar.
  - Pitfall: can look great on imbalanced data while missing most positives.

- Precision = TP / (TP + FP)
  - "When we say positive, how often are we right?"
  - High precision means low false-alarm rate *among predicted positives*.
  - Useful when positives trigger expensive actions (blocking users, pagers).

- Recall (Sensitivity, TPR) = TP / (TP + FN)
  - "Of the real positives, how many did we catch?"
  - High recall means few misses.
  - Useful when misses are costly (fraud escaping, unsafe content).

- Specificity (TNR) = TN / (TN + FP)
  - "Of the real negatives, how many did we correctly ignore?"
  - Useful when negatives dominate and you care about not bothering users.

- F1 score = harmonic mean of precision and recall
  - A single number when you care about both FP and FN.
  - Pitfall: hides which side (precision vs recall) is failing.

- F-beta score
  - Like F1, but weights recall higher (beta > 1) or precision higher (beta < 1).
  - Useful when you can explicitly encode the business cost tradeoff.

- Balanced accuracy = (TPR + TNR) / 2
  - Useful for imbalanced datasets where plain accuracy is misleading.

### Less common but useful metrics

- Matthews Correlation Coefficient (MCC)
  - A single score that stays informative under class imbalance.
  - Useful when you want one number that accounts for all 4 confusion-matrix cells.

- Cohen's kappa
  - Measures agreement beyond what you'd expect from base rates (chance).
  - Useful when class frequencies are very skewed and you want to correct for that.

- Top-k accuracy (multi-class)
  - "Was the correct label in the model's top k suggestions?"
  - Useful for assistive UIs and routing systems that show multiple options.

### Thresholding and operating points

Many classifiers output a score/probability. Turning that into a label requires a threshold.

- Lower threshold: more positives predicted (recall up, precision often down)
- Higher threshold: fewer positives predicted (precision up, recall often down)

Engineering approach:

- Pick a metric target that matches the constraint you must satisfy (e.g. recall >= 0.95) and then maximize the other side under that constraint.
- Or define a cost function (FP_cost, FN_cost) and choose the threshold that minimizes expected cost.

### ROC-AUC vs PR-AUC (ranking quality)

These metrics evaluate how well the model *ranks* positives above negatives across all thresholds.

- ROC curve: TPR vs FPR across thresholds; ROC-AUC is the area under it.
  - Good when classes are reasonably balanced and you care about ranking.
  - Can look deceptively good on highly imbalanced problems.

- Precision-Recall (PR) curve: precision vs recall across thresholds; PR-AUC (often reported as Average Precision).
  - Usually more informative when positives are rare.
  - Better aligned with "find the needles" problems (fraud, abuse, incidents).

### Probability metrics and calibration

If your model outputs probabilities (or you treat scores like probabilities), you should measure whether those probabilities are meaningful.

- Log loss (cross-entropy)
  - Penalizes confident wrong predictions heavily.
  - Useful when you want well-behaved probabilities, not just hard labels.

- Brier score
  - Mean squared error between predicted probability and outcome (0/1).
  - Another probability-quality metric; often easier to reason about than log loss.

- Calibration (reliability)
  - "When the model says 0.8 confidence, does it end up correct about 80% of the time?"
  - Evaluate with calibration curves / reliability diagrams; report an aggregate error (e.g. Expected Calibration Error) if you use it internally.
  - Practical impact: better threshold selection, safer automation (route uncertain cases to humans).

### Multi-class and multi-label metrics

- Per-class precision/recall/F1 is the first thing to look at.
- Averaging strategies:
  - Macro average: treat each class equally (good when rare classes matter).
  - Micro average: aggregate all decisions (good when overall throughput matters).
  - Weighted average: macro weighted by class frequency (can hide rare-class failures).

For multi-label tasks, metrics are usually computed per label and then averaged; also consider exact-match accuracy if you truly need all labels correct.

### What to put in a PR or model card

- Confusion matrix (or per-class breakdown)
- Precision/recall/F1 at the shipped threshold
- PR-AUC (or ROC-AUC) if you ship a tunable threshold
- Calibration/log loss if you consume probabilities downstream
- Segment breakdowns (key cohorts, languages, traffic sources)
- A stable golden test set run (regression safety)

## Example

Binary classifier evaluated on 100 labeled examples at threshold 0.5:

```text
TP = 32
FP = 8
TN = 50
FN = 10

accuracy  = (32 + 50) / 100 = 0.82
precision = 32 / (32 + 8)   = 0.80
recall    = 32 / (32 + 10)  = 0.76
F1        = 2 * (0.80 * 0.76) / (0.80 + 0.76) = 0.78
```

If this classifier blocks content:

- If you get too many false blocks (FP), raise the threshold or optimize for precision.
- If unsafe content slips through (FN), lower the threshold or optimize for recall.

## Questions

> [!QUESTION]- Which metric should I optimize?
> Optimize the metric that matches the *cost of being wrong* in production. If false positives are expensive (blocking, escalations), prioritize precision. If false negatives are risky (fraud, safety), prioritize recall. If you need one number, use F-beta with beta chosen from the business tradeoff.

> [!QUESTION]- When should I use ROC-AUC vs PR-AUC?
> For rare positives, PR-AUC is usually the better signal. ROC-AUC can stay high even when the model produces many false positives in absolute terms.

> [!QUESTION]- How do I pick a threshold?
> Pick it on a validation set using a constraint (e.g. recall >= 0.95) or a cost function (FP_cost/FN_cost). Then lock it and regression-test it on your golden set.

> [!QUESTION]- What do I do if probabilities are not calibrated?
> Consider calibration techniques (Platt scaling / isotonic regression) and re-check calibration by segment. Even if you only ship labels, calibration helps you route low-confidence cases to humans.

## Links

- [Scikit-learn: Classification metrics](https://scikit-learn.org/stable/modules/model_evaluation.html#classification-metrics)
- [Scikit-learn API: precision_recall_fscore_support](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.precision_recall_fscore_support.html)
- [Scikit-learn: ROC AUC and Average Precision](https://scikit-learn.org/stable/modules/model_evaluation.html#receiver-operating-characteristic-roc)
- [Scikit-learn: Probability calibration](https://scikit-learn.org/stable/modules/calibration.html)
- [Scikit-learn API: log_loss](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.log_loss.html)
- [Google ML Glossary](https://developers.google.com/machine-learning/glossary)
- [Google ML Crash Course: Accuracy, precision, recall](https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM\|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks\|Deterministic Checks]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs\|Golden Test Set and Regression Runs]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/LLM-as-a-Judge\|LLM-as-a-Judge]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Online Evaluation and AB Tests\|Online Evaluation and AB Tests]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Overfitting\|Overfitting]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Pairwise Comparisons\|Pairwise Comparisons]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Rubric Scorecards\|Rubric Scorecards]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Targeted Evals\|Targeted Evals]]
<!-- whats-next:end -->
