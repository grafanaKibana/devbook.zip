---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Scans elements one by one until a match and works without ordering or indexing."
level:
  - "4"
priority: Medium
status: Done
publish: true
---

A freshly captured log buffer holds unsorted lines, and the task is to find the first one that mentions an error. Nothing in the buffer is ordered or indexed, so no comparison can rule out a line that has not yet been read. Linear Search accepts exactly that constraint: it compares each element against the target in sequence and returns on the first match, or reports absence once the sequence ends.

The missing precondition is the whole point. [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] needs sorted, indexable input; a hash lookup needs a prebuilt index. Linear Search assumes neither, so it runs unchanged over an unsorted array, a singly linked list, or a stream read once and never rewound. That generality is precisely what a search with stronger input assumptions gives up.



~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"linear-search","array":[4,9,13,18,22,27,31,38,45,52,58,64,70,77,83,91],"target":83}
```



The trace searches for `83` in a 16-element array.

The scan starts at index 0 and compares each value with `83` in order until it reaches the match at index 14. No comparison rules out an element it has not read, because unsorted input offers no proof about the values ahead. Unlike [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]], the scan never discards a range: every unchecked element stays a candidate until it is inspected, and the search ends only on the first match or when the sequence is exhausted.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Linear Search complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    }
  },
  "resources": {
    "time": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```
~~~~~

# Why No Precondition is Needed

Linear Search reads the sequence in whatever order the structure yields and tests each element independently. It never computes a midpoint, never hashes a key, and never compares two elements to each other — so it requires neither ordering, nor random access, nor a key that maps to a slot. Every faster search buys its speed by adding an assumption — sorted order, an index, a hash function — and paying to establish and maintain it.

The only invariant available is weak by design. After inspecting the first `k` elements, the target is known to be absent from those `k` and possibly present in the remaining `n − k`. Without ordering or an index there is no stronger claim, so the sole way to shrink the unknown region is to read one more element. A faster search replaces this one-at-a-time shrinkage with an assumption that lets a single step eliminate many candidates at once.

# When a Scan is the Wrong Tool

Any correct method must at least read the elements it declares absent, and reading them is the entire cost, so no preprocessing pays back within one query.

The boundary appears once the same collection is searched repeatedly.

# Reference Drawer

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
> The loop reads each array element in index order and returns `-1` when the target is absent. .NET's `Array.IndexOf` exposes that array-index contract. For an `IEnumerable<T>`, `FirstOrDefault(predicate)` performs a sequential predicate scan but returns the matched value, not its index.

# Questions

> [!QUESTION]- Why does Linear Search require no precondition on its input?
> It tests each element independently and never compares two elements to each other or computes a position, so it needs neither ordering nor an index. The cost of that generality is that it cannot skip any element it has not yet read.

> [!QUESTION]- Why can the scan not skip an element without additional structure?
> An unread element may still equal the target, so a correct scan must inspect each value it rules out. Ordering or a separate index is what supplies evidence that an unread region cannot contain the answer.

> [!QUESTION]- When does building an index beat repeated scans?
> Indexing pays when the data stays stable and many searches can reuse the structure. For a one-off query, construction adds work before the same target can be answered.


# References

- [Linear search (Wikipedia)](https://en.wikipedia.org/wiki/Linear_search) — average- and worst-case analysis and the sentinel-value variant that removes the bounds check from the loop without changing the complexity class.
- [`Array.IndexOf` method (.NET API)](https://learn.microsoft.com/dotnet/api/system.array.indexof) — the framework's built-in linear scan over an array; returns `-1` when the value is absent.
- [`Enumerable.FirstOrDefault` method (.NET API)](https://learn.microsoft.com/dotnet/api/system.linq.enumerable.firstordefault) — the sequential first-match scan over any `IEnumerable<T>`, backing the note's point that Linear Search applies to structures walked once with no random access.
