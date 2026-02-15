---
topic:
  - "Patterns & Practices"
subtopic:
  - "Paradigms & Practices"
level:
  - "4"
priority: Medium
status: Ready To Repeat

---

# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What types of testing do you know?
> Common categories:
> - Unit: test a small piece of code in isolation
> - Integration: test how multiple components work together (DB, filesystem, HTTP, queues)
> - Functional / End-to-end: test user-visible behavior through public APIs/UI
> - System / Acceptance: validate the whole system against requirements
> - Regression / Smoke: quick checks to catch breakages
> - Non-functional: performance (load/stress), security, reliability, usability
>
> The exact taxonomy varies by team; the key is the test scope, dependencies involved, and feedback speed.

> [!QUESTION]- What are unit tests, why do we need them, and what frameworks exist?
> Unit tests verify a small unit of behavior (usually a method/class) quickly and deterministically.
> They help prevent regressions, enable safe refactoring, document expected behavior, and improve design by forcing good boundaries.
>
> Popular .NET unit test frameworks: xUnit, NUnit, MSTest.

> [!QUESTION]- What are the Arrange Act Assert blocks?
> - Arrange: set up the test data and dependencies
> - Act: execute the behavior under test
> - Assert: verify the outcome (result, state, or interactions)
>
> This is also known as Given When Then.

> [!QUESTION]- What is Moq and why is it used?
> Moq is a popular .NET mocking framework used to create test doubles for interfaces (and virtual/abstract members) so you can:
> - isolate the unit under test from external dependencies
> - stub return values / throw exceptions
> - verify interactions (for example, that a dependency method was called with specific arguments)

> [!QUESTION]- What is the difference between mocks and stubs?
> A stub provides canned answers (returns fixed data) to let the test proceed.
> A mock is usually used for verification: it can record calls and assert expectations about interactions (which methods were called, with what arguments, and how many times).

## Links

- [Unit testing (Wikipedia)](https://en.wikipedia.org/wiki/Unit_testing)
- [xUnit.net docs](https://xunit.net/)


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
