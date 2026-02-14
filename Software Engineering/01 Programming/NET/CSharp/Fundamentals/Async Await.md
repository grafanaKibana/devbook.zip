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
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

## Deeper Explanation

# Overview

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

## Further Reading
- [Fetching Title#3ra2](https://habr.com/ru/articles/727850/)
- [Fetching Title#0gax](https://habr.com/ru/articles/470830/)
- [Async and Await in C#: Complete Guide (2023)](https://www.bytehide.com/blog/async-await-csharp)
