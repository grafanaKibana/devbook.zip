---
topic: []
subtopic: []
level: ["1"]
priority: medium
status: Not-Started
tags:
  - FolderNote
---
## All Topics (Database View)

```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  topic as "Category",
  subtopic as "Subtopics",
  level as "Level",
  priority as "Priority",
  status as "Status",
  last_reviewed as "Last Reviewed"
FROM "Knowledge"
WHERE file.path != this.file.path AND !contains(file.tags, "#FolderNote")
SORT priority DESC, status ASC, file.name ASC
```

## Filter by Status

### Not Started
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  topic as "Category",
  priority as "Priority",
  level as "Level"
FROM "Knowledge"
WHERE status = "Not-Started"
  AND file.path != this.file.path
SORT priority DESC, file.name ASC
```

### In Progress (Creation/Repetition)
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  status as "Status",
  last_reviewed as "Last Reviewed",
  priority as "Priority",
  level as "Level"
FROM "Knowledge"
WHERE (status = "Creation" OR status = "Repetition" OR status = "Ready-To-Repeat")
  AND file.path != this.file.path
SORT status ASC, priority DESC, file.name ASC
```

### Completed
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  last_reviewed as "Last Reviewed",
  level as "Level"
FROM "Knowledge"
WHERE status = "Done"
  AND file.path != this.file.path
SORT last_reviewed DESC
```

## Filter by Priority

### High Priority
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  status as "Status",
  level as "Level",
  last_reviewed as "Last Reviewed"
FROM "Knowledge"
WHERE priority = "high"
  AND file.path != this.file.path
SORT status ASC, last_reviewed DESC
```

### Due for Review (Last reviewed > 30 days ago or never reviewed)
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  status as "Status",
  level as "Level",
  last_reviewed as "Last Reviewed",
  round((date(today) - file.mtime).days) as "Days Since Modified"
FROM "Knowledge"
WHERE file.path != this.file.path
  AND (last_reviewed = "" OR (date(today) - date(last_reviewed)).days > 30)
  AND status != "Not-Started"
SORT last_reviewed ASC
```

## Filter by Priority

### High Priority
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  status as "Status",
  level as "Level",
  last_reviewed as "Level"
FROM "Knowledge"
WHERE priority = "high"
  AND file.path != this.file.path
SORT status ASC, last_reviewed DESC, last_reviewed ASC
```

### Due for Review (Live)
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  status as "Status",
  level as "Level",
  priority as "Priority",
  last_reviewed as "Last Reviewed",
  round((date(today) - file.mtime).days) as "Days Since Modified"
FROM "Knowledge"
WHERE file.path != this.file.path
  AND status = "Done"
  AND last_reviewed != "" AND (date(today) - date(last_reviewed)).days > 30
SORT last_reviewed ASC
```

```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  status as "Status",
  level as "Level",
  priority as "Priority",
  last_reviewed as "Last Reviewed"
FROM "Knowledge"
WHERE file.path != this.file.path
```

### Children (Subtopic Folders)
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

### Pages (including folder indexes)
```dataview
LIST
WHERE file.folder = this.file.folder
  AND file.path != this.file.path
  AND !contains(file.tags, "#FolderNote")
SORT file.name ASC
```

### Completed Subtopics
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND file.status = "Done"
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

### In Progress Subtopics
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND (file.status = "Creation" OR file.status = "Repetition" OR file.status = "Ready-To-Repeat")
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

### Not Started Subtopics
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND file.status = "Not-Started"
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

## Filter by Priority

### High Priority
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  status as "Status",
  level as "Level",
  last_reviewed as "Last Reviewed"
FROM "Knowledge"
WHERE priority = "high"
  AND file.path != this.file.path
SORT status ASC, last_reviewed DESC, last_reviewed ASC
```

### Due for Review (Live)
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  status as "Status",
  level as "Level",
  priority as "Priority",
  last_reviewed as "Last Reviewed",
  round((date(today) - file.mtime).days) as "Days Since Modified"
FROM "Knowledge"
WHERE file.path != this.file.path
  AND status = "Done"
  AND last_reviewed != "" AND (date(today) - date(last_reviewed)).days > 30
SORT last_reviewed ASC
```

```dataviewjs
dv.paragraph(`Folder status: ${getFolderStatusDescription(dv.current().file.folder)}`);
```

```dataview
TABLE WITHOUT ID file.link as "Topic", status as "Status", level as "Level", priority as "Priority", last_reviewed as "Last Reviewed"
FROM "Knowledge"
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
SORT file.path ASC
```

### Children (Subtopic Folders)
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

### Pages (including folder indexes)
```dataview
LIST
WHERE file.folder = this.file.folder
  AND file.path != this.file.path
  AND !contains(file.tags, "#FolderNote")
SORT file.name ASC
```

### Completed Subtopics
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND file.status = "Done"
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

### In Progress Subtopics
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND (file.status = "Creation" OR file.status = "Repetition" OR file.status = "Ready-To-Repeat")
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

### Not Started Subtopics
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND file.status = "Not-Started"
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

## Filter by Priority

### High Priority
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  status as "Status",
  level as "Level",
  last_reviewed as "Level"
FROM "Knowledge"
WHERE priority = "high"
  AND file.path != this.file.path
SORT status ASC, last_reviewed DESC, last_reviewed ASC
```

### Due for Review (Live)
```dataview
TABLE WITHOUT ID
  file.link as "Topic",
  status as "Status",
  level as "Level",
  priority as "Priority",
  last_reviewed as "Last Reviewed",
  round((date(today) - file.mtime).days) as "Days Since Modified"
FROM "Knowledge"
WHERE file.path != this.file.path
  AND status = "Done"
  AND last_reviewed != "" AND (date(today) - date(last_reviewed)).days > 30
SORT last_reviewed ASC
```

```dataviewjs
dv.paragraph(`Folder status: ${getFolderStatusDescription(dv.current().file.folder)}`);
```
