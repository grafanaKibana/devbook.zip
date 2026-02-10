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

[Basic Auth](Knowledge/Security/Basic Auth.md)

[Two-Factor Auth](Knowledge/Security/Two-Factor Auth.md)

[Resource-based Auth](Knowledge/Security/Resource-based Auth.md)

[JWT Bearer](Knowledge/Security/JWT Bearer.md)

[SSO (Single Sign-On)](Knowledge/Security/SSO (Single Sign-On).md)

[Oauth/OIDC (OpenId Connect)](Knowledge/Security/Oauth OIDC (OpenId Connect).md)

[Encryption](Knowledge/Security/Encryption.md)

[Digital Signature](Knowledge/Security/Digital Signature.md)

[OWASP](Knowledge/Security/OWASP.md)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
