---
topic: []
subtopic: []
level: []
priority: Medium
status: Not-Started
tags:
  - Template
---
<%*
// Derive topic/subtopic from folder path
const parts = tp.file.folder(true).split("/");
const idx = parts.indexOf("Software Engineering");
const topic = (idx >= 0 && parts.length > idx + 1) ? [parts[idx + 1].replace(/^\d+\s+/, "")] : [];
const subtopic = (idx >= 0 && parts.length > idx + 2) ? [parts[idx + 2].replace(/^\d+\s+/, "")] : [];

// If file is untitled, prompt for a title
let title = tp.file.title;
if (title.startsWith("Untitled")) {
  title = await tp.system.prompt("Title") ?? "Untitled";
  await tp.file.rename(title);
}

// Prompt for level and priority
const level = await tp.system.suggester(["1", "2", "3", "4"], ["1", "2", "3", "4"], false, "Select level");
const priority = await tp.system.suggester(["Low", "Medium", "High"], ["Low", "Medium", "High"], false, "Select priority");

// Write proper typed frontmatter after template finishes
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

Quick introduction to the concept

## Deeper Explanation

Deeper Explanation of the concept

## Questions

> [!QUESTION]- What is abc?
> Answer

## Links

Replace or delete these example links.

- [Link 1](https://example.com)
- [Link 2](https://example.com)

<!-- whats-next:start -->

---

> [!note] Whats next
<!-- whats-next:end -->
