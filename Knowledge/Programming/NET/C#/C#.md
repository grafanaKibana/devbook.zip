---
topic: ["Programming"]
subtopic: ["NET"]
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

## Topics

[Fundamentals](Knowledge/Programming/NET/C#/Fundamentals/Fundamentals.md)

[Runtime](Knowledge/Programming/NET/C#/Runtime/Runtime.md)

## References and Further Reading

- https://dou.ua/forums/topic/33214/
- https://habr.com/ru/articles/463213/
- https://habr.com/ru/post/541786/

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
