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

> [!QUESTION]- When should you reach for classic ML instead of an LLM?
> Classic ML fits a well-defined prediction with representative labeled data, such as classification, regression, or ranking. It usually gives lower latency, lower unit cost, and more predictable behavior at scale.
> An LLM API fits open-ended language tasks or early product discovery, especially when a prompt can express the task before a training set exists. The choice changes when volume, latency, or output variability becomes the dominant constraint. A rule-based system or smaller trained model may then be the better fit.

# References

- [Microsoft AI for Beginners](https://microsoft.github.io/AI-For-Beginners/)
