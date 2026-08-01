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

<!-- Open with one paragraph: name the concrete problem and input shape, the repeated cost, the move that reduces it, and the condition that makes that move valid. -->

~~~~tabsdown
tab: Visualization

<!-- The StepTrace fence must be the first rendered child. Replace this required draft configuration with a supported trace that exposes the decisive transition and auxiliary state; do not add a heading or lead-in before it. -->

```steptrace
{"algorithm":"replace-with-supported-id","input":"replace-with-trace-input"}
```

# Trace

<!-- Name the input and operation, then explain the state changes shown above without restating visible controls or the pictured scenario. -->

# Mechanism

<!-- Rename this section after the actual invariant or state transition, for example “Why the range shrinks”. Use concrete before-and-after state as evidence for what remains true and why the next move is valid. -->

tab: Complexity

<!-- Insert exactly one validated version 2 `complexity` fence here after note-specific Time and Space evidence exists. Keep this panel free of rendered headings, prose, tables, and placeholders. -->

~~~~

# Complexity

| Case    | Time | Auxiliary space | Shape of the work |
| ------- | ---- | --------------- | ----------------- |
| Best    |      |                 |                   |
| Average |      |                 |                   |
| Worst   |      |                 |                   |

<!-- Explain the actual cause of each bound, not only the notation. State the assumptions behind average bounds, separate auxiliary space from recursion-stack space when relevant, and add a concrete scale estimate when it changes the engineering decision. -->

# Fit and Limits

<!-- Rename this section to the note's actual claim. State the assumptions and useful scale, then show what becomes incorrect, too slow, or too memory-heavy when they fail. -->

# Reference Drawer

> [!ABSTRACT]- Structural view
>
> ```mermaid
> flowchart LR
>   Input --> State --> Result
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Complete reference implementation.
> ```

<!-- StepTrace remains the primary visualization. Keep complete Mermaid and code views only as collapsed secondary references; delete this drawer when neither adds useful evidence. -->

# Comparison

| Alternative | Time and space | Required condition | Stronger case | Weaker case |
| ----------- | -------------- | ------------------ | ------------- | ----------- |
|             |                |                    |               |             |

<!-- Keep only real alternatives that change the engineering decision. Compare their fit and cost under the same conditions, then state when this algorithm loses; delete this section when no such alternative exists. -->

# Questions

<!-- Keep only distinct recall targets. Remove this section when the prose already makes them obvious. -->

# References

<!-- Keep at least one annotated primary source before setting publish: true. -->

- [Source title](https://example.com) — What this source establishes or documents.
