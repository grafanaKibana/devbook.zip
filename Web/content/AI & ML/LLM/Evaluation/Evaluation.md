---
publish: true
created: 2026-07-13T18:39:40.493Z
modified: 2026-07-13T18:39:40.494Z
published: 2026-07-13T18:39:40.494Z
tags:
  - FolderNote
topic:
  - AI & ML
subtopic:
  - LLM
summary: Measuring whether an LLM app does the right thing with layered checks, judges, and production signals.
level:
  - "3"
status: Done
priority: High
---

# Intro

Evaluation is how you measure whether an LLM application is doing the right thing: answer quality, grounding, safety, and regressions over time. Because LLM output is probabilistic and open-ended, you cannot rely on a single pass/fail assertion the way you would for deterministic code — evaluation becomes a layered system that combines cheap hard checks, scalable semantic judges, fixed regression sets, and production signals. This folder covers each layer; this hub shows how they fit together.

<nav style="--card-accent: 16, 185, 129;" class="folder-structure-map" aria-label="Evaluation section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Building an Evaluation Set">Building an Evaluation Set</span></span></div><p class="db-card-summary">The labeled data every eval technique scores against; labeling and size decide if numbers mean anything.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Evaluation/Building an Evaluation Set.md" data-tooltip-position="top" aria-label="Building an Evaluation Set">Building an Evaluation Set</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Deterministic Checks">Deterministic Checks</span></span></div><p class="db-card-summary">Non-LLM tests that cheaply validate outputs for schema, safety, and policy before any LLM judge.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Evaluation/Deterministic Checks.md" data-tooltip-position="top" aria-label="Deterministic Checks">Deterministic Checks</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Golden Test Set and Regression Runs">Golden Test Set and Regression Runs</span></span></div><p class="db-card-summary">Golden sets give broad regression coverage; targeted suites catch specific high-risk failures. You need both.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Evaluation/Golden Test Set and Regression Runs.md" data-tooltip-position="top" aria-label="Golden Test Set and Regression Runs">Golden Test Set and Regression Runs</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="LLM-as-a-Judge">LLM-as-a-Judge</span></span></div><p class="db-card-summary">One model grades another's output against an explicit rubric, by absolute scoring or pairwise preference.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Evaluation/LLM-as-a-Judge.md" data-tooltip-position="top" aria-label="LLM-as-a-Judge">LLM-as-a-Judge</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Online Evaluation and AB Tests">Online Evaluation and AB Tests</span></span></div><p class="db-card-summary">Measuring an LLM app on live traffic; A/B tests catch shifts offline sets miss.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/AI &amp; ML/LLM/Evaluation/Online Evaluation and AB Tests.md" data-tooltip-position="top" aria-label="Online Evaluation and AB Tests">Online Evaluation and AB Tests</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

## The Evaluation Stack

No single technique is sufficient. A production LLM evaluation system layers four, cheapest and strictest first, so expensive judgment is spent only on output that already passed the hard gates:

```mermaid
flowchart TD
    O[LLM output] --> D[Deterministic checks]
    D -->|fail| R[Reject -- hard failure]
    D -->|pass| J[LLM-as-a-Judge]
    J --> G[Golden test set regression gate]
    G -->|regression| F[Block release]
    G -->|pass| P[Ship to production]
    P --> ON[Online eval and A/B tests]
    ON -->|new failures become cases| G
```

Each layer is its own note in this folder; the map above links them. The ordering is the point: **deterministic checks** enforce hard contracts in microseconds with zero false positives, so a malformed or unsafe output is a hard failure that never reaches a judge; **LLM-as-a-Judge** then scores the semantic quality that survives; the **golden test set** gates releases against a frozen holdout; and **online evaluation** measures real outcomes and feeds new failures back into the golden set, closing the loop.

A useful framing across all four: combine **offline** (fixed sets, fast iteration, regression gating) with **online** (real outcomes, distribution shift), and combine **automated** (deterministic + judge, scalable) with **human** (rubric review, calibration, edge-case discovery). Neither axis alone is enough.

All four layers run against an evaluation set; how you construct, synthesize, and size that set is [[Building an Evaluation Set]]. Two domains specialize this general stack with their own metrics and labeling, reusing everything above rather than repeating it: RAG adds retrieval-quality and faithfulness metrics — see [[AI & ML/LLM/Context Engineering/RAG/Evaluation/Evaluation|RAG Evaluation]] and [[Monitoring]] — and agents add trajectory, tool-call, and task-success metrics — see [[AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]].

## Example

Example scorecard for a customer support assistant (one test case):

```text
Case: "Refund policy for damaged item after 45 days"

Dimensions (0-2):
- Correctness: 0 wrong / 1 partly / 2 correct
- Groundedness: 0 invented / 1 unclear / 2 supported by policy
- Safety: 0 unsafe / 1 questionable / 2 safe
- Actionability: 0 vague / 1 partial / 2 clear steps

Hard checks:
- Must include a citation to the policy section
- Must not request credit card numbers
```

## Evaluation Overfitting

When you iterate on prompts or rubrics against a fixed evaluation set, you can overfit to that benchmark—improvements on your dev set don't transfer to real users. This happens because you're optimizing for the specific distribution and phrasing of your test cases, not for genuine quality.

**Practical signals of evaluation overfitting:**

- You keep iterating on a prompt until it maximizes a single judge score on your dev set.
- It becomes overly verbose and "judge-friendly" while real users complain about slow, indirect answers.
- Improvements only show up on your dev set but not on a holdout set (or online metrics).

**Fix:** Introduce multiple eval dimensions, add human spot checks, and keep a frozen holdout set that you never tune against.

## Questions

> [!QUESTION]- When are classic metrics (BLEU/ROUGE) useful?
> Mainly for narrow summarization/translation style tasks and as weak signals. For open-ended assistants, rubric-based scoring and pairwise ranking usually track real quality better.

> [!QUESTION]- Why run deterministic checks before an LLM judge rather than relying on the judge alone?
>
> - Deterministic checks are microseconds and free; LLM-judge calls cost API tokens and seconds — running the cheap gate first avoids paying to judge output that is already invalid
> - Hard constraints (schema validity, disallowed actions, PII, length) have a zero false-positive rate when expressed as rules, whereas a judge can mis-rule on them
> - A judge can be distracted into scoring an output "good" that a deterministic rule would reject outright (a fluent answer that violates the output contract)
> - The two are complementary, not redundant: deterministic checks enforce hard contracts, judges evaluate soft quality — see [[Deterministic Checks]]

> [!QUESTION]- Why isn't a strong offline score enough to ship an LLM change?
>
> - Offline sets are frozen samples; production traffic shifts in phrasing, intent, and edge-case mix the set never captured
> - Iterating against a fixed set invites evaluation overfitting — the prompt gets tuned to the benchmark's distribution, not to real quality
> - Outcome metrics that matter (task resolution, escalation, retention) depend on multi-turn user behavior that no static set simulates
> - Treat offline evaluation as a release gate, then confirm with [[Online Evaluation and AB Tests|online evaluation]] before trusting the change

## References

- [Evaluation best practices (OpenAI API Docs)](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Working with evals (OpenAI API Docs)](https://developers.openai.com/api/docs/guides/evals)
- [Define your success criteria (Anthropic Docs)](https://docs.anthropic.com/en/docs/test-and-evaluate/define-success)
- [AI Risk Management Framework (NIST)](https://www.nist.gov/itl/ai-risk-management-framework)
