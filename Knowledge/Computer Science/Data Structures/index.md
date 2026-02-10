# <Folder Name>

Up: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/index", regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

## Children
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE file.name = "index"
  AND regexmatch("^" + this.file.folder + "/[^/]+/index\\.md$", file.path)
SORT file.folder ASC
```

## Pages
```dataview
LIST
WHERE file.folder = this.file.folder
  AND file.name != "index"
SORT file.name ASC
```
