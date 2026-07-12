---
publish: true
created: 2026-07-11T21:43:42.040Z
modified: 2026-07-11T21:43:42.040Z
published: 2026-07-11T21:43:42.040Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - Machine Learning
summary: Training models to learn input-output mappings from data; the real work is the pipeline.
status: Done
priority: Medium
level:
  - "3"
---

# Intro

Machine learning is the practice of training models to map inputs to outputs from data rather than encoding the behavior as explicit rules. It matters for a senior engineer because most of the real work is not the algorithm, it is building a reliable pipeline that is testable, deployable, and monitorable. Reach for ML when the decision boundary is fuzzy, the signal is distributed across many weak features, or the rules would be brittle and expensive to maintain. Prefer rules or heuristics when requirements are stable, the logic is auditable, and the error cost is asymmetric and must be tightly controlled; see also [[Spectrum Of Automations]].

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Machine Learning section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Data Drift">Data Drift</span></span></div><p class="db-card-summary">When input data shifts away from the training distribution, silently degrading model predictions.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Data Drift.md" data-tooltip-position="top" aria-label="Data Drift">Data Drift</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Evaluation">Evaluation</span></span><span class="folder-map-node-count">3 notes</span></div><p class="db-card-summary">Measuring whether a model solves its real problem in production by picking the right metric.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Evaluation/Evaluation.md" data-tooltip-position="top" aria-label="Evaluation">Evaluation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Natural Language Processing">Natural Language Processing</span></span></div><p class="db-card-summary">The AI field enabling computers to understand and generate human language, now dominated by transformers.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Natural Language Processing.md" data-tooltip-position="top" aria-label="Natural Language Processing">Natural Language Processing</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Spectrum Of Automations">Spectrum Of Automations</span></span></div><p class="db-card-summary">Five levels of AI involvement, from fully human-driven to fully autonomous.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Spectrum Of Automations.md" data-tooltip-position="top" aria-label="Spectrum Of Automations">Spectrum Of Automations</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="Types">Types</span></span><span class="folder-map-node-count">0 notes</span></div><p class="db-card-summary">How a model learns from data and feedback; the choice drives data, training, and evaluation.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Types/Types.md" data-tooltip-position="top" aria-label="Types">Types</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

## Training

### Generic pipeline

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

### Pipeline Stages

#### Data Collection and Labeling

Define the prediction target first, then collect inputs that are available at inference time and representative of production traffic. Labeling is usually the bottleneck: decide who labels, what counts as ground truth, and how you measure label quality and consistency. Common tools include SQL, Spark, event logs, data warehouses, plus labeling tooling like Label Studio or in product human review queues.

#### Data Cleaning and Preprocessing

Make the raw data usable: handle missing values, outliers, duplicates, schema drift, and text normalization, while keeping transformations deterministic. Key decisions are what to impute, what to drop, and how to encode time and joins without leaking future information. Typical tooling is pandas, PySpark, Great Expectations, and feature preprocessing via scikit learn transformers.

#### Feature Engineering and Selection

Turn raw columns into signals the model can learn, such as aggregates, time windows, text features, or embeddings, depending on the problem type ([[AI & ML/Machine Learning/Types/Types|Types]], [[Natural Language Processing]]). Decide between simple, stable features and complex features that improve accuracy but increase operational risk. For selection, use domain constraints first, then model based importance and ablation tests; consider a feature store if many teams share features.

#### Train Test Validation Split

Split data to simulate the future: random splits work for IID data, but time based or group based splits are safer for temporal, user, or session correlated data. Keep a true holdout test set you do not touch until the end to estimate generalization. Tools include scikit learn splitters, plus custom splits for time series and leakage resistant grouping.

#### Model Selection and Training

Start with a strong baseline that is easy to debug, then scale up complexity only if it buys material business value. Pick algorithms that match constraints: linear and tree models for tabular data, gradient boosting for strong tabular baselines, deep learning for unstructured signals. Tooling spans scikit learn, XGBoost, LightGBM, PyTorch, TensorFlow, plus distributed training when data or models grow.

#### Evaluation Metrics

Choose metrics that match the decision and the cost of mistakes. Accuracy works when classes are balanced and errors are symmetric; precision and recall matter when false positives and false negatives have different costs; F1 is a single number when you need a balance. AUC ROC is useful for ranking quality across thresholds, but can look good even when the operating point is poor; for regression, RMSE penalizes large errors and is appropriate when big misses are costly and errors are roughly Gaussian.

#### Hyperparameter Tuning

Treat tuning as budgeted search: define the search space, metric, and stopping rules, and keep the test set untouched. Grid search is simple but expensive, random search is often a better first pass, and Bayesian optimization helps when evaluations are costly and the space is continuous. Common tooling: scikit learn search CV, Optuna, Ray Tune, and Weights and Biases sweeps.

#### Model Registry and Versioning

Store models as artifacts with immutable versions, and log the full lineage: code, data snapshot identifiers, features, hyperparameters, and metrics. This is what makes rollbacks, audits, and reproducibility possible. Typical tools are MLflow Model Registry and Weights and Biases artifacts, backed by object storage.

#### Deployment

Decide serving mode based on product needs: batch for offline scoring, real time for user facing decisions, and streaming for event driven scoring. Containerize the runtime to make it consistent, and release with canary or A B tests to control risk and measure uplift. Common stacks include Docker, Kubernetes, serverless jobs, and CI CD orchestration for model promotion.

#### Inference Endpoint

An endpoint is a production service with an SLO: define a latency budget, throughput target, and availability goals, then size compute and caching accordingly. Keep preprocessing consistent with training by packaging it with the model and versioning the schema. Serving frameworks include FastAPI, BentoML, KServe, Seldon, TorchServe, and TensorFlow Serving.

#### Monitoring and Retraining

Monitor both system health and model health: latency, error rate, and saturation, plus data quality, drift, and performance over time. Plan for feedback loops and delayed labels, and set retraining triggers that are measurable and cost aware; see [[Data Drift]] for drift concepts. A good pipeline makes retraining boring: automated, repeatable, and gated by evaluation.

## Questions

> [!QUESTION]- How should an ML pipeline be designed to ship weekly batch churn scoring now while preserving a path to real-time scoring later?
>
> - Start with batch to ship value, but define a stable feature contract and a single preprocessing implementation shared by batch and online
> - Store features and predictions with versioned schema so you can backtest and replay later
> - Use a model registry with stage promotion and rollback, and keep training code runnable in CI
> - Plan the online boundary now: which features are available at request time and which require async enrichment
> - Add monitoring from day one so you have drift and label delay visibility before moving to real time

> [!QUESTION]- What should be checked first when a binary classifier shows 98 percent accuracy but support tickets rise, and which metric should be optimized next?
>
> - Check class balance and the confusion matrix; high accuracy can hide poor recall on the minority class
> - Inspect label quality and leakage sources, especially time based joins and post event signals
> - Pick metrics based on cost: optimize precision if false positives are expensive, recall if misses are expensive, or use PR AUC for heavy imbalance
> - Tune the decision threshold using a cost curve or expected value, not the default 0.5
> - Run slice based evaluation to find the segments where the model fails and decide whether to collect more data or add features

> [!QUESTION]- What tradeoffs and rollout plan are appropriate when the best model exceeds a strict API latency budget?
>
> - Measure end to end latency budget including preprocessing, network, and tail latencies, then decide if you can meet SLO with scaling or caching
> - Consider a smaller model, distillation, quantization, or a two stage setup where a cheap model gates the expensive one
> - Use canary or A B rollout with guardrails on latency and key business metrics, plus automated rollback
> - Keep a safe fallback decision path, such as a baseline model or rules, for overload and error conditions
> - Align evaluation with production: test on representative traffic and monitor training serving skew after launch

## References

- [Machine Learning Crash Course (Google for Developers)](https://developers.google.com/machine-learning/crash-course)
- [Machine Learning for Beginners (Microsoft)](https://microsoft.github.io/ML-For-Beginners/#/)
- [Rules of Machine Learning (Google for Developers)](https://developers.google.com/machine-learning/guides/rules-of-ml)
- [scikit-learn user guide](https://scikit-learn.org/stable/user_guide.html)
- [Hidden Technical Debt in Machine Learning Systems (NeurIPS 2015)](https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html)
