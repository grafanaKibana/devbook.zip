---
topic:
  - "DevOps"
subtopic: []
level:
  - "2"
priority: Medium
status: Ready To Repeat

dg-publish: true
---

# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What problem does Docker solve? What is a container?
> Docker helps package an application with its dependencies and run it consistently across environments ("works on my machine" problem).
> A container is an isolated process that runs from an image and uses OS features (namespaces, cgroups) to limit what it can see and use.
> Unlike virtual machines, containers share the host kernel, so they start faster and use fewer resources.

## Links

- [What is Docker? (IBM)](https://www.ibm.com/ru-ru/cloud/learn/docker)
- [What are containers? (IBM)](https://www.ibm.com/ru-ru/cloud/learn/containers)

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
