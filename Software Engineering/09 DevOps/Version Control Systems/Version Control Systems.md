---
topic:
  - "DevOps"
subtopic: []
level:
  - ""
priority: Medium
status: Not-Started
---

# Intro

A version control system (VCS) tracks changes to files over time, enabling collaboration, branching, merging, and the ability to revert to any previous state. Git is the dominant distributed VCS, where every developer holds a full copy of the repository history, and workflows like git-flow or trunk-based development define how teams coordinate changes.

## Deeper Explanation

[git-flow cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/index.ru_RU.html)

## Questions

> [!QUESTION]- What is a version control system (VCS)?
> A VCS is a tool that tracks changes to files over time and lets you:
> - keep a history of commits (who changed what, when, and why)
> - collaborate safely (pull, push, resolve conflicts)
> - work in parallel via branches and merge changes back
> - tag/release specific versions and roll back when needed
> In practice, Git is the most common distributed VCS.

## Links

# Whats next

:LiArrowUpLeft: `dv: link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

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
