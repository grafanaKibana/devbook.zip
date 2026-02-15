---
topic:
  - Programming
subtopic:
  - NET
level:
  - "1"
priority: Medium
status: Not-Started
---
> **9.2.5 The string type**
> 
> 
> The string type is a sealed class type that inherits directly from object. Instances of the string class represent Unicode character strings.Values of the string type can be written as string literals (§7.4.5.6).The keyword string is simply an alias for the predefined class System.String
> 

## String

Основные особенности строк в .NET:

1. Они являются ссылочными типами.
2. Они неизменяемы. Однажды, создав строку, мы больше не можем ее изменить (честным способом). Каждый вызов метода этого класса возвращает новую строку, а предыдущая строка становится добычей для сборщика мусора.
3. Они переопределяют метод Object.Equals, в результате чего он сравнивает не значения ссылок, а значения символов в строках.

### Строки — ссылочные типы

Строки являются настоящими ссылочными типами, являются запечатаным классом `System.String`  который наследуется напрямую от `object` , то есть они всегда располагаются в куче. Многие путают их со значимыми типами, потому что они ведут себя также, например, они неизменяемы и их сравнение происходит по значению, а не по ссылкам, но нужно помнить, что это ссылочный тип.

### Строки — неизменяемы

Строки являются неизменяемыми. Это сделано не просто так. В неизменности строк есть немало преимуществ:

- Строковый тип является потокобезопасным, так как ни один поток не может изменить содержимое строки.
- Использование неизменных строк ведет к снижению нагрузки на память, так как нет необходимости хранить 2 экземпляра одной строки. В таком случае и памяти меньше расходуется, и сравнение происходит быстрее, так как требует сравнение лишь ссылок. Механизм, который это реализует в .NET называется интернированием строк (пул строк), о нем поговорим чуть позже.
- При передаче неизменяемого параметра в метод мы можем не беспокоиться, что он будет изменен (если, конечно, он не был передан как `ref` или `out`).

Структуры данных можно разделить на два вида — эфемерные и персистентные. Эфемерными называют структуры данных, хранящие только последнюю свою версию. Персистентными называют структуры, которые сохраняют все свои предыдущие версии при изменении. Последние фактически неизменяемы, так как их операции не изменяют структуру на месте, вместо этого они возвращают новую основанную на предыдущей структуру.

Учитывая, что строки неизменны, они могли бы быть и персистентными, однако таковыми не являются. В .NET строки являются эфемерными. Подробнее о том, почему это именно так можно прочитать у Эрика Липперта по [ссылке](http://blogs.msdn.com/b/ruericlippert/archive/2011/08/08/strings-immutability-and-persistence.aspx.)

### Строки переопределяют Object.Equals

Класс String переопределяет метод Object.Equals, в результате чего сравнение происходит не по ссылке, а по значению. Я думаю, разработчики благодарны создателям класса String за то, что они переопределили оператор ==, так как код, использующий == для сравнения строк, выглядит более изящно, нежели вызов метода.

```csharp
if (s1 == s2)
```

в сравнении

```csharp
if (s1.Equals(s2))
```

Кстати, в Java оператор `==` сравнивает по ссылке, а для того чтобы сравнить строки посимвольно необходимо использовать метод `string.equals()`.

### Интернирование строк

Простой пример, код который переворачивает строку.

```csharp
var s = "Strings are immutuble";
int length = s.Length;
for (int i = 0; i < length / 2; i++)
{
var c = s[i];
   s[i] = s[length - i - 1];
   s[length - i - 1] = c;
}
```

Очевидно, данный код не скомпилируется. Компилятор будет ругаться на эти строки, потому что мы пытаемся изменить содержимое строки. Действительно, любой метод класса String возвращает новый экземпляр строки, вместо того чтобы изменять свое содержимое.

На самом деле строку можно изменить, но для этого придется прибегнуть к unsafe коду:

```csharp
var s = "Strings are immutable";
int length = s.Length;
unsafe
   {
fixed (char* c = s)
     {
for (int i = 0; i < length / 2; i++)
       {
var temp = c[i];
         c[i] = c[length - i - 1];
         c[length - i - 1] = temp;
       }
      }
   }
```

После выполнения этого кода, как и ожидалось, в строке будет записано

**elbatummi era sgnirtS**.

Тот факт, что строки являются все-таки изменяемыми, приводит к одному очень интересному казусу. 

Связан он с интернированием строк.

> [!TIP]
> *Интернирование строк* — это механизм, при котором одинаковые литералы представляют собой один объект в памяти.


Если не вникать глубоко в подробности, то смысл интернирования строк заключается в следующем: в рамках процесса (именно процесса, а не домена приложения) существует одна внутренняя хеш-таблица, ключами которой являются строки, а значениями – ссылки на них. Во время JIT-компиляции литеральные строки последовательно заносятся в таблицу (каждая строка в таблице встречается только один раз). На этапе выполнения ссылки на литеральные строки присваиваются из этой таблицы. Можно поместить строку во внутреннюю таблицу во время выполнения с помощью метода `String.Intern`. Также можно проверить, содержится ли строка во внутренней таблице с помощью метода `String.IsInterned`.

```csharp
var s1 = "habrahabr";
var s2 = "habrahabr";
var s3 = "habra" + "habr";

Console.WriteLine(object.ReferenceEquals(s1, s2)); //true
Console.WriteLine(object.ReferenceEquals(s1, s3)); //true
```

Важно отметить, что интернируются по умолчанию только строковые литералы. Поскольку для реализации интернирования используется внутренняя хеш-таблица, то во время JIT компиляции происходит поиск по ней, что занимает время, поэтому если бы интернировались все строки, то это свело бы на нет всю оптимизацию. Во время компиляции в IL код, компилятор конкатенирует все литеральные строки, так как нет в необходимости содержать их по частям, поэтому 2 — ое равенство возвращает true. Так вот, в чем заключается казус. Рассмотрим следующий код:

```csharp
var s = "Strings are immutable";
int length = s.Length;
unsafe
 {
fixed (char* c = s)
   {
for (int i = 0; i < length / 2; i++)
     {
var temp = c[i];
      c[i] = c[length - i - 1];
      c[length - i - 1] = temp;
     }
   }
 }
Console.WriteLine("Strings are immutable");
```

Кажется, что здесь все очевидно и, что такой код должен распечатать **Strings are immutable**. Однако, нет! Код напечатает **elbatummi era sgnirtS**. Дело именно в интернировании, изменяя строку `s`, мы меняем ее содержимое, а так как она является литералом, то интернируется и представляется одним экземпляром строки.

### Особенности производительности

У интернирования есть отрицательный побочный эффект. Дело в том, что ссылка на интернированный объект `String`, которую хранит CLR, может сохраняться и после завершения работы приложения и даже домена приложения. Поэтому большие литеральные строки использовать не стоит или же, если это необходимо стоит отключить интернирование, применив атрибут `CompilationRelaxations` к сборке.

## StringBuilder

## Questions

> [!QUESTION]- What is string interning?
> It's a mechanism where identical strings share a single instance in an intern pool (especially string literals), reducing duplication. You can explicitly intern strings via `string.Intern`.

> [!QUESTION]- What are the differences between `string` and `StringBuilder`? When should you use `StringBuilder`?
> `string` is immutable, so repeated concatenation can allocate many intermediate strings. `StringBuilder` is mutable and is typically preferred when building strings in loops or when many appends are performed.
>
> **`string`** and **`StringBuilder`** are two types used for working with strings in C#, but they differ significantly in how they store and manipulate string data, which makes them suitable for different scenarios.
>
> 1. **Immutability vs mutability**:
>     - **`string`** is immutable. This means that after a string is created, its content cannot be changed. Any modification creates a new string instance in memory.
>     - **`StringBuilder`** is mutable and is designed for efficient string construction and modification. You can append, modify, and delete characters or substrings inside **`StringBuilder`** without creating new string instances.
> 2. **Performance**:
>     - Using **`string`** for many modifications can lead to creating many temporary objects in memory, which can hurt performance and memory usage. **`StringBuilder`** is designed to minimize these temporary allocations and provide better performance for repeated changes.
> 3. **When to use**:
>     - **`string`** is suitable for small strings or situations where the string does not change (or changes rarely).
>     - **`StringBuilder`** is better when you need to build strings with many appends/changes, for example when generating long SQL queries, XML documents, JSON strings, and so on.
>
> Use it when you need to repeatedly modify or build strings inside loops or in scenarios where performance and memory efficiency matter. This is especially useful when working with large amounts of data, such as generating long text output, SQL queries, or XML/JSON structures.
>
> When strings are effectively static and change rarely, **`StringBuilder`** may be unnecessary, and **`string`** is usually the better choice.


## Links

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

