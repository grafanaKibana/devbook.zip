---
topic: ["Data Persistance"]
subtopic: []
level: ["1"]
priority: medium
status: Not-Started
tags:
  - FolderNote
---
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`
## Children
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

## Pages
```dataview
LIST
WHERE file.folder = this.file.folder
  AND file.path != this.file.path
  AND !contains(file.tags, "#FolderNote")
SORT file.name ASC
```

## Intro

## Deeper Explanation

[Indexes](Knowledge/Data Persistance/SQL/Indexes/Indexes.md)

[Normalization/Denormalization](Knowledge/Data Persistance/SQL/Normalization Denormalization.md)

## CommonTableExpression - CTE

### Questions

1. Что такое нормализация? В чём заключаются три её формы?
2. Что такое денормализация? Когда она будет полезна?
3. Какой порядок исполнения SQL запросов?
    
    <aside>
    💡 →
    
    1. FROM
    2. ON
    3. JOIN
    4. WHERE
    5. GROUP BY
    6. WITH CUBE or WITH ROLLUP
    7. HAVING
    8. SELECT
    9. DISTINCT
    10. ORDER BY
    11. TOP
    </aside>
    
4.

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
