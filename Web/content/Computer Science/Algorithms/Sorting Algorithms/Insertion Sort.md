---
publish: true
created: 2026-08-20T20:41:15.542Z
modified: 2026-08-20T20:41:15.542Z
published: 2026-08-20T20:41:15.542Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Grows a sorted prefix by shifting larger elements right and inserting each new key.
level:
  - "4"
priority: Low
status: Ready to Repeat
---

A mostly ordered array already contains useful work, such as a sorted log with a few late entries appended out of sequence. A general sort may ignore that structure and pay roughly the same cost as it would on random data. Insertion sort keeps the ordered part as a sorted prefix and folds one new element into it on each step.

The incoming element is the key. Starting at the right edge of the prefix, every larger element moves one slot right and opens a gap. The key drops into that gap. Since the prefix was already sorted, the walk can stop at the first value no larger than the key. The shifted values remain ordered among themselves.

**Core condition:** a sorted prefix and one incoming key → shift larger prefix elements right until the key lands → repeat until the prefix covers the array.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"insertion-sort","array":[8,3,5,1,9,2,7,4]}
```



The prefix left of the active index is sorted before each step and stays sorted after it. When a key is smaller than its left neighbour, every larger prefix element copies one position right until a smaller element—or the start of the array—halts the walk, and the key fills the vacated slot. A key that already fits, like `9` following `1, 3, 5, 8`, triggers no shift and the prefix simply grows by one. The number of shifts a key performs equals the count of larger elements standing to its left, so the further a key is out of place, the more work it does.

#### Why the Sorted Prefix Holds

Before iteration `j`, the subarray `a[0..j-1]` holds the first `j` elements in sorted order. The step copies `a[j]` into `key`, then scans left while `a[i] > key`, moving each such element into `a[i+1]`. The loop stops at the first `a[i] <= key` (or at `i = -1`) and writes `key` into `a[i+1]`. Nothing left of that slot exceeds `key`, and everything right of it was already shifted up, so `a[0..j]` is sorted—the invariant carries to the next iteration.

One property falls directly out of the shift-and-drop move:

- **Stable.** The scan stops on the first element that is `<=` the key rather than `<`, so an incoming element never crosses an equal one already placed. Equal keys keep their original relative order.

The shift count follows the disorder already present: an ordered prefix needs no moves, while a misplaced key crosses every larger prefix element. Larger hybrids use insertion sort only on deliberately short runs or partitions—[[Computer Science/Algorithms/Sorting Algorithms/Merge Sort|Merge Sort]]-based [[Computer Science/Algorithms/Sorting Algorithms/Tim Sort|Timsort]] builds short runs with it, and [[Computer Science/Algorithms/Sorting Algorithms/Introsort|Introsort]] uses it below a small-partition threshold. Those ranges are bounded in size, not guaranteed to be nearly sorted.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Insertion Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the input array"
    }
  },
  "resources": {
    "time": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(n²)",
          "curveId": "quadratic"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(n²)",
          "curveId": "quadratic"
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

Cutting comparisons does not fix this. Since the prefix is sorted, [[Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] can locate the key's slot in `O(log j)` comparisons instead of a linear scan—binary insertion sort. But locating the slot is not the bottleneck: the elements between the slot and the key still shift right one at a time, so the array movement stays `O(n²)`. Binary insertion only pays off when a comparison costs far more than a move, such as ordering long strings through an expensive comparator.
````

# Diagram and C# Implementation

> [!ABSTRACT]- Control flow
>
> ```mermaid
> graph TD
>   A[Start array A] --> B[Set j to 1]
>   B --> C{j less than n}
>   C -->|No| Z[Done]
>   C -->|Yes| D[Set key to A at j and set i to j minus 1]
>   D --> E{i nonneg and A at i greater than key}
>   E -->|Yes| F[Shift right and decrement i]
>   F --> E
>   E -->|No| G[Insert key at i plus 1]
>   G --> H[Increment j]
>   H --> C
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void InsertionSort(int[] a)
> {
>     for (int j = 1; j < a.Length; j++)
>     {
>         int key = a[j];
>         int i = j - 1;
>         while (i >= 0 && a[i] > key)
>         {
>             a[i + 1] = a[i];
>             i--;
>         }
>         a[i + 1] = key;
>     }
> }
> ```
>
> The strict `a[i] > key` test is what makes the sort stable. Relaxing it to `>=` would shift equal elements and reverse their original order.

# References

- [NIST Dictionary of Algorithms and Data Structures: insertion sort](https://xlinux.nist.gov/dads/HTML/insertionSort.html)
