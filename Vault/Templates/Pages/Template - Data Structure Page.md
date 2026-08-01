---
topic: []
subtopic: []
level: []
priority: Medium
status: Not-Started
tags: [Template]
publish: false
---

<%*
const parts = tp.file.folder(true).split("/");
const homeIndex = parts.indexOf("Home");
const topic = (homeIndex >= 0 && parts.length > homeIndex + 1)
  ? [parts[homeIndex + 1].replace(/^\d+\s+/, "")]
  : [];
const subtopic = (homeIndex >= 0 && parts.length > homeIndex + 2)
  ? [parts[homeIndex + 2].replace(/^\d+\s+/, "")]
  : [];

let title = tp.file.title;
if (title.startsWith("Untitled")) {
  title = await tp.system.prompt("Title") ?? "Untitled";
  await tp.file.rename(title);
}

const level = await tp.system.suggester(["1", "2", "3", "4"], ["1", "2", "3", "4"], false, "Select level");
const priority = await tp.system.suggester(["Low", "Medium", "High"], ["Low", "Medium", "High"], false, "Select priority");

tp.hooks.on_all_templates_executed(async () => {
  const file = tp.file.find_tfile(tp.file.path(true));
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.topic = topic;
    fm.subtopic = subtopic;
    if (level != null) fm.level = [level];
    if (priority != null) fm.priority = priority;
    delete fm.tags;
  });
});
%>

<!-- State the workload, persistent state, repeated cost the representation reduces, and information it deliberately does not retain. -->

~~~~tabsdown
tab: Visualization

<!-- The StepTrace fence must be the first rendered child. Replace this required draft configuration with a supported trace that shows several operations over one structure and exposes meaningful persistent state; do not add a heading or lead-in before it. -->

```steptrace
{"algorithm":"replace-with-supported-id","operations":"replace-with-persistent-operation-sequence"}
```

# State across Operations

<!-- Name the workload and operations, then explain the persistent state shown above without restating visible controls or the pictured scenario. -->

# Representation and Invariants

<!-- Rename this heading after the representation claim the note proves. Describe the physical state, mutable fields, empty/root/sentinel conventions, invariant, and retained or discarded identity, ordering, topology, history, or duplicates. -->

tab: Complexity

<!-- Insert exactly one validated version 2 `complexity` fence here after note-specific Time and Space evidence exists. Keep this panel free of rendered headings, prose, tables, and placeholders. -->

~~~~

# Complexity

| Operation     | Best time | Amortized/average time | Worst time | Persistent structure space | Auxiliary space per operation |
| ------------- | --------- | ---------------------- | ---------- | -------------------------- | ----------------------------- |
| Construct     |           |                        |            |                            |                               |
| Query         |           |                        |            |                            |                               |
| Insert/update |           |                        |            |                            |                               |
| Remove/merge  |           |                        |            |                            |                               |

<!-- Rename or remove operations that do not belong. Explain the actual cost driver and the balancing, hashing, resizing, compression, or workload assumption behind each bound. Keep persistent structure space distinct from temporary auxiliary space, and add a concrete scale estimate when it clarifies the cost. -->

# Fit and Limits

<!-- Rename this heading after the structure’s actual fit or limit. State the workload and scale it fits, then name unsupported operations or information the representation cannot retain efficiently: deletion, ordering, range access, path recovery, iteration, identity mapping, rollback, or memory layout. -->

# Reference Drawer

> [!ABSTRACT]- Structural view
>
> ```mermaid
> flowchart LR
>   State --> Operation --> State
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Complete reference implementation.
> ```

<!-- Optional: keep complete Mermaid and code views collapsed as secondary views. Delete the drawer when neither adds useful evidence. -->

# Comparison

| Representation | Query cost | Update cost | Removal | Information retained | Stronger workload | Weaker workload |
| -------------- | ---------- | ----------- | ------- | -------------------- | ----------------- | --------------- |
|                |            |             |         |                      |                   |                 |

<!-- Optional: delete this section when no real alternative changes the engineering decision. Compare retained information, query/update/removal cost, and workload fit, not raw speed alone. Close with the structure’s fit, the flexibility it gives up, and the condition where an alternative is stronger. -->

# Questions

<!-- Optional: keep only distinct recall targets. Delete this section when the prose already makes them obvious. -->

# References

<!-- Keep at least one annotated primary source before setting publish: true. -->

- [Source title](https://example.com) — What this source establishes or documents.
