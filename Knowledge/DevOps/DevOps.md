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

[Source controls](Knowledge/DevOps/Source controls.md)

[Branching Stratagies](Knowledge/DevOps/Branching Stratagies.md)

[CI/CD tools](Knowledge/DevOps/CI CD tools.md)

[Deployment Stratagies](Knowledge/DevOps/Deployment Stratagies/Deployment Stratagies.md)

[Docker](Knowledge/DevOps/Docker.md)

[Kubernetes](Knowledge/DevOps/Kubernetes.md)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
