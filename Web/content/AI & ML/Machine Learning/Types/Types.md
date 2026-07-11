---
publish: true
created: 2026-07-11T18:29:52.600Z
modified: 2026-07-11T18:29:52.601Z
published: 2026-07-11T18:29:52.601Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - Machine Learning
summary: Machine learning types describe how a model learns from data and feedback; the choice drives data, training, evaluation, and operational complexity.
status: Done
priority: Low
level:
  - "1"
---

# Intro

Machine learning types describe how a model learns from data and feedback. Choosing the wrong type is expensive: it changes your data requirements, training loop, evaluation criteria, and operational complexity from day one. The decision is driven by what signal you have, not by what architecture is fashionable.

<nav style="--map-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Types section map"><p class="folder-map-empty">No notes in this section yet.</p><style>
.folder-structure-map {
  --map-accent: 16, 185, 129;
  --map-gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  margin: 0.5rem 0 0.75rem;
  container-name: folder-map;
  container-type: inline-size;
}
.folder-map-children {
  /* Flex (not grid) so each card sizes to its own title — a long title widens
     its card and pushes to another row instead of being truncated, and rows
     grow to fill the width with no empty tracks when there are few cards. */
  display: flex;
  flex-wrap: wrap;
  gap: var(--map-gap);
}
.folder-map-node {
  position: relative;
  /* No overflow:hidden here: on a flex item that collapses min-width:auto to 0,
     letting the card shrink below its title + note-count and clip them. Without
     it, the card's min size is its content, so long titles widen the card (and
     wrap to another row) instead of being cut off. The accent gradient gets its
     own border-radius below to stay inside the rounded corners. */
  flex: 1 1 12rem;
  min-height: 2.75rem;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.folder-map-node::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--map-accent), 0.09) 0%,
    rgba(var(--map-accent), 0.04) 38%,
    rgba(var(--map-accent), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.folder-map-node:hover,
.folder-map-node:focus-within {
  border-color: rgba(var(--map-accent), 0.55);
  background-color: color-mix(in srgb, rgb(var(--map-accent)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.folder-map-node:hover::before,
.folder-map-node:focus-within::before {
  opacity: 1;
}
.folder-map-node-body {
  position: relative;
  z-index: 0;
  display: flex;
  min-height: 2.75rem;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  padding: 0.5rem 0.75rem;
}
.folder-map-node-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.folder-map-node-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.folder-map-entry-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--map-accent));
}
.folder-map-entry-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}
.folder-map-node-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
}
.folder-map-node p {
  display: none;
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.folder-map-node-count {
  display: block;
  flex: 0 0 auto;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  white-space: nowrap;
}
.folder-map-hit {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.folder-map-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.folder-map-hit a:focus-visible {
  outline: 2px solid rgb(var(--map-accent));
  outline-offset: -0.3rem;
}
.folder-map-empty {
  margin: 1rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
}
@container folder-map (min-width: 40rem) {
  .folder-map-node {
    min-height: 6rem;
  }
  .folder-map-node-body {
    min-height: 6rem;
    justify-content: flex-start;
    padding: 0.85rem 0.9rem;
  }
  .folder-map-node p { display: block; }
}
@container folder-map (min-width: 64rem) {
  .folder-map-node,
  .folder-map-node-body { min-height: 6.75rem; }
}
@media (prefers-reduced-motion: reduce) {
  .folder-map-node { transition: none; }
  .folder-map-node::before { transition: none; }
  .folder-map-node:hover,
  .folder-map-node:focus-within { transform: none; }
}
</style></nav>

## Supervised Learning

Train on labeled input-output pairs and optimize prediction quality directly against known targets.

**Mechanism**: At each step, the model predicts an output, computes loss against the ground-truth label, and updates parameters via backpropagation. Training continues until validation loss plateaus or a business metric threshold is met.

**Concrete example**: Label 50k support tickets with owning team (`Billing`, `Security`, `Platform`). Train a text classifier. Route new tickets automatically with human override for low-confidence cases. Measure precision/recall per team.

**Data requirements**: Labeled examples for every class or target range. Quality matters more than quantity — 10k clean labels outperform 100k noisy ones.

**Key limitations**: Label cost scales with problem complexity. Distribution shift between training and production degrades performance silently. Global metrics (AUC, accuracy) can hide failures on high-value slices.

**When to use**: Any time you have reliable labels and an explicit prediction target. Default choice for classification, regression, and ranking.

## Unsupervised Learning

Find structure in data without target labels — segmentation, anomaly detection, or compact representations.

**Mechanism**: The model optimizes an objective that captures structure in the input space: grouping similar points (k-means, DBSCAN), reconstructing inputs with fewer dimensions (PCA, autoencoders), or flagging observations that deviate from baseline (isolation forest).

**Concrete example**: A payments team clusters merchants by transaction behavior (volume, velocity, category mix) using k-means. Discovered segments reveal a hidden high-risk cohort that manual review missed. Segments guide policy review and prioritize future labeling.

**Data requirements**: No labels needed. Large unlabeled datasets work well. Feature engineering matters more than in supervised settings because there is no loss signal to guide representation learning.

**Key limitations**: No ground truth to validate against — cluster quality is subjective. Different seeds or hyperparameters can produce different results. Downstream utility must be validated separately.

**When to use**: Exploratory analysis, anomaly detection, dimensionality reduction before a supervised task, or when labeling is infeasible.

## Self-Supervised Learning

Build supervision from raw data by creating proxy prediction tasks. Pretrain on unlabeled corpora, then fine-tune on small labeled datasets.

**Mechanism**: Design a proxy objective that the model can optimize without human labels — masked token prediction (BERT), next-token prediction (GPT), contrastive image pairs (SimCLR). The learned representation transfers to downstream tasks with limited labels.

**Concrete example**: An enterprise search system pretrains embeddings on 10M internal documents using a contrastive objective (similar documents should be close in embedding space). Fine-tuned on 2k relevance-labeled query-document pairs. Retrieval quality improves 18% over a supervised-only baseline trained on the same 2k pairs.

**Data requirements**: Large unlabeled corpus for pretraining. Small labeled dataset for fine-tuning. Pretraining data quality and diversity matter — domain mismatch between pretraining and target task reduces transfer.

**Key limitations**: Pretraining is compute-intensive. Proxy objective may not capture structure relevant to the target task. Pretraining loss improving does not guarantee downstream quality improving.

**When to use**: Language, vision, and multimodal systems where labels are scarce but unlabeled data is abundant. Foundation of modern LLMs and vision transformers.

## Semi-Supervised Learning

Combine a small labeled dataset with a larger unlabeled dataset to reduce labeling cost while maintaining supervised-level performance.

**Mechanism**: Train an initial model on labeled data. Generate pseudo-labels for high-confidence unlabeled examples. Retrain on the combined set. Repeat. Variants include consistency regularization (predictions should be stable under augmentation) and graph-based label propagation.

**Concrete example**: A moderation team has 8k labeled toxic comments and 2M unlabeled comments. Initial classifier achieves 82% precision. Accept pseudo-labels with confidence >0.95 (adds 180k examples). Retrain: precision rises to 87%. Validation guards prevent minority-class recall from dropping.

**Data requirements**: Small labeled set + large unlabeled set. Pseudo-label quality depends on initial model quality — a weak initial model produces noisy pseudo-labels that compound errors.

**Key limitations**: Pseudo-labeling amplifies majority classes unless explicitly constrained. Incorrect pseudo-labels reinforce errors. Requires careful threshold tuning and class-conditional calibration.

**When to use**: When labeling is expensive but you have abundant unlabeled data and a clear target variable. Common in NLP, medical imaging, and content moderation.

## Reinforcement Learning

Train an agent to choose actions that maximize long-term reward through interaction with an environment.

**Mechanism**: At each step, the agent observes state, takes an action, receives reward, and transitions to a new state. Training optimizes expected cumulative reward (not immediate reward). Reward design and simulator quality are critical — the agent will find shortcuts if the reward function is incomplete.

**Concrete example**: A customer-support routing policy optimizes escalation decisions across multiple steps. Immediate reward: resolution probability. Long-term reward: customer satisfaction score and handling cost. The RL policy learns to delay escalation for borderline cases, reducing cost by 12% while maintaining satisfaction.

**Data requirements**: A simulator or real environment to interact with. Reward signal for each action. Large amounts of interaction data (orders of magnitude more than supervised learning for equivalent performance).

**Key limitations**: Reward design is hard — proxy rewards lead to specification gaming. Exploration is expensive and risky in production. Evaluation requires online A/B testing, not offline metrics. Debugging is difficult.

**When to use**: Sequential decision-making where outcome quality depends on multiple steps and delayed feedback. Avoid for one-step prediction problems where supervised learning works — RL adds operational risk without benefit.

## Comparison

| Type | Labeled Data | Compute Cost | Typical Applications | Key Libraries |
|------|-------------|--------------|---------------------|---------------|
| Supervised | Required (all) | Low–medium | Classification, regression, ranking | scikit-learn, XGBoost, PyTorch |
| Unsupervised | None | Low–medium | Clustering, anomaly detection, dimensionality reduction | scikit-learn, UMAP |
| Self-Supervised | Pretraining: none; Fine-tuning: small | High (pretraining) | LLMs, vision transformers, embeddings | Hugging Face, PyTorch |
| Semi-Supervised | Small labeled + large unlabeled | Medium | NLP, medical imaging, moderation | scikit-learn, PyTorch |
| Reinforcement | Reward signal only | Very high | Robotics, game AI, recommendation | Stable Baselines3, RLlib |

## Decision Rule

**Start with supervised learning** if you have reliable labels and an explicit prediction target. It is the simplest to evaluate, debug, and operate.

**Use unsupervised learning** when you have no labels and need to explore structure, detect anomalies, or reduce dimensionality before a supervised task.

**Use self-supervised learning** when you have abundant unlabeled data and scarce labels, especially for language or vision tasks. Pretrain on unlabeled data, fine-tune on labeled data.

**Use semi-supervised learning** when labeling is expensive but you have a clear target variable and abundant unlabeled data. Start with a supervised baseline first — if it already meets your quality bar, stop there.

**Use reinforcement learning** only when the problem is genuinely sequential and delayed-reward. If a one-step supervised model can solve it, use that instead. RL adds reward design complexity, exploration risk, and operational overhead that is rarely justified for single-step decisions.

## References

- [Google ML Intro — What is ML?](https://developers.google.com/machine-learning/intro-to-ml/what-is-ml) — Google's canonical intro to ML types with clear definitions and examples
- [scikit-learn — Supervised learning](https://scikit-learn.org/stable/supervised_learning.html) — practical supervised learning reference with algorithms, parameters, and use-case guidance
- [Hugging Face — Self-supervised learning](https://huggingface.co/blog/self-supervised-learning) — practitioner explanation of SSL and its role in LLM and vision model pretraining
- [OpenAI Spinning Up in Deep RL](https://spinningup.openai.com/en/latest/spinningup/rl_intro.html) — canonical RL intro from practitioners; covers policy gradients, value functions, and exploration
- [Rules of ML](https://developers.google.com/machine-learning/guides/rules-of-ml) — Google's practical ML engineering guide; covers when to use ML vs simpler approaches
