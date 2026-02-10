---
topic: ["AI"]
subtopic: ["Prompting"]
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


## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading

- [Instruction Prompting](Knowledge/AI/Prompting/Techniques/Instruction Prompting/Instruction Prompting.md)
- [Showing Examples](Knowledge/AI/Prompting/Techniques/Showing Examples/Showing Examples.md)
- [Role Prompting](Knowledge/AI/Prompting/Techniques/Role Prompting/Role Prompting.md)