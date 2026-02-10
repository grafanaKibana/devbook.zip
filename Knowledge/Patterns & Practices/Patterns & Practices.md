---
topic: []
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

[OOP](Knowledge/Patterns & Practices/OOP.md)

[GRASP](Knowledge/Patterns & Practices/GRASP.md)

[SOLID](Knowledge/Patterns & Practices/SOLID.md)

[Functional Programming](Knowledge/Patterns & Practices/Functional Programming.md)

[Dependency Injection](Knowledge/Patterns & Practices/Dependency Injection.md)

[CQS](Knowledge/Patterns & Practices/CQS.md)

[Repository & UoW](Knowledge/Patterns & Practices/Repository & UoW.md)

[Design Patterns](Knowledge/Patterns & Practices/Design Patterns.md)

[Event-Driven Development](Knowledge/Patterns & Practices/Event-Driven Development.md)

[DRY](Knowledge/Patterns & Practices/DRY.md)

[IoC (Holywood Principle)](Knowledge/Patterns & Practices/IoC (Holywood Principle).md)

[KISS](Knowledge/Patterns & Practices/KISS.md)

[YAGNI](Knowledge/Patterns & Practices/YAGNI.md)

[Integration Testing](Knowledge/Patterns & Practices/Integration Testing.md)

[Unit Testing](Knowledge/Patterns & Practices/Unit Testing.md)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
