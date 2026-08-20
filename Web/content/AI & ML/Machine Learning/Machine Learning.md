---
publish: true
created: 2026-08-20T20:41:15.506Z
modified: 2026-08-20T20:41:15.506Z
published: 2026-08-20T20:41:15.506Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - Machine Learning
summary: Training models to learn input-output mappings from data. The real work is the pipeline.
status: Done
priority: Medium
level:
  - "3"
---

Machine learning fits problems where useful behavior can be learned from examples more cheaply than it can be expressed as rules. The model is only one part of the system. Data collection, evaluation, serving, and monitoring usually carry more operational risk than the training algorithm itself.

ML earns its cost when the decision boundary is hard to write down or the signal is spread across many weak features. Rules remain the better tool when the logic is stable, must be audited exactly, or needs predictable behavior around expensive errors. [[Spectrum Of Automations]] places those choices on the same continuum.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Machine Learning section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Evaluation">Evaluation</span></span><span class="folder-map-node-count">3 notes</span></div><p class="db-card-summary">Measuring whether a model solves its real problem in production by picking the right metric.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Evaluation/Evaluation.md" data-tooltip-position="top" aria-label="Evaluation">Evaluation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Types">Types</span></span><span class="folder-map-node-count">0 notes</span></div><p class="db-card-summary">How a model learns from data and feedback. The choice drives data, training, and evaluation.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Types/Types.md" data-tooltip-position="top" aria-label="Types">Types</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Data Drift">Data Drift</span></span></div><p class="db-card-summary">When production inputs shift away from training data, potentially weakening model predictions without an obvious error.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Data Drift.md" data-tooltip-position="top" aria-label="Data Drift">Data Drift</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Natural Language Processing">Natural Language Processing</span></span></div><p class="db-card-summary">Turning language into machine-usable representations for extraction, classification, search, and generation. Transformers are now common.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Natural Language Processing.md" data-tooltip-position="top" aria-label="Natural Language Processing">Natural Language Processing</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Spectrum Of Automations">Spectrum Of Automations</span></span></div><p class="db-card-summary">Five levels of AI involvement, from fully human-driven to fully autonomous.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Spectrum Of Automations.md" data-tooltip-position="top" aria-label="Spectrum Of Automations">Spectrum Of Automations</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Training

## Generic Pipeline

```mermaid
flowchart TD
  A[Data collection] --> B[Data cleaning]
  B --> C[Feature engineering]
  C --> D[Train test split]
  D --> E[Model training]
  E --> F[Evaluation]
  F --> G[Hyperparameter tuning]
  G --> H[Model registry]
  H --> I[Deployment]
  I --> J[Inference endpoint]
  J --> K[Monitoring]
  K --> A
```

## Pipeline Stages

### Data Collection and Labeling

Define the prediction target before collecting features. Every input must be available at inference time and should resemble production traffic. Labeling often becomes the bottleneck because ground truth needs an owner, a written definition, and a way to measure disagreement. Collection may start with SQL or event logs and grow into distributed processing only when the volume requires it.

### Data Cleaning and Preprocessing

Preprocessing turns raw records into deterministic model inputs. Missing values, duplicates, outliers, and schema changes need explicit handling. Time and join logic deserve extra scrutiny: a feature built with future information can make every offline result look convincing while guaranteeing a production failure. The same transformations must run during training and inference.

### Feature Engineering and Selection

Feature engineering turns raw columns into signals the model can use: aggregates, time windows, text representations, or embeddings, depending on the problem described in [[AI & ML/Machine Learning/Types/Types|Types]] and [[Natural Language Processing]]. Simple features are easier to reproduce and diagnose. A more expensive feature needs enough measurable gain to pay for its serving and maintenance cost. Domain constraints and ablation tests are stronger evidence than feature importance alone.

### Train Test Validation Split

The split should simulate the model's next real prediction. Random splits work for independent, identically distributed records. Time-based or group-based splits are safer when rows share a user, session, or time window. Keep one holdout set outside model and threshold tuning. Repeated inspection quietly turns a test set into another validation set.

### Model Selection and Training

Start with a baseline that is easy to explain and reproduce. Linear models and trees cover many tabular problems. Gradient boosting is often the next serious baseline. Deep learning is justified by unstructured inputs or a measured advantage large enough to cover its extra cost. Distributed training solves a scale problem, not a modeling problem.

### Evaluation Metrics

Metrics must match the decision and the cost of a mistake. Accuracy is useful only when class balance and error costs make it meaningful. Precision and recall expose different failure modes. A ranking metric can compare models before an operating threshold is fixed. For regression, RMSE makes large misses dominate the score. No metric repairs a test set that does not represent production.

### Hyperparameter Tuning

Treat tuning as a budgeted experiment. Fix the search space, target metric, and stopping rule before running it. Random search is a sensible first pass because only a few parameters usually matter. Bayesian optimization becomes useful when each training run is expensive. The holdout set stays untouched throughout.

### Model Registry and Versioning

Store each model as an immutable artifact with enough lineage to rebuild it: code revision, data snapshot, feature definition, parameters, and evaluation results. Promotion changes the stage of an existing version rather than overwriting the artifact. That makes rollback and audit work mechanical instead of forensic.

### Deployment

Serving mode follows the product's time budget. Batch scoring covers decisions that can wait. Request-time inference pays for low latency. Streaming reacts as events arrive. Release the model behind a canary or controlled experiment, with a fallback for overload and model errors. Packaging must keep the runtime and preprocessing consistent with training.

### Inference Endpoint

An inference endpoint is a production service with an SLO. Its latency budget includes feature lookup and preprocessing, not just the model call. Capacity planning should use tail latency and expected concurrency. Version the request schema and model together so an otherwise valid deployment cannot receive inputs shaped for another version.

### Monitoring and Retraining

Monitoring has two clocks. Service health appears immediately through latency, errors, and saturation. Model quality may arrive days later when labels become available. Track input quality and [[Data Drift]] while waiting, but do not confuse drift with proof that predictions became worse. Retraining should follow a measurable trigger and pass the same evaluation gate as the original model.

# References

- [Machine Learning Crash Course (Google for Developers)](https://developers.google.com/machine-learning/crash-course)
- [Machine Learning for Beginners (Microsoft)](https://microsoft.github.io/ML-For-Beginners/#/)
- [Rules of Machine Learning (Google for Developers)](https://developers.google.com/machine-learning/guides/rules-of-ml)
- [scikit-learn user guide](https://scikit-learn.org/stable/user_guide.html)
- [Hidden Technical Debt in Machine Learning Systems (NeurIPS 2015)](https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html)
