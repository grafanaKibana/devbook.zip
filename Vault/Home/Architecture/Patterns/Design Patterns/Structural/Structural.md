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

## Patterns at a Glance

Every structural pattern is about *composition* — wiring objects and classes into a larger structure so the whole behaves well without welding the parts together by inheritance. The GoF summaries below are an at-a-glance intent map, not a ranking: several often appear in the same system (a Facade over Adapters, a Decorator chain built with Proxies).

| Pattern | Intent | Reach for it when |
| --- | --- | --- |
| [[Adapter]] | Convert an existing class's interface into the one a client expects, translating calls without changing either side. | You must fit a legacy or third-party interface you can't change into code that expects a different shape. |
| [[Bridge]] | Decouple an abstraction from its implementation so the two hierarchies can vary independently. | Two orthogonal dimensions both grow (e.g. payment types × providers) and you'd otherwise get an N×M class explosion. |
| [[Composite]] | Compose objects into part-whole trees and treat individual items and groups uniformly through one interface. | You have a genuine hierarchy and clients shouldn't care whether a node is a single item or a container of them. |
| [[Decorator]] | Attach responsibilities to an object dynamically by wrapping it in same-interface layers. | You have several cross-cutting concerns to add and compose in different orders without subclassing. |
| [[Facade]] | Provide a simplified high-level entry point over a complex subsystem, coordinating its parts. | Many clients drive the same multi-service workflow and you want one front door instead of scattered orchestration. |
| [[Flyweight]] | Share immutable intrinsic state across many fine-grained objects while callers pass the extrinsic state. | A very large number of objects duplicate the same heavy state and memory (not CPU) is the bottleneck. |
| [[Proxy]] | Stand a same-interface surrogate in front of an object to control access — deferring, caching, or authorizing calls. | You need to lazy-load, cache, or gate access to an object transparently, without callers knowing it's there. |
