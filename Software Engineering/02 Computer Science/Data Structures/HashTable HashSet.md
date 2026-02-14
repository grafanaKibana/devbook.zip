---
topic:
  - Computer Science
subtopic:
  - Data Structures
level: ["1"]
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
# Intro

Hash-based collections use a hash code to map a key to a bucket, aiming for near-constant-time lookup. In .NET this shows up in `Dictionary<TKey, TValue>` and `HashSet<T>`.

## Deeper Explanation

## Questions

> [!QUESTION]- How do hash tables work?
> They compute a hash code from the key to choose a bucket, then store the entry there. When collisions happen, they use chaining or probing to find the correct entry by comparing keys.

## Further Reading

- [Dictionary<TKey, TValue> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2)
