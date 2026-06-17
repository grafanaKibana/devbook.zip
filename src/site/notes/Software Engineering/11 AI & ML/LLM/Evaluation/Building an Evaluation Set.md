---
{"dg-publish":true,"permalink":"/software-engineering/11-ai-and-ml/llm/evaluation/building-an-evaluation-set/","dg-note-properties":{"topic":["AI & ML"],"subtopic":["LLM"],"level":["3"],"priority":"High","status":"Done"}}
---


# Intro

An evaluation set is the labeled data every other eval technique runs against — [[Software Engineering/11 AI & ML/LLM/Evaluation/LLM-as-a-Judge\|LLM-as-a-Judge]], [[Software Engineering/11 AI & ML/LLM/Evaluation/Deterministic Checks\|deterministic checks]], and the regression gate all score against it. A bad eval set produces misleading numbers no matter how sophisticated the scoring is, so the set itself is the foundation. This page covers the parts that are the same whether you are evaluating a RAG pipeline, an agent, or a single-shot prompt: how an example is structured, how to bootstrap one with synthetic generation, and how large it must be to detect a real change.

Two design choices drive whether the numbers mean anything. The first is **labeling** — what counts as a correct output, which gets domain-specific fast (retrieval relevance in [[Software Engineering/11 AI & ML/LLM/RAG/Evaluation/Retrieval Evaluation Sets\|Retrieval Evaluation Sets]], trajectory and tool-call correctness for agents). The second is **size** relative to the effect you want to detect; get this wrong and the eval cannot distinguish two configurations at all. The curated regression subset and the offline/online loop that consume this set are covered in [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs\|Golden Test Set and Regression Runs]] and [[Software Engineering/11 AI & ML/LLM/Evaluation/Online Evaluation and AB Tests\|Online Evaluation and AB Tests]].

## Structure

Each example contains an input (the query or task), the expected behavior (a reference answer or acceptance criteria), and optionally the supporting evidence the system should have used. How strict the expected side is determines which scorers you can run: a reference answer enables correctness scoring, while acceptance criteria alone enable rubric-based judging. Some harnesses run reference-free — RAGAS judges faithfulness and relevance from context alone, and ARES evaluates with synthetic data plus a small human-labeled set via prediction-powered inference (PPI), so a tiny labeled set calibrates judgments over a large unlabeled one.

## Synthetic generation

The fastest bootstrap is to prompt an LLM to write the inputs your system will receive from material you already have. The general form: sample source items (documents, transcripts, prior tickets), and for each, ask the model to produce the natural questions or tasks a real user would pose, recording the source as the expected ground truth. This inverts the expensive direction of labeling — instead of writing inputs and then hunting for what's correct, you start from a known-good source and synthesize the input backwards.

```text
for item in sample(source_material, n=2000):
    prompt = f"""You are a real user of this system. Read the material and
    write 1-3 natural questions or tasks it fully satisfies. Paraphrase —
    do not copy phrasing. Skip boilerplate.

    Material:
    {item.text}"""
    for q in llm(prompt):
        eval_set.append({"input": q, "expected_source_id": item.id})
```

The failure mode every synthetic set shares is **distributional homogeneity**: generated cases are individually reasonable but collectively cluster in the style and difficulty the model finds easy to produce, missing ambiguous, multi-hop, and adversarial inputs real users send. Mitigation: stratify the source sample so common boilerplate does not dominate, vary the prompt to request different input types, and augment with real production logs to cover the actual distribution. Domain-specific distortions — retrieval false-negatives and lexical leakage — are covered where they bite, in [[Software Engineering/11 AI & ML/LLM/RAG/Evaluation/Retrieval Evaluation Sets\|Retrieval Evaluation Sets]].

## Size and statistical power

Most eval sets are too small to detect meaningful differences between configurations. Anthropic's analysis shows that treating eval questions as samples from a query universe and computing confidence intervals reveals that many published eval results lack statistical power — the observed difference is inside the noise band. Required sample size depends on the target effect size, the confidence level, and the metric's variance. End-to-end metrics typically have higher variance than component metrics and therefore need *more* samples, not fewer. For regression detection, size the set so that a 3-5% change in your target metric is statistically significant at your chosen confidence level; below that, a "regression" or "improvement" may be sampling noise you will chase for nothing.

## Pitfalls

### Eval Set Drift

The corpus or product changes, but the eval set stays frozen. Inputs that were valid last month reference material that has been updated, deleted, or superseded. The set reports stable metrics on stale ground truth while real users see degraded behavior.

Detection: track the fraction of eval-set ground truth that still exists in the current system. When it drops below ~90%, the set needs refresh. Version the eval set alongside the data it labels so you can attribute metric changes to data changes, not only to code changes.

### Threshold Cargo-Culting

Teams copy pass thresholds from blog posts or talks ("score above 0.9") without validating that those thresholds match their workload. A curated support assistant may need a far higher bar than a research tool over a noisy corpus, and the same number means different things on different data.

Fix: establish your own baseline by running the pipeline on your eval set and measuring user satisfaction at different metric levels. Set thresholds as regression deltas from that baseline, not as absolute targets borrowed from another deployment.

## Questions

> [!QUESTION]- Why are relative regression thresholds preferable to absolute quality targets for release gates?
> - Absolute thresholds are brittle across data changes, model updates, and workload shifts
> - A threshold set during initial launch becomes meaningless after the data doubles or input distribution shifts
> - Relative thresholds (no more than N% regression from baseline) adapt automatically because the baseline tracks the current system state
> - They prevent the failure mode where a team sets an ambitious absolute target, cannot reach it, and disables the gate entirely
> - Relative thresholds do require a consistent baseline measurement maintained across releases, which adds CI/CD complexity — but that cost is far lower than the risk of shipping regressions absolute thresholds can't catch after the first data evolution

> [!QUESTION]- When should a team invest in a human-annotated golden set versus relying on synthetic generation?
> - Synthetic generation bootstraps evaluation quickly and covers breadth at low cost
> - LLM-generated inputs cluster around patterns the model finds easy to generate, missing adversarial cases, ambiguous inputs, and domain edge cases
> - A golden set is worth the investment when the system serves high-stakes decisions (medical, legal, financial) where evaluation failures have direct business or safety impact
> - Golden sets also serve as regression gates — known past failures are captured permanently, preventing recurrence (see [[Software Engineering/11 AI & ML/LLM/Evaluation/Golden Test Set and Regression Runs\|Golden Test Set and Regression Runs]])
> - In practice, combine both: synthetic for broad coverage, golden for regression gating on known failure modes
> - Golden sets do cost annotator time (typically 2-4 hours per 100 examples) and ongoing maintenance as the data evolves — invest proportionally to the cost of an undetected evaluation failure in your domain

## References

- [A statistical approach to model evaluations -- confidence intervals and sample sizing (Anthropic)](https://www.anthropic.com/research/statistical-approach-to-model-evals)
- [ARES -- automated evaluation with synthetic data and prediction-powered inference (Stanford)](https://arxiv.org/abs/2311.09476)
- [RAGAS synthetic test data generation -- generating question/answer/context sets from a corpus (RAGAS docs)](https://docs.ragas.io/en/stable/concepts/test_data_generation/rag/)

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
<!-- whats-next:end -->
