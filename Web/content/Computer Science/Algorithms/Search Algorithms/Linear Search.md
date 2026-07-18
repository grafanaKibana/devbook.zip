---
publish: true
created: 2026-07-12T14:27:20.409Z
modified: 2026-07-18T11:30:04.136Z
published: 2026-07-18T11:30:04.136Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Scans elements one by one until a match; O(n) and works on any data.
level:
  - "4"
priority: Medium
status: Done
---

A freshly captured log buffer holds unsorted lines, and the task is to find the first one that mentions an error. Nothing in the buffer is ordered or indexed, so no comparison can rule out a line that has not yet been read. Linear Search accepts exactly that constraint: it compares each element against the target in sequence and returns on the first match, or reports absence once the sequence ends.

The missing precondition is the whole point. [[Binary Search]] needs sorted, indexable input; a hash lookup needs a prebuilt index. Linear Search assumes neither, so it runs unchanged over an unsorted array, a singly linked list, or a stream read once and never rewound. That generality is precisely what a faster search gives up.

**Core condition:** any sequence, no ordering or index → one comparison per element until match or end → `O(n)` time with `O(1)` auxiliary space.

# One search

The trace searches for `83` in a 16-element array.

```steptrace
{"algorithm":"linear-search","array":[4,9,13,18,22,27,31,38,45,52,58,64,70,77,83,91],"target":83}
```

The scan starts at index 0 and compares each value with `83` in order, reaching the match at index 14 after 15 comparisons; a target that was absent would cost all 16. No comparison rules out an element it has not read, because unsorted input offers no proof about the values ahead. Unlike [[Binary Search]], the scan never discards a range: every unchecked element stays a candidate until it is inspected, and the search ends only on the first match or when the sequence is exhausted.

# Why no precondition is needed

Linear Search reads the sequence in whatever order the structure yields and tests each element independently. It never computes a midpoint, never hashes a key, and never compares two elements to each other — so it requires neither ordering, nor random access, nor a key that maps to a slot. That is what makes it the baseline: it works on an unsorted array, on a singly linked list with no `O(1)` indexing, and on a stream consumed once. Every faster search buys its speed by adding an assumption — sorted order, an index, a hash function — and paying to establish and maintain it.

The only invariant available is weak by design. After inspecting the first `k` elements, the target is known to be absent from those `k` and possibly present in the remaining `n − k`. Without ordering or an index there is no stronger claim, so the sole way to shrink the unknown region is to read one more element. A faster search replaces this one-at-a-time shrinkage with an assumption that lets a single step eliminate many candidates at once.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(1)` | `O(1)` | Target sits at the first position; one comparison ends the scan. |
| Average | `O(n)` | `O(1)` | A present target with uniform position is found after `(n + 1) / 2` comparisons. |
| Worst | `O(n)` | `O(1)` | Target is at the last position or absent, forcing all `n` comparisons. |

A sentinel value that removes the bounds check from the loop, or an early exit on the first match, changes only the constant factor: every element between the start and the answer is still read, so the class stays `O(n)`. The average bound assumes a present target equally likely to occupy any position; an absent target always costs the full `n`, which makes a miss — not a hit — the true worst case.

# When a scan is the wrong tool

A single lookup over unsorted input cannot beat `O(n)`. Any correct method must at least read the elements it declares absent, and reading them is the entire cost, so no preprocessing pays back within one query.

The boundary appears once the same collection is searched repeatedly. A one-time `O(n log n)` sort followed by [[Binary Search]] lookups, or an `O(n)` [[HashMap]] build followed by average `O(1)` lookups, amortizes the setup across queries: `q` searches drop from `O(n·q)` to `O(n log n + q log n)` or `O(n + q)`. The scan also degrades quietly when nested inside another loop — a `find` call evaluated once per element is `O(n²)` — so a hot-path membership test belongs in a set or dictionary rather than a repeated scan.

# Reference drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[Start with sequence and target] --> B[Set index i to 0]
>   B --> C{i within bounds}
>   C -->|No| Z[Target is absent]
>   C -->|Yes| D{value at i equals target}
>   D -->|Yes| F[Return i]
>   D -->|No| G[Advance to next element]
>   G --> C
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static int LinearSearch(int[] values, int target)
> {
>     for (var i = 0; i < values.Length; i++)
>     {
>         if (values[i] == target)
>         {
>             return i;
>         }
>     }
>
>     return -1;
> }
> ```
>
> The loop reads each element in index order and returns `-1` when the target is absent. .NET's `Array.IndexOf` performs the same scan and applies equally to any `IEnumerable` walked with `Enumerable.FirstOrDefault`, where no random access exists.

# Questions

> [!QUESTION]- Why does Linear Search require no precondition on its input?
> It tests each element independently and never compares two elements to each other or computes a position, so it needs neither ordering nor an index. The cost of that generality is that it cannot skip any element it has not yet read.

> [!QUESTION]- What is the average comparison count for a present versus an absent target?
> A present target with uniform position averages `(n + 1) / 2` comparisons. An absent target always performs all `n`, so a miss, not a hit, is the true worst case.

> [!QUESTION]- Why can no preprocessing beat `O(n)` for a single search over unsorted data?
> Any correct method must at least read the elements it rules out, and reading them is the whole cost. With one query there is nothing to amortize a build against, so preprocessing only pays back across repeated searches.

> [!QUESTION]- When does building an index beat repeated linear scans?
> When the same collection is searched many times: `q` scans cost `O(n·q)`, while a one-time `O(n log n)` sort plus [[Binary Search]], or an `O(n)` hash build plus average `O(1)` lookups, amortizes to `O(n log n + q log n)` or `O(n + q)`.

# References

- [Linear search (Wikipedia)](https://en.wikipedia.org/wiki/Linear_search) — average- and worst-case analysis and the sentinel-value variant that removes the bounds check from the loop without changing the complexity class.
- [`Array.IndexOf` method (.NET API)](https://learn.microsoft.com/dotnet/api/system.array.indexof) — the framework's built-in linear scan over an array; returns `-1` when the value is absent.
- [`Enumerable.FirstOrDefault` method (.NET API)](https://learn.microsoft.com/dotnet/api/system.linq.enumerable.firstordefault) — the sequential first-match scan over any `IEnumerable<T>`, backing the note's point that Linear Search applies to structures walked once with no random access.
