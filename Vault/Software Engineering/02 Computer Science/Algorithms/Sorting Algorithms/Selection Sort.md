---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Low
status: Creation
dg-publish: true
---
# Intro

Selection sort builds a sorted prefix by repeatedly finding the minimum element in the unsorted suffix and swapping it into place. It always performs exactly O(n²) comparisons regardless of input order, but only O(n) swaps — making it useful in the rare case where writes are expensive but comparisons are cheap.

## Mechanism

For each position `i`, scan `a[i..n-1]` to find the minimum, then swap it with `a[i]`. After each iteration, the sorted prefix grows by one element.

```mermaid
graph TD
  A[Start array A] --> B[Set i to 0]
  B --> C{i less than n minus 1}
  C -->|No| Z[Done]
  C -->|Yes| D[Set min to i and set j to i plus 1]
  D --> E{j less than n}
  E -->|No| F[Swap A at i and A at min]
  F --> G[Increment i]
  G --> C
  E -->|Yes| H{A at j less than A at min}
  H -->|Yes| I[Set min to j]
  H -->|No| J[No op]
  I --> K[Increment j]
  J --> K
  K --> E
```

## Complexity

| Case | Time | Space | Swaps |
|------|------|-------|-------|
| Best | O(n²) | O(1) | O(n) |
| Average | O(n²) | O(1) | O(n) |
| Worst | O(n²) | O(1) | O(n) |

**Properties:** in-place, typically not stable (a swap can reorder equal keys), exactly n−1 swaps in the worst case.

## C# Implementation

```csharp
public static void SelectionSort(int[] a)
{
    int n = a.Length;
    for (int i = 0; i < n - 1; i++)
    {
        int minIdx = i;
        for (int j = i + 1; j < n; j++)
        {
            if (a[j] < a[minIdx])
                minIdx = j;
        }
        if (minIdx != i)
            (a[i], a[minIdx]) = (a[minIdx], a[i]);
    }
}
```

## When to Use

Rarely in production. The O(n) swap count is its only advantage over bubble sort. Consider it when:
- Writes are significantly more expensive than reads (e.g., flash memory with limited write cycles).
- You need a simple, predictable algorithm with no extra memory.

For general use, prefer insertion sort (better on nearly-sorted data) or `Array.Sort` (introsort).

## References

- [Selection sort (Wikipedia)](https://en.wikipedia.org/wiki/Selection_sort) — algorithm description, stability discussion, and comparison with insertion sort.
- [Sorting visualizations (VisuAlgo)](https://visualgo.net/en/sorting) — step-by-step animation comparing all basic sorting algorithms.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/Algorithms/Algorithms|Algorithms]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Bubble Sort|Bubble Sort]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Merge Sort|Merge Sort]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Quick Sort|Quick Sort]]
<!-- whats-next:end -->
