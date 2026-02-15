---
topic:
  - Programming
subtopic:
  - NET
level:
  - "1"
priority: Medium
status: Not-Started
tags:
  - FolderNote
---
# Intro

## Deeper Explanation

## List

## Dictionary

## HashTable

A hash table is a data structure used to store key-value pairs, where each key corresponds to a unique hash value. This enables efficient and fast lookup, insertion, and deletion operations because access to a value goes through its hash code, providing near-constant average access time.

## Trees

## Graph

## Questions

> [!QUESTION]- What data structure is used behind `Dictionary<TKey, TValue>`?
> A hash table: it uses hash codes to distribute keys into buckets for efficient average-case lookups.
>
> The primary data structure behind **`Dictionary`** is a hash table.

> [!QUESTION]- How is `List<T>` implemented under the hood?
> `List<T>` wraps an internal array. It tracks `Count` separately from `Capacity`, and when it runs out of capacity it allocates a larger array and copies the existing elements to the new array.
>
> **`List<T>`** is a convenient abstraction over an array, providing dynamic growth when adding elements.
> The internal buffer grows by increasing its capacity to reduce how often memory needs to be reallocated, which improves performance.
> How **`List<T>`** works under the hood:
>
> 1. **Element array `T[]`**:
>     - The core of **`List<T>`** is a regular array of elements of type **`T`**. When you create a **`List<T>`**, it allocates an initial array (often 4 elements) that grows as you add items.
> 2. **`Capacity` and `Count`**:
>     - **`Capacity`** is the current size of the internal array, i.e., how many elements it can hold before it must grow.
>     - **`Count`** is how many elements have actually been added.
> 3. **Dynamic growth**:
>     - When adding a new element, **`List<T>`** checks **`Count`** and **`Capacity`**. If **`Count`** reaches **`Capacity`**, **`List<T>`** grows the internal array, usually doubling the current **`Capacity`**.
>     - When removing elements, **`Capacity`** does not shrink automatically.

> [!QUESTION]- What is the difference between `Count` and `Capacity` in `List<T>`?
> `Count` is how many items are stored. `Capacity` is how many items the internal buffer can hold before it needs to grow.
>
> **Count**:
> - **`Count`** is the number of elements actually contained in the collection. It changes dynamically when you add or remove elements.
> 
> **Capacity**:
> - **`Capacity`** is the current capacity of the internal buffer, i.e., how many elements the collection can hold before it needs to grow by allocating more memory. It changes less frequently than **`Count`** and typically grows in larger steps. **`Capacity`** matters for performance because growth can be an expensive reallocation + copy.

> [!QUESTION]- How do `Clear` and `Remove` affect `Capacity` in `List<T>`?
> They typically only change `Count`; `Capacity` remains unchanged. To reduce `Capacity`, call `TrimExcess()` or set `Capacity` explicitly, which reallocates and copies elements.
>
> `Capacity` does not change when clearing or removing elements. To reduce `Capacity`, you can call `TrimExcess()` (which sets `Capacity` close to the current size) or set `Capacity` directly. Changing `Capacity` reallocates and copies elements into a new array.

> [!QUESTION]- What is the difference between `IEnumerable` and `IQueryable`?
> **`IEnumerable`** and **`IQueryable`** are two different abstractions. The key difference is that **`IEnumerable`** is intended for in-memory data, while **`IQueryable`** represents a query that can be translated and executed by a remote provider (for example, a database).
> 
> 1. **IEnumerable:**
>     - **`IEnumerable`** is the basic interface for iterating collections (and a common target for LINQ-to-Objects).
>     - It enumerates items one by one using `foreach`.
>     - Operations run on the client side (in memory).
>     - Used for in-memory collections (arrays, lists, etc.).
> 2. **IQueryable:**
>     - **`IQueryable`** extends **`IEnumerable`** and is meant for queryable data sources.
>     - It allows building LINQ queries that a provider can translate (for example into SQL).
>     - Operations can run on the server/provider side and may support deferred loading.
>     - Used for databases, web services, and other remote sources.

> [!QUESTION]- How does deferred execution differ in `IEnumerable` vs `IQueryable`?
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- What happens when you call `ToList()` on an `IQueryable`?
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- What should you watch out for when mixing client-side logic in `IQueryable` expressions?
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- Why is `Dictionary` usually faster than `List` for lookups?
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- How does hash collision affect performance?
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- What's the difference between `Dictionary` and `ConcurrentDictionary`?
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- How would you customize hash code generation for a complex key?
> Answer is not provided in the source interview list; see Links.

> [!QUESTION]- How does inserting a value into a hashtable work?
> Algorithm:
> 
> 1. **Hash the key**: the system hashes the key to get a hash code. The hash code is used to locate where the value should be stored.
> 2. **Find the position**: based on the hash code, the system determines a position (bucket/slot) in the table.
> 3. **Insert the value**:
>     - If the position is empty, the value is stored there.
>     - If the position already has a value (a collision), the system resolves the collision using a strategy such as chaining or open addressing.
>         - **Chaining**: values with the same bucket are stored in a linked structure.
>         - **Open addressing**: if a slot is occupied, the system searches for another available slot using a probing algorithm.
> 
> This provides fast average-case insertions (often constant time) when collisions are low.

> [!QUESTION]- Why does using a hash code instead of comparing full keys speed up lookups?
> A hash table uses the key's hash code to compute an index for where the value should be stored.
> This lets it jump directly to the relevant bucket/slot instead of scanning all elements and comparing each key to the target key.

## Links

- [Anatomy of the .NET dictionary](https://dunnhq.com/posts/2024/anatomy-of-the-dotnet-dictionary/)
- [Under the hood of Dictionary and ConcurrentDictionary](https://habr.com/ru/articles/198104/)

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
