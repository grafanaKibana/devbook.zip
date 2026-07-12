---
topic:
  - Architecture
subtopic:
  - Patterns
summary: "Structural patterns compose classes and objects into flexible larger structures via inheritance and composition."
tags:
  - FolderNote
level:
  - "3"
priority: High
publish: true
status: Done
---
# Intro

Structural patterns deal with how classes and objects are composed to form larger, flexible structures — they use inheritance and composition to make interfaces work together, add capabilities without changing existing code, or control access to objects. They matter because naive composition creates rigid hierarchies and tight coupling; a Structural pattern gives you the flexibility to swap implementations or wrap objects transparently. Reach for them when you need to adapt an incompatible interface, compose objects into trees, add cross-cutting behavior without subclassing, or simplify a complex subsystem: **Adapter**, **Bridge**, **Composite**, **Decorator**, **Facade**, **Flyweight**, **Proxy**.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```
