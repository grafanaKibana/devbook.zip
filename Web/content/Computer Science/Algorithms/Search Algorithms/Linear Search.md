---
publish: true
created: 2026-08-20T20:41:15.535Z
modified: 2026-08-20T20:41:15.535Z
published: 2026-08-20T20:41:15.535Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Scans elements one by one until a match and works without ordering or indexing.
level:
  - "4"
priority: Medium
status: Done
---

An unsorted log buffer has no order or index that can rule out an unread line. Linear Search accepts that limitation. It checks each element in sequence, returns the first match, and reports absence only after the sequence ends.

The lack of a precondition is its main advantage. [[Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] needs sorted, indexable input, while a hash lookup needs a prebuilt index. Linear Search works unchanged over an unsorted array, a singly linked list, or a stream that can be read only once.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"linear-search","array":[4,9,13,18,22,27,31,38,45,52,58,64,70,77,83,91],"target":83}
```



The trace searches for `83` in a 16-element array.

The scan starts at index 0 and compares each value with `83` in order until it reaches the match at index 14. No comparison rules out an element it has not read, because unsorted input offers no proof about the values ahead. Unlike [[Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]], the scan never discards a range: every unchecked element stays a candidate until it is inspected, and the search ends only on the first match or when the sequence is exhausted.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Linear Search complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the searched sequence"
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
````

# Why No Precondition is Needed

Linear Search follows the structure's natural order and tests each element independently. It computes no midpoint and maintains no index, so it needs neither ordering nor random access. Faster lookup comes from extra structure that must first be built and then kept valid.

After inspecting `k` elements, the only proof is that those `k` do not match. The target may still appear anywhere in the remaining `n − k`. With no ordering or index, reading the next element is the only way to shrink that unknown region.

# When a Scan is the Wrong Tool

For one query over unindexed data, a scan is usually the right baseline. Sorting first does more work than the scan it was meant to avoid.

Repeated queries change the arithmetic. An index or sorted copy can repay its build cost across many lookups, provided the collection stays stable enough that maintenance does not dominate.

# Diagram and C# Implementation

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

# References

- [`Array.IndexOf` method (.NET API)](https://learn.microsoft.com/dotnet/api/system.array.indexof)
