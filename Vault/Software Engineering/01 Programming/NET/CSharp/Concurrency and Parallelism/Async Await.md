---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: High
status: Ready To Repeat

dg-publish: true
---
# Intro

It is common for a program to perform operations that can take a long time, for example: accessing network resources, reading/writing files, querying a database, and so on. Such operations can heavily load an application. This is especially relevant in graphical (desktop or mobile) apps, where long-running operations can block the user interface and negatively affect the user's willingness to work with the program, or in web applications that must be ready to handle thousands of requests per second. In a synchronous application, when long operations are executed on the main thread, that thread would simply be blocked for the duration of the operation. To prevent long-running operations from blocking the overall work of the application, C# supports asynchrony.

**Asynchrony** allows you to move certain tasks off the main thread into special async methods while using threads more efficiently. Async methods run on separate threads. However, while a long-running operation is in progress, the async method's thread is returned to the thread pool and can be used for other tasks. When the long-running operation completes, a thread from the pool is assigned again, and the async method continues its work.

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

- [How Async/Await in C# actually works (Part 1)](https://habr.com/ru/articles/727850/)
- [Async/await in C#: concept, internals, useful techniques](https://habr.com/ru/articles/470830/)
- [Async and Await in C#: Complete Guide (2023)](https://www.bytehide.com/blog/async-await-csharp)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp|CSharp]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken|CancellationToken]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks|Deadlocks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks|Tasks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]]
<!-- whats-next:end -->
