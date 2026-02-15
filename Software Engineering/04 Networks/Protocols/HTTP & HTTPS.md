---
topic:
  - "Networks"
subtopic:
  - "Protocols"
level:
  - "4"
priority: Medium
status: Ready To Repeat

---

# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is the difference between HTTP and HTTPS?
> HTTPS is HTTP over TLS.
> It provides confidentiality (encryption), integrity (tamper detection), and server authentication via certificates.
> Plain HTTP has no built-in protection against eavesdropping or manipulation.

> [!QUESTION]- What HTTP methods exist?
> Common methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS.
> Less common: TRACE, CONNECT.

> [!QUESTION]- What is the difference between GET and POST?
> GET is intended for retrieving a resource representation; it is safe and can be cached.
> POST is intended for submitting data to be processed (often creating a new resource or triggering an action); it is not safe and is generally not idempotent.
> GET parameters are typically in the URL query; POST usually sends a request body.

> [!QUESTION]- What do idempotency and safety mean for HTTP methods?
> Safe means the request does not change server state (for example, GET, HEAD, OPTIONS).
> Idempotent means repeating the same request has the same effect as doing it once (for example, GET, PUT, DELETE).
> A method can be idempotent but not safe (for example, DELETE).

## Links

- [Idempotency in REST (RU)](https://restapitutorial.ru/lessons/idempotency.html)
- [MDN: HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)

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
