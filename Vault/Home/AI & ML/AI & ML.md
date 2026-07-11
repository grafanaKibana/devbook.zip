---
icon: brain
order: 70
color: "#10b981"
topic:
  - AI & ML
subtopic: []
tags:
  - FolderNote
publish: true
level:
  - "3"
priority: High
status: Done
---

# Intro

AI & ML covers how learning systems are built, evaluated, and operated — from classic supervised models through large language models to the agent tooling that turns models into day-to-day engineering leverage. The unifying theme across all three branches: the model is rarely the hard part. Data quality, evaluation discipline, guardrails, and monitoring decide whether a system works in production, and that engineering work looks remarkably similar whether the model is a gradient-boosted tree or a frontier LLM.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Questions

> [!QUESTION]- When should you reach for classic ML instead of an LLM API?
> - Classic ML wins when the task is a well-defined prediction with labeled data: classification, regression, ranking — millisecond latency and near-zero per-request cost at scale
> - LLMs win when the task involves open-ended language understanding or generation, training data is scarce, or iteration speed matters more than unit cost
> - A common production pattern: prototype with an LLM to validate the product, then distill the stable, high-volume part into a small fine-tuned model
> - Key tradeoff: classic ML trades upfront data and training effort for cheap, fast, predictable inference; LLMs trade per-call cost and latency for flexibility and zero training

> [!QUESTION]- Why does evaluation discipline matter more than model choice?
> - Without held-out evaluation, every model swap, prompt change, or retraining run is a guess — improvements cannot be distinguished from noise or regressions
> - Production failures are dominated by data and distribution problems (drift, leakage, segment regressions), which only evaluation and monitoring catch — not by raw model capability
> - A weaker model with solid evaluation and a feedback loop improves over time; a stronger model without them silently degrades
> - This is why every branch of this section has its own evaluation pages: [[Home/AI & ML/Machine Learning/Evaluation/Evaluation|ML Evaluation]] and the general [[Home/AI & ML/LLM/Evaluation/Evaluation|LLM Evaluation]], which RAG and agents specialize in [[Home/AI & ML/LLM/RAG/Evaluation/Evaluation|RAG Evaluation]] and [[Home/AI & ML/LLM/Agents/Evaluation/Evaluation|Agent Evaluation]]

## References

- [Rules of Machine Learning (Google for Developers)](https://developers.google.com/machine-learning/guides/rules-of-ml) — Google's practical guide to ML engineering, including when to use ML versus simpler approaches.
- [Building Effective Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/building-effective-agents) — the canonical guidance on choosing the simplest agentic pattern that solves the problem.
- [Hidden Technical Debt in Machine Learning Systems (NeurIPS 2015)](https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html) — the classic paper on why the model is a small fraction of a production ML system.
- [AI Risk Management Framework (NIST)](https://www.nist.gov/itl/ai-risk-management-framework) — vendor-neutral framework for managing AI risk across the lifecycle.
