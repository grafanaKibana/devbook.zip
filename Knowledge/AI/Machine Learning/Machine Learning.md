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

[Types](Knowledge/AI/Machine Learning/Types.md)

[Spectrum Of Automations](Knowledge/AI/Machine Learning/Spectrum Of Automations.md)

## Links

[Machine Learning  |  Google for Developers](https://developers.google.com/machine-learning/crash-course)

[Machine Learning for Beginners](https://microsoft.github.io/ML-For-Beginners/#/)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
