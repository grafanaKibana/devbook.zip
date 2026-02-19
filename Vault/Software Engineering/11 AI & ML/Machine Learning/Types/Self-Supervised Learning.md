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

Self-supervised learning builds supervision from raw data itself by creating proxy prediction tasks. It is useful when labels are scarce but unlabeled corpora are large, especially in language, vision, and multimodal systems.

You pretrain a model on a proxy objective such as masked-token prediction, then adapt the learned representation to downstream tasks with limited labels.
Transfer quality depends on whether the pretraining objective captures structure that matters for the target task.
For Example, an enterprise search system pretrains embeddings on a large internal document corpus with a contrastive objective, then fine-tunes on a small relevance-labeled dataset for ranking.

## Questions

> [!QUESTION]- What should be investigated when pretraining loss improves but downstream retrieval quality does not?
> - Verify that the proxy objective aligns with the downstream task semantics.
> - Inspect training data contamination and duplicate-heavy corpora effects.
> - Evaluate embedding quality with retrieval-focused metrics, not only pretraining loss.
> - Compare against a supervised-only baseline on the same evaluation slices.
> - Audit augmentation and negative sampling choices for shortcut learning.
> - Why: pretraining metrics can improve while transferable representation quality stays flat.

> [!QUESTION]- How should the tradeoff between more pretraining and earlier fine-tuning be decided under limited labels and compute?
> - Start with a small pretraining run and measure downstream gain per compute unit.
> - Stop pretraining when marginal downstream lift plateaus on validation slices.
> - Allocate compute to fine-tuning and evaluation if transfer gain is small.
> - Keep reproducible checkpoints to compare different cutover points.
> - Why: compute should be optimized for end-task value, not proxy-task progress.

## References

- [A Cookbook of Self-Supervised Learning](https://arxiv.org/abs/2304.12210)
- [BERT: Pre-training of Deep Bidirectional Transformers](https://arxiv.org/abs/1810.04805)
- [Learning Transferable Visual Models From Natural Language Supervision (CLIP)](https://arxiv.org/abs/2103.00020)
- [OpenAI CLIP research write-up](https://openai.com/research/clip)
- [Bootstrap Your Own Latent A New Approach to Self-Supervised Learning](https://arxiv.org/abs/2006.07733)
- [SEER self-supervised computer vision at scale (Meta Engineering)](https://ai.meta.com/blog/seer-the-start-of-a-more-powerful-flexible-and-accessible-era-for-computer-vision/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/11 AI & ML/Machine Learning/Machine Learning|Machine Learning]]
>
> **Pages**
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Reinforcement Learning|Reinforcement Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Semi-Supervised Learning|Semi-Supervised Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Supervised Learning|Supervised Learning]]
> - [[Software Engineering/11 AI & ML/Machine Learning/Types/Unsupervised Learning|Unsupervised Learning]]
<!-- whats-next:end -->
