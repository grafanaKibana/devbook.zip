---
<%*
// If File is untitled prompt the User to set a Title
let title = tp.file.title
if (title.startsWith("Untitled")) {
  title = await tp.system.prompt("Title") ?? "Untitled";
  await tp.file.rename(`${title}`);
}
%>

topic: <% (() => { const parts = tp.file.folder(true).split("/"); const idx = parts.indexOf("Software Engineering"); return (idx >= 0 && parts.length > idx + 1) ? `["${parts[idx + 1].replace(/^\d+\s+/, "")}"]` : "[]"; })() %>
subtopic: <% (() => { const parts = tp.file.folder(true).split("/"); const idx = parts.indexOf("Software Engineering"); return (idx >= 0 && parts.length > idx + 2) ? `["${parts[idx + 2].replace(/^\d+\s+/, "")}"]` : "[]"; })() %>
level: <% tp.system.suggester(["1", "2", "3", "4"], ["1", "2", "3", "4"], false, "Select level") %>
priority: <% tp.system.suggester(["Low", "Medium", "High"], ["Low", "Medium", "High"], false, "Select priority") %>
status: Not-Started
tags:
  - Template
---

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

# Whats next

:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

```dataviewjs
const cur = dv.current();
const curFolder = cur.file.folder;
const curPath = cur.file.path;

const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");

const children = dv.pages()
  .where(p => p.file.folder.startsWith(curFolder + "/"))
  .where(p => p.file.folder.split("/").length === curFolder.split("/").length + 1)
  .where(p => p.file.name === p.file.folder.split("/").slice(-1)[0])
  .where(p => isFolderNote(p))
  .sort(p => p.file.folder, "asc");

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");
  
  if (children.length) {
	  dv.header(2, "Topics");
	  dv.list(children.map(p => p.file.link));
  }
  if (pages.length) {
	  dv.header(2, "Pages");
	  dv.list(pages.map(p => p.file.link));
  }
  
```

