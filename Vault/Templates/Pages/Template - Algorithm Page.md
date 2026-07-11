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

<!-- State the concrete input shape, the repeated cost, the move that reduces it, and the precondition that makes the move valid. -->

## Trace

<!-- Replace this required placeholder with a valid configuration from the StepTrace registry. Introduce the input and operation in one plain sentence, then explain the decisive transition rather than narrating each frame. Do not publish an unresolved placeholder. -->

```steptrace
{"algorithm":"replace-with-supported-id","input":"replace-with-trace-input"}
```

## Mechanism

<!-- Name this section after the actual invariant or state transition, for example “Why the range shrinks”. Explain what remains true and why the next step is valid. -->

## Complexity

| Case | Time | Auxiliary space | Shape of the work |
| --- | --- | --- | --- |
| Best |  |  |  |
| Average |  |  |  |
| Worst |  |  |  |

<!-- State the assumptions behind average bounds and include recursion-stack space when relevant. -->

## Boundaries

<!-- Keep this section only for concrete input, semantic, or implementation boundaries that change the outcome. -->

## Reference drawer

> [!ABSTRACT]- Structural view
> ```mermaid
> flowchart LR
>   Input --> State --> Result
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> // Complete reference implementation.
> ```

<!-- Keep complete Mermaid and code views collapsed. Delete the drawer when neither adds a useful secondary view. -->

## Comparison

| Alternative | Time and space | Required condition | Stronger case | Weaker case |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

<!-- Close with a declarative fit/cost comparison; do not turn it into a recommendation section. -->

## Questions

<!-- Keep only distinct recall targets. Remove this section when the prose already makes them obvious. -->

## References

<!-- Keep at least one annotated primary source before setting publish: true. -->

- [Source title](https://example.com) — What this source establishes or documents.
