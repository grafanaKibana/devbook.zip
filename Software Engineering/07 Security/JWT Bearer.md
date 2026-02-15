---
topic:
  - "Security"
subtopic: []
level:
  - "1"
priority: Medium
status: Not-Started
---

# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is a JWT token?
> JWT (JSON Web Token) is a compact token format for passing claims between parties.
> A typical JWT is `header.payload.signature` (base64url encoded) and is usually signed (JWS) so the receiver can verify integrity and issuer.
> Important: a signed JWT is not encrypted; anyone who has it can read the payload unless you use encryption (JWE).

> [!QUESTION]- Cookie vs JWT: what is the difference?
> Cookie is a browser transport mechanism: the browser automatically sends cookies to matching origins.
> JWT is a token format: it can be stored and transported in cookies, or sent as `Authorization: Bearer <token>`.
> Common tradeoffs: cookies require CSRF protections (for example, `SameSite`, anti-CSRF tokens); JWTs stored in JS-accessible storage increase XSS impact.

## Links

- [RFC 7519: JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)

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
