---
topic:
  - AI
subtopic:
  - Machine Learning
level:
  - "1"
priority: medium
status: Not-Started
tags:
  - FolderNote
---
## Parent
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

if (children.length) {
  dv.header(2, "Children");
  dv.list(children.map(p => p.file.link));
}

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");

if (pages.length) {
  dv.header(2, "Pages");
  dv.list(pages.map(p => p.file.link));
}
```
---
## Intro

## Deeper Explanation

[Types](Knowledge/11 AI/Machine Learning/Types.md)

[Spectrum Of Automations](Knowledge/11 AI/Machine Learning/Spectrum Of Automations.md)

## Links

[Machine Learning  |  Google for Developers](https://developers.google.com/machine-learning/crash-course)

[Machine Learning for Beginners](https://microsoft.github.io/ML-For-Beginners/#/)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
