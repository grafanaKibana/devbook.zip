---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Creation
dg-publish: true
---

# Intro

`HashSet<T>` stores unique values with fast membership checks. Use it when uniqueness and lookup speed matter more than ordering.

## Deeper Explanation

`HashSet<T>` is hash-based and uses `GetHashCode` plus `Equals` to enforce uniqueness.
Its core operations (`Add`, `Contains`, `Remove`) are O(1) on average.

### Example

```csharp
var tags = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "dotnet",
    "csharp"
};

var added = tags.Add("DOTNET"); // false, already exists by comparer
```

### Pitfalls

- Overriding `Equals` without matching `GetHashCode` breaks set behavior.
- Mutating fields that participate in hash/equality after insertion can make entries unreachable.
- Enumeration order is not a stable contract.

### Tradeoffs

- Use `HashSet<T>` for fast uniqueness checks.
- Use `SortedSet<T>` if you need sorted uniqueness and accept O(log n) operations.

## Questions

> [!QUESTION]- What is the difference between `HashSet<T>` and `List<T>` for membership checks?
> `HashSet<T>.Contains` is O(1) average; `List<T>.Contains` is O(n).

> [!QUESTION]- Why can `HashSet<T>.Contains` fail for logically equal objects?
> Because hash/equality contracts are broken (for example, mismatched `GetHashCode`).

## Links

- [HashSet<T> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.hashset-1)
- [ISet<T> interface](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.iset-1)
- [Collections overview and complexity](https://learn.microsoft.com/en-us/dotnet/standard/collections/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/02 Computer Science|02 Computer Science]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Data Structures/Dictionary|Dictionary]]
> - [[Software Engineering/02 Computer Science/Data Structures/Graph|Graph]]
> - [[Software Engineering/02 Computer Science/Data Structures/Hashtable|Hashtable]]
> - [[Software Engineering/02 Computer Science/Data Structures/List|List]]
> - [[Software Engineering/02 Computer Science/Data Structures/Trees|Trees]]
<!-- whats-next:end -->
