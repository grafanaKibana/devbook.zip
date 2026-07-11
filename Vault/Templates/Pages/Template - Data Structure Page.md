---
topic: []
subtopic: []
level: []
priority: Medium
status: Not-Started
tags:
  - Template
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

# Intro

<!-- State the workload, the information that must persist between operations, the representation that lowers the repeated cost, and the information the structure does not retain. -->

## State across operations

<!-- Replace this required placeholder with a valid configuration from the StepTrace registry. Show several operations over one persistent structure; do not substitute a related algorithm trace. Do not publish an unresolved placeholder. -->

```steptrace
{"algorithm":"replace-with-supported-id","operations":"replace-with-persistent-operation-sequence"}
```

## Representation and invariants

<!-- Describe the physical state, empty/root/sentinel conventions, invariants, mutable fields, and retained or discarded identity, ordering, topology, history, or duplicates. -->

## Complexity

| Operation | Best time | Amortized/average time | Worst time | Persistent structure space | Auxiliary space per operation |
| --- | --- | --- | --- | --- | --- |
| Construct |  |  |  |  |  |
| Query |  |  |  |  |  |
| Insert/update |  |  |  |  |  |
| Remove/merge |  |  |  |  |  |

<!-- Rename or remove operations that do not belong. State the balancing, hashing, resizing, or compression assumption behind each non-worst bound. -->

## Boundaries

<!-- Keep only limits caused by the representation: deletion, ordering, range access, path recovery, iteration, identity mapping, rollback, or memory layout. -->

## Reference drawer

> [!ABSTRACT]- Structural view
> ```mermaid
> flowchart LR
>   State --> Operation --> State
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> // Complete reference implementation.
> ```

<!-- Keep complete Mermaid and code views collapsed. Delete the drawer when neither adds a useful secondary view. -->

## Comparison

| Representation | Query cost | Update cost | Removal | Information retained | Stronger workload | Weaker workload |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

<!-- Compare workload shape and retained information, not raw speed alone. Close with the structure’s fit, the flexibility it gives up, and the condition where an alternative is stronger. -->

## Questions

<!-- Keep only distinct recall targets. Remove this section when the prose already makes them obvious. -->

## References

<!-- Keep at least one annotated primary source before setting publish: true. -->

- [Source title](https://example.com) — What this source establishes or documents.
