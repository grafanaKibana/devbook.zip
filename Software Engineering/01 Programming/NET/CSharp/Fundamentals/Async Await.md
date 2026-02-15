---
topic:
  - Programming
subtopic:
  - NET
level:
  - "2"
priority:
  - High
status: Not-Started
---
# Intro

Нередко программа выполняет такие операции, которые могут занять продолжительное время, например, обращение к сетевым ресурсам, чтение-запись файлов, обращение к базе данных и т.д. Такие операции могут серьезно нагрузить приложение. Особенно это актуально в графических (десктопных или мобильных) приложениях, где продолжительные операции могут блокировать интерфейс пользователя и негативно повлиять на желание пользователя работать с программой, или в веб-приложениях, которые должны быть готовы обслуживать тысячи запросов в секунду. В синхронном приложении при выполнении продолжительных операций в основном потоке этот поток просто бы блокировался на время выполнения операции. И чтобы продолжительные операции не блокировали общую работу приложения, в C# можно задействовать асинхронность.

**Асинхронность** позволяет вынести отдельные задачи из основного потока в специальные асинхронные методы и при этом более экономно использовать потоки. Асинхронные методы выполняются в отдельных потоках. Однако при выполнении продолжительной операции поток асинхронного метода возвратится в пул потоков и будет использоваться для других задач. А когда продолжительная операция завершит свое выполнение, для асинхронного метода опять выделяется поток из пула потоков, и асинхронный метод продолжает свою работу.

## Questions

> [!QUESTION]- How is asynchrony different from multithreading?
> Asynchrony is about not blocking while waiting (especially for I/O). An `async` method can release the current thread while awaiting, and continue later.
> Multithreading is about executing work on multiple threads concurrently (for example, for parallel CPU-bound work). Async code can be single-threaded and still be asynchronous.

> [!QUESTION]- What is the difference between `Thread` and `Task`?
> `Thread` is an OS thread you manage directly (heavier, dedicated execution).
> `Task` is a higher-level abstraction representing an asynchronous operation or a unit of work, typically scheduled on the thread pool (and for I/O it may not require a dedicated thread while waiting).
> References: [Difference between Task and Thread (ru StackOverflow)](https://ru.stackoverflow.com/questions/548876/%D0%92-%D1%87%D0%B5%D0%BC-%D1%80%D0%B0%D0%B7%D0%BD%D0%B8%D1%86%D0%B0-%D0%BC%D0%B5%D0%B6%D0%B4%D1%83-task-%D0%B8-thread-%D0%B8-%D0%BA%D0%BE%D0%B3%D0%B4%D0%B0-%D1%87%D1%82%D0%BE-%D0%BB%D1%83%D1%87%D1%88%D0%B5-%D0%B8%D1%81%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D1%8C)

> [!QUESTION]- What is the difference between `await` and `Task.Result`?
> `await` waits asynchronously: it does not block the current thread and it unwraps exceptions.
> `Task.Result` waits synchronously: it blocks the current thread, can cause deadlocks under a `SynchronizationContext` (UI / legacy ASP.NET), and wraps exceptions in `AggregateException`.

## Links
- [Как на самом деле работает Async/Await в C# (Часть 1)](https://habr.com/ru/articles/727850/)
- [Async/await в C#: концепция, внутреннее устройство, полезные приемы](https://habr.com/ru/articles/470830/)
- [Async and Await in C#: Complete Guide (2023)](https://www.bytehide.com/blog/async-await-csharp)

# Whats next

:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

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

