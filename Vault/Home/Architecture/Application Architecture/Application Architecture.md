---
topic:
  - Architecture
subtopic:
  - Application Architecture
summary: "How a codebase is shaped into layers and modules, and where responsibilities live."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Creation
---

# Intro

Application architecture focuses on how a codebase is shaped: layers, modules, interaction patterns, and where responsibilities live. It affects testability, change speed, and how quickly new engineers can understand the system. Example: a layered design keeps domain logic independent from the database and web framework, which makes refactors safer.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [Software architecture guide (Martin Fowler)](https://martinfowler.com/architecture/)
