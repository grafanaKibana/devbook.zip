---
topic:
  - Programming
subtopic:
  - NET
level: ["1"]
priority: Medium
status: Not-Started
tags:
  - FolderNote
---
## Parent
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

if (children.length) {
  dv.header(2, "Children");
  dv.list(children.map(p => p.file.link));
}

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");

if (pages.length) {
  dv.header(2, "Pages");
  dv.list(pages.map(p => p.file.link));
}
```
---
# Intro

CLR (Common Language Runtime) - это часть .NET Framework (или .NET Core / .NET 5+), которая отвечает за выполнение кода, написанного на языках, совместимых с .NET. Она предоставляет среду выполнения, управление памятью, управление потоками, безопасность и другие службы для выполнения приложений.

Основные обязанности CLR:

1. **Компиляция в промежуточный язык (IL)**:
    - Программы на .NET языках (C#, [VB.NET](http://vb.net/), F# и др.) компилируются в промежуточный язык (Intermediate Language, IL), который является независимым от платформы и сохраняется в сборке.
2. **Just-In-Time (JIT) компиляция**:
    - Когда приложение запускается, IL код JIT-компилируется в машинный код, который может выполняться на конкретной аппаратной платформе. Это происходит во время выполнения приложения, что улучшает портируемость кода.
3. **Управление памятью**:
    - CLR отслеживает выделение и освобождение памяти, автоматически управляя сборкой мусора. Она определяет, когда объекты больше не используются, и освобождает выделенную ими память.
4. **Управление потоками**:
    - CLR обеспечивает механизмы для создания и управления потоками выполнения. Это включает в себя синхронизацию доступа к данным между потоками и обработку исключений в многозадачных приложениях.
5. **Безопасность кода**:
    - CLR предоставляет механизмы безопасности, такие как проверка границ массива, проверка типов и другие, чтобы предотвратить выполнение небезопасного кода.
6. **Метаданные и Reflection**:
    - CLR хранит метаданные о типах и других элементах кода внутри сборки. Reflection API позволяет программам получать доступ и манипулировать этой метаинформацией во время выполнения.
7. **Обработка исключений**:
    - CLR предоставляет механизм обработки исключений, что позволяет программам легко обрабатывать исключительные ситуации.
8. **Взаимодействие с нативным кодом**:
    - CLR предоставляет механизмы для взаимодействия с нативным кодом, что позволяет использовать существующий код на C, C++ и других языках.

Эти функциональности делают CLR ключевым компонентом .NET, обеспечивая среду выполнения и обеспечивая портируемость и безопасность кода. Важно отметить, что информация может меняться с выходом новых версий .NET, и для получения актуальной информации рекомендуется обращаться к официальной документации Microsoft.

Процесс запуска .NET-приложения и его выполнения под управлением CLR включает несколько ключевых шагов. Ниже представлен общий обзор этого процесса:

![01 Programming-Common Language Runtime-20260210212705669](01%20Programming-Common%20Language%20Runtime-20260210212705669.png)

1. **Компиляция исходного кода:**
    - После написания кода на языках, совместимых с .NET (например, C#), исходный код компилируется в промежуточный язык (IL - Intermediate Language, CIL - Common Intermediate Language, MSIL - Microsoft Intermediate Language). Это делается компилятором языка на котором написан код (например, C# компилятором - **`csc`**).
2. **Создание сборки:**
    - Компилированный IL-код, вместе с метаданными о типах, упаковывается в сборку (.dll или .exe Assembly). Сборка содержит информацию о структуре кода, метаданные, ресурсы и другую необходимую информацию.
3. **Запуск приложения:**
    - Когда пользователь запускает .NET-приложение, операционная система загружает исполняемый файл (.exe) в память.
4. **Just-In-Time (JIT) компиляция:**
    - CLR, находящаяся внутри .NET Runtime, переводит IL-код в машинный код во время выполнения приложения. Этот процесс называется JIT-компиляцией. Это обеспечивает адаптацию кода к конкретной аппаратной платформе и повышает портируемость приложений.
5. **Загрузка в память:**
    - Загруженный машинный код и связанные сборки загружаются в память. CLR управляет этим процессом, устанавливая связи между разными сборками, если это необходимо.
6. **Исполнение кода:**
    - CLR начинает выполнение приложения, запуская метод **`Main()`** (или другой метод, указанный в конфигурации) из основного класса приложения.
7. **Управление памятью и сборка мусора:**
    - CLR автоматически управляет выделением и освобождением памяти, а также процессом сборки мусора. Это включает в себя отслеживание неиспользуемых объектов и их освобождение для повышения эффективности использования памяти.
8. **Управление потоками и синхронизация:**
    - CLR предоставляет механизмы для управления потоками выполнения приложения, обеспечивая безопасность и синхронизацию доступа к данным.
9. **Обработка исключений:**
    - В случае возникновения исключений, CLR обрабатывает их, предоставляя стек вызовов и другую информацию для отладки.

## Questions

> [!QUESTION]- What is managed vs unmanaged code?
> Managed code runs under the .NET runtime (CLR) and benefits from runtime services like type safety checks, exception handling, garbage collection, and JIT/AOT compilation.
> Unmanaged code runs directly as native machine code under the OS (for example, C/C++ binaries). It does not run under the CLR and typically requires explicit resource and lifetime management.

> [!QUESTION]- What is the CLR? What does it do? What is IL (CIL/MSIL)?
> The CLR (Common Language Runtime) is the execution engine of .NET. It loads assemblies, verifies and executes IL, compiles IL to native code (JIT or AOT), manages memory (GC), handles exceptions, supports threading and interop, and provides other runtime services.
> IL (also called CIL or MSIL) is the CPU-independent intermediate instruction set produced by .NET language compilers and stored in assemblies together with metadata. The CLR turns IL into native code for the current platform.



## Further Reading
- [Common Language Runtime - Wikipedia](https://en.wikipedia.org/wiki/Common_Language_Runtime)
- [Just-in-time compilation - Wikipedia](https://en.wikipedia.org/wiki/Just-in-time_compilation)
- [Common Language Runtime (CLR) overview - .NET \| Microsoft Learn](https://docs.microsoft.com/en-us/dotnet/standard/clr)
