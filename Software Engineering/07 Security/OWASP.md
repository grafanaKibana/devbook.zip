---
topic:
  - "Security"
subtopic: []
level:
  - "4"
priority: Medium
status: Ready To Repeat

---

# Intro

OWASP (Open Worldwide Application Security Project) is a non-profit foundation that publishes freely available resources on web application security. Its most well-known output is the OWASP Top 10 — a regularly updated ranking of the most critical security risks facing web applications, covering threats like injection, broken access control, and cryptographic failures.

## Deeper Explanation

[OWASP Top Ten | OWASP Foundation](https://owasp.org/www-project-top-ten/)

## Questions

> [!QUESTION]- Which OWASP Top 10 vulnerabilities do you know?
> OWASP Top 10 is a regularly updated list of the most common and impactful web application security risks.
> For example (2021): Broken Access Control, Cryptographic Failures, Injection, Insecure Design, Security Misconfiguration,
> Vulnerable and Outdated Components, Identification and Authentication Failures, Software and Data Integrity Failures,
> Security Logging and Monitoring Failures, Server-Side Request Forgery.

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
