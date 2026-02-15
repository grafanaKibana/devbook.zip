---
topic:
  - "Security"
subtopic: []
level:
  - "3"
priority: Medium
status: Ready To Repeat

---

# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is authentication?
> Authentication is the process of verifying an identity claim (who you are).
> Common factors: something you know (password), have (OTP device), or are (biometrics).

> [!QUESTION]- What is authorization?
> Authorization is the decision of what an identified and authenticated subject is allowed to do.
> It is typically enforced via access control policies (RBAC, ABAC, ACLs) and happens after authentication.

> [!QUESTION]- What is the difference between identification, authentication, and authorization?
> Identification: a claim of identity (for example, a username or account id).
> Authentication: proving that claim (password, MFA, certificate, etc.).
> Authorization: checking permissions for a specific action on a specific resource.

## Links

- [Identification, authentication, authorization (RU)](http://security.mosmetod.ru/paroli/192-identifikatsiya-autentifikatsiya-i-avtorizatsiya-v-chem-raznitsa)

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
