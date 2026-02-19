---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/machine-learning/types/types/","tags":["FolderNote"],"noteIcon":"1"}
---


# Intro

Machine learning types describe how a model learns from data and feedback.
The most common families are now split into focused notes: [[Software Engineering/11 AI & ML/Machine Learning/Types/Supervised Learning\|Supervised Learning]], [[Software Engineering/11 AI & ML/Machine Learning/Types/Unsupervised Learning\|Unsupervised Learning]], [[Software Engineering/11 AI & ML/Machine Learning/Types/Self-Supervised Learning\|Self-Supervised Learning]], [[Software Engineering/11 AI & ML/Machine Learning/Types/Semi-Supervised Learning\|Semi-Supervised Learning]], and [[Software Engineering/11 AI & ML/Machine Learning/Types/Reinforcement Learning\|Reinforcement Learning]].
Picking the right type matters because it changes your data requirements, training loop, and evaluation criteria from day one.
In practice, choose based on the signal you have: labeled outcomes point to supervised learning, unlabeled corpora often point to unsupervised or self-supervised learning, sparse labels can benefit from semi-supervised learning, and action-reward environments call for reinforcement learning.

## Families

- [[Software Engineering/11 AI & ML/Machine Learning/Types/Supervised Learning\|Supervised Learning]]: train from labeled input-output pairs and optimize prediction quality directly.
- [[Software Engineering/11 AI & ML/Machine Learning/Types/Unsupervised Learning\|Unsupervised Learning]]: discover latent structure in unlabeled data, such as clusters or low-dimensional representations.
- [[Software Engineering/11 AI & ML/Machine Learning/Types/Self-Supervised Learning\|Self-Supervised Learning]]: generate proxy tasks from raw data to learn transferable representations before downstream fine-tuning.
- [[Software Engineering/11 AI & ML/Machine Learning/Types/Semi-Supervised Learning\|Semi-Supervised Learning]]: combine small labeled sets with larger unlabeled sets to reduce labeling cost.
- [[Software Engineering/11 AI & ML/Machine Learning/Types/Reinforcement Learning\|Reinforcement Learning]]: optimize long-horizon decision policies from interaction and reward signals.

## Tradeoffs

- **Supervised vs semi-supervised:** supervised is simpler to operate but depends on enough high-quality labels; semi-supervised reduces labeling cost but adds pseudo-label noise risk and more tuning.
- **Unsupervised vs self-supervised:** unsupervised clustering is fast for exploration, while self-supervised pretraining often yields stronger transferable features but requires more compute.
- **Supervised vs reinforcement learning:** supervised is easier to evaluate offline; RL can optimize long-horizon behavior but demands careful reward design and online safety guardrails.

## References

- [What is machine learning?](https://developers.google.com/machine-learning/intro-to-ml/what-is-ml)
- [Supervised learning](https://developers.google.com/machine-learning/intro-to-ml/supervised)
- [Rules of ML: Best practices for ML engineering](https://developers.google.com/machine-learning/guides/rules-of-ml)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/Machine Learning/Machine Learning\|Machine Learning]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Reinforcement Learning\|Reinforcement Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Self-Supervised Learning\|Self-Supervised Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Semi-Supervised Learning\|Semi-Supervised Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Supervised Learning\|Supervised Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Unsupervised Learning\|Unsupervised Learning]]
<!-- whats-next:end -->
