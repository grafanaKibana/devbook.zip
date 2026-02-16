---
{"dg-publish":true,"permalink":"/software-engineering/02-computer-science/data-structures/hash-table-hash-set/","noteIcon":""}
---


# Intro

Hash-based collections use a hash code to map a key to a bucket, aiming for near-constant-time lookup. In .NET this shows up in `Dictionary<TKey, TValue>` and `HashSet<T>`.

## Deeper Explanation

## Questions

> [!QUESTION]- How do hash tables work?
> They compute a hash code from the key to choose a bucket, then store the entry there. When collisions happen, they use chaining or probing to find the correct entry by comparing keys.

## Links

- [Dictionary<TKey, TValue> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/02 Computer Science\|02 Computer Science]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Data Structures/NET Collections\|NET Collections]]
<!-- whats-next:end -->
