---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: Medium
status: Ready To Repeat
tags:
  - FolderNote
dg-publish: true
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

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/Fundamentals/Fundamentals|Fundamentals]]
>
<!-- whats-next:end -->
