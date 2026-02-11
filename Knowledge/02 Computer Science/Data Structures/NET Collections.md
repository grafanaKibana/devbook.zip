---
topic: ["Computer Science"]
subtopic: ["Data Structures"]
level: ["1"]
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

.NET provides a set of collection types (like `List<T>`, `Dictionary<TKey, TValue>`, `HashSet<T>`) plus common abstractions (`IEnumerable<T>`, `IQueryable<T>`) that affect performance, memory, and execution location.

## Deeper Explanation

## Questions

> [!QUESTION]- How is `List<T>` implemented under the hood?
> It is a dynamic array backed by a contiguous `T[]` buffer plus a size counter. When adding past capacity it allocates a larger array and copies existing elements.

> [!QUESTION]- What is the difference between `Count` and `Capacity` in `List<T>`?
> `Count` is the number of stored elements. `Capacity` is the size of the internal buffer; it can be larger than `Count` to accommodate growth without reallocations.

> [!QUESTION]- How do `Clear()` and `Remove()` affect `Capacity` in `List<T>`?
> They typically do not change `Capacity`; they change `Count`. To shrink the buffer you can call `TrimExcess()` or set `Capacity` manually, which reallocates and copies elements.

> [!QUESTION]- Which data structure is behind `Dictionary<TKey, TValue>`?
> A hash table: the key's hash code chooses a bucket, and collisions are resolved by walking entries in that bucket while comparing keys.

> [!QUESTION]- How does `Object.GetHashCode()` work?
> It returns an integer used by hash-based collections to bucket objects. The key contract is that objects considered equal by `Equals` must return the same hash code; collisions are permitted.

> [!QUESTION]- How is `foreach` implemented "under the hood"?
> The compiler rewrites it: for arrays it can become an indexed `for`, otherwise it becomes a loop over an enumerator calling `MoveNext()`/`Current`, usually with `try/finally` to dispose the enumerator.

> [!QUESTION]- Which types can be used in `foreach`?
> Any type that implements `IEnumerable`/`IEnumerable<T>`, or a type that provides a suitable `GetEnumerator()` returning an enumerator with `Current` and `MoveNext()`.

> [!QUESTION]- What is the difference between `IEnumerable` and `IQueryable`?
> `IEnumerable` is for in-memory iteration (LINQ uses delegates). `IQueryable` is for provider-backed queries (LINQ builds expression trees that can be translated and executed remotely).

> [!QUESTION]- What is `yield` and how does it work?
> It enables iterator methods: the compiler generates a state machine that lazily produces values for `IEnumerable`. `yield return` emits one value and suspends execution; `yield break` ends the sequence.

## Further Reading

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
