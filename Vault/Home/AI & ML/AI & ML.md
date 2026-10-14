---
icon: astroid
order: 70
color: "#10b981"
topic:
  - AI & ML
subtopic: []
summary: "How learning systems are built, evaluated, and operated: classic ML, LLMs, and agent tooling."
tags: [FolderNote]
publish: true
level:
  - "3"
priority: High
status: Creation
qard-deck: "AI & ML"
qard-topic: "AI & ML"
flashcard_uid: "792c6bf3"
---

AI & ML covers the engineering around systems that learn from data or use trained models. The section moves from classic machine learning to LLM applications and the tooling used to build them. Model choice matters, but production results usually turn on the data and on how the system is evaluated and operated. A gradient-boosted tree and an LLM can fail for the same reason: an impressive model cannot rescue weak evidence or missing monitoring.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

> [!qard]- When is classic machine learning a better fit than an LLM?
> Classic machine learning is the better fit when two conditions hold. First, the task is a defined prediction with representative labeled examples and a measurable objective. Second, measurement on the actual workload shows that classic ML meets that objective with a better balance of quality, latency, cost and maintenance than an LLM. The first condition makes classic ML a strong candidate. Only the second decides.
> 
> - **Task and data fit:** the task has a fixed output to predict, such as a class, a number or a ranking. Labeled examples represent the inputs seen in production, and a metric measures success directly. A model trained on those examples learns that mapping, and the metric checks its quality.
> - **Why fit alone does not decide:** generative models can also perform classification and regression, and an LLM can be the stronger option for some text-classification tasks. A labeled prediction task can therefore have more than one viable approach.
> - **Measurement:** both options are evaluated against the same simple, observable objective on the same data. Neither approach is inherently more accurate, faster, cheaper or easier to maintain.
> 
> Prompting can also try an LLM on a task while its requirements are still changing. Those results need the same measurement before either approach is chosen.
> 
> [Google: ML problem framing](https://developers.google.com/machine-learning/problem-framing/ml-framing) · [Google: Rules of Machine Learning](https://developers.google.com/machine-learning/guides/rules-of-ml/)

# References

- [Microsoft AI for Beginners](https://microsoft.github.io/AI-For-Beginners/)
