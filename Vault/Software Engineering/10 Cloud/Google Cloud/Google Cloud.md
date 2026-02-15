---
topic:
  - Cloud
subtopic:
  - Google Cloud
level:
  - "3"
priority: Medium
status: Ready To Repeat
tags:
  - FolderNote
dg-publish: true
---

# Intro

Google Cloud (GCP) is a public cloud platform that provides compute, storage, managed databases, messaging, networking, and IAM.

This folder is the canonical place for Google Cloud notes in this vault, including service pages (Cloud Functions, Spanner, Firebase, Storage, BigQuery).

## Example

Set the active project and list VM instances with the `gcloud` CLI:

```bash
gcloud config set project "my-project-id"
gcloud compute instances list
```


## Questions

> [!QUESTION]- What is a good way to learn GCP services systematically?
> Start from core building blocks (IAM, networking, compute, storage), then add managed databases and messaging. For each service page, capture: what it is, key use cases, a minimal CLI example, and 1-2 reference links.

## Links

- [Google Cloud documentation](https://cloud.google.com/docs)

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
