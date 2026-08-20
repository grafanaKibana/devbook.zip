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
---

AI & ML covers the engineering around systems that learn from data or use trained models. The section moves from classic machine learning to LLM applications and the tooling used to build them. Model choice matters, but production results usually turn on the data and on how the system is evaluated and operated. A gradient-boosted tree and an LLM can fail for the same reason: an impressive model cannot rescue weak evidence or missing monitoring.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

> [!QUESTION]- When is classic machine learning a better fit than an LLM?
> Classic ML fits a well-defined prediction problem with representative labeled data, such as classification, regression, or ranking. It usually has lower latency and unit cost, and its behavior is easier to measure at scale. An LLM fits open-ended language work or early product discovery, where a prompt can describe the task before a training set exists. That choice can change as traffic grows or output variability becomes a problem. At that point, a rule-based system or a smaller trained model may be the better option.

# References

- [Microsoft AI for Beginners](https://microsoft.github.io/AI-For-Beginners/)
