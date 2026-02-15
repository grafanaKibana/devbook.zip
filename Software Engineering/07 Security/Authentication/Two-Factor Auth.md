---
topic:
  - "Security"
subtopic: []
level:
  - "3"
priority: Medium
status: Not-Started
---

# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- Basic authentication vs two-factor authentication vs resource-based authentication
> Basic authentication: single-factor credentials (username and password) sent on every request (often as base64). It must be used only over HTTPS.
> Two-factor authentication: authentication that requires a second factor in addition to a password (for example, TOTP, push approval, hardware key).
> Resource-based authentication is often used to mean resource-scoped credentials (for example, an API key or token scoped to a specific service or audience);
> in many systems, the "resource-based" part is really authorization (policy attached to a resource) rather than authentication.

## Links

# Whats next

:LiArrowUpLeft: `dv: link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

```dataviewjs
const cur = dv.current();
const curFolder = cur.file.folder;
const curPath = cur.file.path;

const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");

const children = dv.pages()
  .where(p => p.file.folder.startsWith(curFolder + "/"))
  .where(p => p.file.folder.split("/").length === curFolder.split("/").length + 1)
  .where(p => p.file.name === p.file.folder.split("/").slice(-1)[0])
  .where(p => isFolderNote(p))
  .sort(p => p.file.folder, "asc");

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");
  
  if (children.length) {
	  dv.header(2, "Topics");
	  dv.list(children.map(p => p.file.link));
  }
  if (pages.length) {
	  dv.header(2, "Pages");
	  dv.list(pages.map(p => p.file.link));
  }
  
```
