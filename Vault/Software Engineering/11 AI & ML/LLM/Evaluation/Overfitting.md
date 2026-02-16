---
topic:
  - "AI & ML"
subtopic:
  - "LLM"
level:
  - "3"
priority: Medium
status: Creation

dg-publish: true
---

# Intro

Overfitting is when a model learns patterns that are too specific to the training data (including noise), so it performs well on training examples but worse on unseen data. In LLM applications this shows up during fine-tuning, prompt optimization, or evaluation overfitting (tuning to your benchmark while real users get worse).

## Deeper Explanation

How to detect overfitting:

- Training loss keeps improving while validation loss flattens or worsens.
- Quality improves on your dev set but degrades on a truly held-out set.
- Errors cluster around slightly different phrasings than seen in training.
- The model starts to mimic training examples (memorization-like behavior).

Common causes:

- Too many training steps/epochs for the dataset size
- Data leakage (test examples accidentally in train, or near-duplicates)
- Non-representative eval set (easy or too similar to train)
- Optimizing prompts/rubrics to one benchmark distribution

Mitigations (practical):

- Improve splits: deduplicate, do time-based splits, and keep a true holdout.
- Early stopping on validation metrics (not only training loss).
- Reduce effective capacity/updates: fewer epochs, smaller learning rate, smaller LoRA rank.
- Add regularization where supported (weight decay, dropout) and data augmentation.
- Expand evaluation: more diverse prompts, paraphrases, and edge cases.

## Example

Early stopping logic (generic) using a validation metric:

```python
best = None
patience = 3
bad = 0

for epoch in range(1, 100):
    train_one_epoch()
    val_score = evaluate_on_validation_set()  # higher is better

    if best is None or val_score > best:
        best = val_score
        save_checkpoint()
        bad = 0
    else:
        bad += 1
        if bad >= patience:
            break
```

Evaluation overfitting example:

- You keep iterating on a prompt until it maximizes a single judge score on your dev set.
- It becomes overly verbose and "judge-friendly" while real users complain about slow, indirect answers.
- Fix: introduce multiple eval dimensions, add human spot checks, and keep a frozen holdout set.

## Questions

> [!QUESTION]- How do I know if I'm overfitting my prompt?
> If improvements only show up on your dev set but not on a holdout set (or online metrics), you are likely tuning to that benchmark. Add paraphrased variants, segment tests, and an untouched holdout.

> [!QUESTION]- Is overfitting the same as hallucinations?
> No. Overfitting is a generalization problem. Hallucinations are often a grounding/knowledge/control problem. They can co-occur (a fine-tune can increase hallucinations), but you treat them differently.

## Links

- [Underfitting vs. overfitting (scikit-learn example)](https://scikit-learn.org/stable/auto_examples/model_selection/plot_underfitting_overfitting.html)
- [Machine Learning Crash Course - Overfitting](https://developers.google.com/machine-learning/crash-course/generalization/overfitting)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/LLM/LLM|LLM]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks|Deterministic Checks]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs|Golden Test Set and Regression Runs]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/LLM-as-a-Judge|LLM-as-a-Judge]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Online Evaluation and AB Tests|Online Evaluation and AB Tests]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Pairwise Comparisons|Pairwise Comparisons]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Rubric Scorecards|Rubric Scorecards]]
> - [[Software Engineering/11 AI & ML/LLM/Evaluation/Targeted Evals|Targeted Evals]]
<!-- whats-next:end -->
