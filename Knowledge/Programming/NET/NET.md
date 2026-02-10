---
topic: ["Programming"]
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

## Sections

[C#](Knowledge/Programming/NET/C#/C#.md)

[.NET Standart](Knowledge/Programming/NET/NET Standart.md)

[ASP.NET Web API](Knowledge/Programming/NET/ASP NET Web API.md)

## Misc

[OWIN](Knowledge/Programming/NET/OWIN.md)

[SignalR](Knowledge/Programming/NET/SignalR.md)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
