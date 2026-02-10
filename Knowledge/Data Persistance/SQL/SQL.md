---
topic: ["Data Persistance"]
subtopic: []
level: ["1"]
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

[Indexes](Knowledge/Data Persistance/SQL/Indexes/Indexes.md)

[Normalization/Denormalization](Knowledge/Data Persistance/SQL/Normalization Denormalization.md)

## CommonTableExpression - CTE

### Questions

1. Что такое нормализация? В чём заключаются три её формы?
2. Что такое денормализация? Когда она будет полезна?
3. Какой порядок исполнения SQL запросов?
    
    > [!TIP]
    
    > 1. FROM
    > 2. ON
    > 3. JOIN
    > 4. WHERE
    > 5. GROUP BY
    > 6. WITH CUBE or WITH ROLLUP
    > 7. HAVING
    > 8. SELECT
    > 9. DISTINCT
    > 10. ORDER BY
    > 11. TOP
    
4.

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
