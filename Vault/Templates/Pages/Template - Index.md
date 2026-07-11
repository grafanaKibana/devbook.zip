---
topic: []
subtopic: []
level: []
priority: Medium
status: Not-Started
tags:
  - Template
  - FolderNote
publish: false
---
<%*
// Derive topic/subtopic from the folder path under the "Home" root.
const parts = tp.file.folder(true).split("/");
const idx = parts.indexOf("Home");
const topic = (idx >= 0 && parts.length > idx + 1) ? [parts[idx + 1].replace(/^\d+\s+/, "")] : [];
const subtopic = (idx >= 0 && parts.length > idx + 2) ? [parts[idx + 2].replace(/^\d+\s+/, "")] : [];

// If the file is untitled, prompt for a title.
let title = tp.file.title;
if (title.startsWith("Untitled")) {
  title = await tp.system.prompt("Title") ?? "Untitled";
  await tp.file.rename(title);
}

// Prompt for level and priority.
const level = await tp.system.suggester(["1", "2", "3", "4"], ["1", "2", "3", "4"], false, "Select level");
const priority = await tp.system.suggester(["Low", "Medium", "High"], ["Low", "Medium", "High"], false, "Select priority");

// Optional one-sentence summary — used by the parent hub's card map. Leave blank to skip.
const summary = await tp.system.prompt("One-line summary for the parent's card map (optional)", "");

// Write typed frontmatter after the template finishes.
tp.hooks.on_all_templates_executed(async () => {
  const file = tp.file.find_tfile(tp.file.path(true));
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.topic = topic;
    fm.subtopic = subtopic;
    if (level != null) fm.level = [level];
    if (priority != null) fm.priority = priority;
    fm.tags = ["FolderNote"];
    if (summary && summary.trim()) fm.summary = summary.trim();
    // Set `color` (hex, e.g. "#10b981") and `order` (number) on this note to give
    // its card a topic accent and a fixed position in the parent hub's map.
  });
});
%>
# Intro

Explain this section in plain language — what it groups and why. Prefer a clear, complete explanation over short bullets, and keep the tone of a personal learning space rather than a curriculum.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Questions

> [!QUESTION]- A real question worth being able to answer
> Answer.

## References

- [Source](https://example.com) — why it is worth keeping.
