---
publish: true
created: 2026-07-11T21:43:52.579Z
modified: 2026-07-11T21:43:52.579Z
published: 2026-07-11T21:43:52.579Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - Machine Learning
summary: Measuring whether a model solves its real problem in production by picking the right metric.
priority: Medium
level:
  - "3"
status: Done
---

# Intro

Evaluation is how you measure whether a model actually solves the problem it was built for, under the conditions it will face in production. The gap between offline metrics and real-world usefulness is where most ML projects fail silently. A senior engineer needs to pick the right metric for the decision, understand what each curve and score hides, and connect evaluation to business outcomes and deployment gates. This hub orients the family of metrics; the dedicated pages — [[Classification Evaluation]], [[ROC-AUC and PR-AUC]], and [[Calibration]] — carry the depth.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Evaluation section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Calibration">Calibration</span></span></div><p class="db-card-summary">Whether predicted probabilities match reality: 0.7 predictions should be right about 70% of the time.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Evaluation/Calibration.md" data-tooltip-position="top" aria-label="Calibration">Calibration</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Classification Evaluation">Classification Evaluation</span></span></div><p class="db-card-summary">Measuring whether a model assigns the right label: false alarms versus misses at a chosen threshold.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Evaluation/Classification Evaluation.md" data-tooltip-position="top" aria-label="Classification Evaluation">Classification Evaluation</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="ROC-AUC and PR-AUC">ROC-AUC and PR-AUC</span></span></div><p class="db-card-summary">Threshold-free ranking metrics: ROC-AUC for balanced data, PR-AUC for imbalanced data with costly false positives.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/Machine Learning/Evaluation/ROC-AUC and PR-AUC.md" data-tooltip-position="top" aria-label="ROC-AUC and PR-AUC">ROC-AUC and PR-AUC</a></span></article></div><style>
.db-card {
  position: relative;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.db-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--card-accent, 125, 125, 125), 0.09) 0%,
    rgba(var(--card-accent, 125, 125, 125), 0.04) 38%,
    rgba(var(--card-accent, 125, 125, 125), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.db-card:hover,
.db-card:focus-within {
  border-color: rgba(var(--card-accent, 125, 125, 125), 0.55);
  background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.db-card:hover::before,
.db-card:focus-within::before { opacity: 1; }
.db-card-body {
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: var(--db-card-pad, 0.85rem 0.9rem);
}
.db-card-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--card-accent, 125, 125, 125));
}
.db-card-icon svg { display: block; width: 100%; height: 100%; }
.db-card-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}
/* Element-qualified (p.db-card-summary) on purpose: it ties the specificity of
   Obsidian reading view's ".markdown-rendered p" and, being injected later in
   the body, wins. A bare ".db-card-summary" loses to it, so Obsidian keeps its
   default paragraph spacing and the description gets large gaps above/below.
   Quartz doesn't add those margins, which is why the gap only showed there. */
p.db-card-summary {
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.db-card-hit { position: absolute; inset: 0; z-index: 1; }
.db-card-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.db-card-hit a:focus-visible {
  outline: 2px solid rgb(var(--card-accent, 125, 125, 125));
  outline-offset: -0.3rem;
}
@media (prefers-reduced-motion: reduce) {
  .db-card { transition: none; }
  .db-card::before { transition: none; }
  .db-card:hover,
  .db-card:focus-within { transform: none; }
}

.folder-structure-map {
\--card-accent: 16, 185, 129;
\--map-gap: 0.75rem;
width: 100%;
box-sizing: border-box;
margin: 0.5rem 0 0.75rem;
container-name: folder-map;
container-type: inline-size;
}
.folder-map-children {
/\* Flex (not grid) so each card sizes to its own title — a long title widens
its card and pushes to another row instead of being truncated, and rows
grow to fill the width with no empty tracks when there are few cards. _/
display: flex;
flex-wrap: wrap;
gap: var(--map-gap);
}
.folder-map-node {
/_ No overflow:hidden on a flex item whose min-width:auto collapses to 0: that
would let the card shrink below its title + note-count and clip them.
Without it the card's min size is its content, so long titles widen the card
(and wrap to another row) instead of being cut off. The shared ::before
accent uses border-radius:inherit to stay inside the rounded corners. _/
flex: 1 1 12rem;
min-height: 2.75rem;
\--db-card-pad: 0.5rem 0.75rem;
}
.folder-map-node .db-card-body {
min-height: 2.75rem;
justify-content: center;
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
.folder-map-node .db-card-title {
white-space: nowrap;
}
.folder-map-node-count {
display: block;
flex: 0 0 auto;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
white-space: nowrap;
}
.folder-map-node .db-card-summary {
display: none;
}
/_ Empty-section placeholder: a muted gray dashed card (not raw text), reusing
the .db-card chrome but with the accent gradient and hover lift neutralized. \*/
.folder-map-node-empty {
border-style: dashed;
background-color: var(--background-secondary, rgba(125, 125, 125, 0.06));
cursor: default;
}
.folder-map-node-empty::before { display: none; }
.folder-map-node-empty:hover,
.folder-map-node-empty:focus-within {
border-color: var(--background-modifier-border, var(--lightgray, #d8dee9));
background-color: var(--background-secondary, rgba(125, 125, 125, 0.06));
box-shadow: none;
transform: none;
}
.folder-map-node-empty .db-card-body {
justify-content: center;
align-items: center;
text-align: center;
}
.folder-map-empty-text {
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.9rem;
font-style: italic;
}
@container folder-map (min-width: 40rem) {
.folder-map-node {
min-height: 6rem;
\--db-card-pad: 0.85rem 0.9rem;
}
.folder-map-node .db-card-body {
min-height: 6rem;
justify-content: flex-start;
}
.folder-map-node .db-card-summary { display: block; }
}
@container folder-map (min-width: 64rem) {
.folder-map-node,
.folder-map-node .db-card-body { min-height: 6.75rem; }
} </style></nav>

## The Evaluation Discipline

Four decisions matter more than the choice of metric itself:

- **Derive the metric from the decision.** Start from the business cost of each error type, then map it to a technical metric — not the reverse. Accuracy on a 0.1% fraud problem is meaningless; the decision (block vs allow, at what cost) dictates whether precision, recall, or expected value is the target.
- **Evaluate on data the model has never seen, split to simulate the future.** Random splits are fine for IID data; use time-based or group-based splits when records are temporally or session correlated, or the metric will be optimistic in a way that only surfaces in production. Keep a true holdout you never tune against.
- **Report multiple metrics.** A single number hides the tradeoff between precision and recall, between ranking and calibration. Pair a threshold metric with a ranking metric, and add calibration whenever probabilities are consumed downstream.
- **Slice by segments that matter operationally.** Aggregate scores average over cohorts, time windows, and edge cases — the exact places regressions hide. Slice by user cohort, geography, device, and time, and treat a degraded slice as a defect even when the aggregate looks healthy.

The recurring failure across all four is the **offline–online gap**: a metric that improves on a static test set but does not move (or reverses) on real traffic. Treat offline metrics as a gate, not as proof — confirm with production monitoring and, where possible, a controlled experiment.

## Metric Families

Pick the family from the decision, not from habit: threshold metrics (precision, recall, F1) for a fixed operating point, ranking metrics (ROC-AUC, PR-AUC) for comparing models before a threshold exists, and calibration metrics (Brier, ECE) when downstream logic consumes probabilities rather than labels. For ranking items within a retrieved list (NDCG, MAP, MRR), see [[AI & ML/LLM/RAG/Monitoring#Retrieval Quality Metrics|RAG Monitoring]]. Regression targets get their own family, covered below.

### Regression Metrics

For continuous targets:

- **RMSE** (root mean squared error) penalizes large errors quadratically — use it when big misses are disproportionately costly and errors are roughly Gaussian. Sensitive to outliers.
- **MAE** (mean absolute error) penalizes errors linearly and is robust to outliers — use it when all errors scale equally and a few large ones should not dominate.
- **MAPE** (mean absolute percentage error) expresses error as a fraction of the true value — readable for stakeholders, but undefined at zero and biased toward under-prediction. Avoid it when targets span zero or vary by orders of magnitude.
- **Quantile (pinball) loss** targets a specific quantile rather than the mean — use it when you need prediction intervals or asymmetric over/under-prediction costs (forecasting safety stock, capacity planning).

Decision rule: default to RMSE when large errors hurt most and MAE when they should not dominate; report both, since a large gap between them signals heavy-tailed errors. Use MAPE only for stakeholder communication on strictly positive targets, and quantile loss when the product needs intervals, not point estimates.

## Pitfalls

**Optimizing the metric instead of the outcome.** A metric is a proxy. Driving a single offline number up can degrade the real objective — a recommender tuned purely for click-through can surface clickbait that lowers retention. Pair every optimization target with a guardrail metric for the outcome it is supposed to serve.

**Leakage inflating every metric at once.** When a feature encodes the label (a post-event timestamp, an ID that correlates with the target), all metrics look excellent offline and collapse in production. Suspect leakage when results are too good; audit features for information unavailable at inference time, especially in time-based joins.

**Threshold chosen on the same data it is reported on.** Selecting the operating point and reporting precision/recall on the same split overstates performance. Choose the threshold on a validation split, then report on a separate test split.

## Questions

> [!QUESTION]- When should you distrust a single evaluation metric?
>
> - When the metric does not encode the cost asymmetry of the decision, for example accuracy on imbalanced classes
> - When the test set does not represent production traffic, for example a random split on time-dependent data
> - When the metric looks good overall but fails on critical slices or cohorts
> - When the metric is a ranking metric but you need calibrated probabilities for downstream logic

> [!QUESTION]- Why is the offline–online gap the central risk in ML evaluation?
>
> - Offline metrics are computed on a frozen sample; production traffic shifts in distribution, user behavior, and edge-case mix that the sample never captured
> - A change can improve the offline number while leaving real outcomes flat — or reverse them — because the offline set rewards patterns that do not generalize
> - Leakage, non-representative splits, and metric-proxy mismatch all widen the gap silently
> - The mitigation is layered: offline metrics as a release gate, production monitoring to catch drift, and controlled experiments to confirm a real effect before trusting it

## References

- [scikit-learn model evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html)
- [ML.NET model evaluation metrics](https://learn.microsoft.com/dotnet/machine-learning/resources/metrics)
