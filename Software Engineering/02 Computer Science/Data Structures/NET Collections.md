---
topic:
  - "Computer Science"
subtopic:
  - "Data Structures"
level:
  - "4"
priority: Medium
status: Ready To Repeat

dg-publish: true
---

# Intro

.NET provides a set of collection types (like `List<T>`, `Dictionary<TKey, TValue>`, `HashSet<T>`) plus common abstractions (`IEnumerable<T>`, `IQueryable<T>`) that affect performance, memory, and execution location.

## Deeper Explanation

## Questions

> [!QUESTION]- How is `List<T>` implemented under the hood?
> `List<T>` wraps an internal `T[]` buffer and tracks `Count` separately from `Capacity`.
> When you add past `Capacity`, it allocates a larger array (typically grows by ~2x) and copies elements.
> Removing items usually does not shrink the buffer automatically.

> [!QUESTION]- What is the difference between `Count` and `Capacity` in `List<T>`?
> `Count` is how many elements are logically in the list.
> `Capacity` is the size of the internal array buffer; it can be larger than `Count` to avoid reallocations on growth.

> [!QUESTION]- How do `Clear()` and `Remove()` affect `Capacity` in `List<T>`?
> They typically do not change `Capacity`; they change `Count`. To shrink the buffer you can call `TrimExcess()` or set `Capacity` manually, which reallocates and copies elements.

> [!QUESTION]- Which data structure is behind `Dictionary<TKey, TValue>`?
> A hash table: the key's hash code chooses a bucket, and collisions are resolved by walking entries in that bucket while comparing keys.

> [!QUESTION]- How does `Object.GetHashCode()` work?
> It returns an integer used by hash-based collections to bucket objects. The key contract is that objects considered equal by `Equals` must return the same hash code; collisions are permitted.

> [!QUESTION]- What is the difference between `IEnumerable` and `IQueryable`?
> `IEnumerable` is for in-memory iteration (LINQ-to-Objects uses delegates and runs locally).
> `IQueryable` represents a provider-backed query (LINQ builds an expression tree that can be translated and executed by a remote provider, for example SQL).

## Links

- [List<T> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1)
- [List<T>.Capacity property](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.capacity)
- [List<T>.TrimExcess method](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1.trimexcess)
- [Dictionary<TKey, TValue> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2)
- [Which data structure is behind Dictionary?](https://habr.com/ru/post/198104/)
- [Object.GetHashCode method](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode)
- [HashCode struct](https://learn.microsoft.com/en-us/dotnet/api/system.hashcode)
- [foreach statement (C# reference)](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements#the-foreach-statement)
- [How is foreach implemented in C#?](https://stackoverflow.com/questions/11179156/how-is-foreach-implemented-in-c)
- [Iterators and foreach (C# guide)](https://learn.microsoft.com/en-us/dotnet/csharp/iterators)
- [IQueryable<T> interface](https://learn.microsoft.com/en-us/dotnet/api/system.linq.iqueryable-1)
- [Difference between IEnumerable and IQueryable (Metanit)](https://metanit.com/sharp/entityframework/1.4.php)
- [What is yield and how does it work?](https://habr.com/ru/post/311094/)

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
