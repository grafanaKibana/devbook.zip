---
publish: true
created: 2026-08-20T20:41:15.532Z
modified: 2026-08-20T20:41:15.532Z
published: 2026-08-20T20:41:15.532Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Finds the k largest or smallest values with a size-k heap over a stream.
level:
  - "4"
priority: Medium
status: Creation
---

A latency feed produces millions of samples. The dashboard needs only the ten slowest.

A size-`k` heap avoids sorting or retaining the whole feed. Finding the `k` **largest** values requires a **min**-heap. Once full, its root is the smallest retained winner. A new value replaces that root only when it is larger, and the heap never grows beyond `k`. After one pass it holds the largest `min(k, n)` values, even if the input arrived as a stream. Finding the `k` smallest reverses the polarity and uses a max-heap.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"top-k-elements","array":[12,3,17,8,25,5,19,14],"k":3}
```

The trace keeps the internal heap-array order visible rather than sorting the answer after the scan. Its final `[17, 25, 19]` is a valid min-heap containing the three largest values: `17` is the weakest winner at the root, while `25` and `19` need no ordering relative to each other.

The StepTrace uses a binary tree because that shape makes parent-child repairs easy to see. .NET's `PriorityQueue<TElement, TPriority>` uses an array-backed quaternary min-heap; both arities enforce the same invariant that every parent is no larger than its children.



The invariant carried across the scan is that the heap contains every value seen until it reaches `k`; once full, it contains the `k` largest values seen so far, with the `k`-th largest at the root. Each later element `x` faces one comparison against the root:

- `x > root` proves `x` belongs to the top `k` — it beats the current weakest survivor. The root leaves, `x` enters, and the heap again holds the `k` largest seen so far.
- `x ≤ root` need not be retained. If `x < root`, it cannot qualify because it is smaller than every retained winner. If `x = root`, replacing the root would leave the retained value multiset unchanged. Discarding `x` therefore preserves the invariant.

The polarity is the load-bearing choice. Exposing the *minimum* of the retained set at the root makes the "does this element deserve to be kept" test direct and ensures eviction removes the weakest survivor. A max-heap of size `k` would expose the *largest* retained element, which is never the one to drop, so it cannot support this scan.

Because the heap never exceeds `k` entries, it retains only the current candidates rather than materializing the full input. That fixed capacity is what lets the input arrive as a stream.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Top-K Elements complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements processed to select the top k"
    },
    "keyRange": {
      "symbol": "k",
      "description": "number of requested results and heap capacity"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (sort all elements)",
          "formula": "O(n log n)",
          "curveId": "n-log-n"
        },
        {
          "kind": "approach",
          "label": "Top-K (bounded heap)",
          "formula": "O(n log k)",
          "curveFrom": "linear",
          "curveTo": "n-log-n"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (sort all elements)",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Top-K (bounded heap)",
          "formula": "O(k)",
          "curveFrom": "constant",
          "curveTo": "linear"
        }
      ]
    }
  }
}
```
````

# When the Assumptions Stop Holding

Using a size-`k` max-heap for the `k` largest keeps the wrong side of the partition. Its root is the strongest retained element, so replacing that root eventually collects the `k` smallest. The min-heap invariant and its operations are described further in [[Computer Science/Data Structures/Trees/Heap-like/Heap|Heap]].

For known-size input with `k ≥ n`, return every value and skip the heap. Sort only if the caller requires ranked output, using an in-memory algorithm such as [[Computer Science/Algorithms/Sorting Algorithms/Quick Sort|Quick Sort]] or [[Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]]. A stream that ends before the heap fills follows the same rule and returns everything it produced.

# Diagram and C# Implementation

> [!ABSTRACT]- Streaming min-heap for the k largest
>
> ```mermaid
> flowchart TD
>   A[Empty min-heap, capacity k] --> B{More input}
>   B -->|No| Z[Heap holds the largest min(k,n) values]
>   B -->|Yes| C[Read next element x]
>   C --> D{Heap size less than k}
>   D -->|Yes| E[Push x]
>   D -->|No| F{x greater than root}
>   F -->|Yes| G[Pop root, push x]
>   F -->|No| H[Discard x]
>   E --> B
>   G --> B
>   H --> B
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Streaming: k largest via a size-k min-heap.
> public static int[] KLargest(IEnumerable<int> stream, int k)
> {
>     ArgumentNullException.ThrowIfNull(stream);
>     if (k <= 0)
>         throw new ArgumentOutOfRangeException(nameof(k), k, "k must be positive.");
>
>     var heap = new PriorityQueue<int, int>();   // min-heap: priority == value
>     foreach (int x in stream)
>     {
>         if (heap.Count < k)
>         {
>             heap.Enqueue(x, x);                 // still filling the first k
>         }
>         else if (x > heap.Peek())               // x beats the weakest survivor
>         {
>             heap.DequeueEnqueue(x, x);          // replace the weakest survivor in one operation
>         }
>         // else: x cannot improve the retained top k, discard it
>     }
>     return heap.UnorderedItems.Select(e => e.Element).ToArray();
> }
> ```
>
> `KLargest` returns all values seen when the stream contains fewer than `k`. Otherwise it returns exactly `k`. `UnorderedItems` exposes no enumeration-order guarantee, so callers must treat the returned order as unspecified.

# References

- [C. A. R. Hoare, "Algorithm 65: Find"](https://doi.org/10.1145/366622.366647)
- [Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/)
