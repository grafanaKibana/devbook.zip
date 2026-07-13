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
// Derive topic/subtopic from the path below Vault/Home
const parts = tp.file.folder(true).split("/");
const homeIndex = parts.indexOf("Home");
const topic = (homeIndex >= 0 && parts.length > homeIndex + 1) ? [parts[homeIndex + 1].replace(/^\d+\s+/, "")] : [];
const subtopic = (homeIndex >= 0 && parts.length > homeIndex + 2) ? [parts[homeIndex + 2].replace(/^\d+\s+/, "")] : [];

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

<!-- Explain what this is, why it matters, when to reach for it, and the mechanism when it is non-obvious. Include a concrete example here for a compact topic. Add separate mechanism, example, pitfalls, tradeoffs, or questions sections only when they teach something the Intro cannot. -->

## References

<!-- Add at least one annotated primary source: what it specifies, proves, or documents. -->
