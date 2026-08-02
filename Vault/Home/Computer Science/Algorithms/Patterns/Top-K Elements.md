---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Finds the k largest or smallest values with a size-k heap over a stream."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A feed produces millions of latency samples and a dashboard needs the ten slowest.

Keeping a size-`k` heap while scanning removes that waste. To surface the `k` **largest** values the heap is a **min**-heap. While filling, it contains every value seen; once full, its root is the smallest of the `k` best elements seen so far — the weakest survivor. A new element only matters if it beats that root, and when it does the root is evicted and the newcomer inserted, so the heap size never exceeds `k`. After one pass the heap holds the largest `min(k, n)` values, and it held no more than `k` elements at any moment, so the input can arrive as a stream. The symmetric problem — the `k` smallest — uses a max-heap the same way.



~~~~~tabsdown
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
      "description": "number of input elements or states"
    },
    "keyRange": {
      "symbol": "k",
      "description": "key range, digit count, or requested result count"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Bounded min-heap selection",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(n log k)"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Bounded min-heap selection",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(k)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# When the Assumptions Stop Holding

Using a size-`k` max-heap for the `k` largest inverts the mechanism: its root is the strongest retained element, so replacing that root keeps the wrong side and collects the `k` smallest. The min-heap invariant and its operations are described further in [[Home/Computer Science/Data Structures/Trees/Heap-like/Heap|Heap]].

For a known-size input where `k ≥ n`, bypass the heap and return all values. Sort them only when the caller requires ranked output, using an in-memory algorithm such as [[Home/Computer Science/Algorithms/Sorting Algorithms/Quick Sort|Quick Sort]] or [[Home/Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]]. An unknown-length stream that ends before the heap fills simply returns every value seen.

# Reference Drawer

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
> `KLargest` returns all values seen when the stream contains fewer than `k`; otherwise it returns exactly `k`. `UnorderedItems` exposes no enumeration-order guarantee, so callers must treat the returned order as unspecified.

# Questions

> [!QUESTION]- To find the `k` largest elements, why is the heap a min-heap rather than a max-heap?
> The size-`k` min-heap keeps its root as the smallest of the `k` best elements seen so far — the weakest survivor. A max-heap would surface the largest retained element, which is never the one to drop, so it cannot drive the scan.




> [!QUESTION]- What should the streaming implementation return when fewer than `k` values arrive?
> It returns every value seen. The heap never reaches capacity, so no element faces the weakest-winner rejection test; `UnorderedItems` still exposes those values in unspecified enumeration order.

# References

- [Kth Largest Element in an Array (LeetCode #215)](https://leetcode.com/problems/kth-largest-element-in-an-array/) — the canonical problem contrasting the size-`k` heap with Quickselect.
- [C. A. R. Hoare, "Algorithm 65: Find"](https://doi.org/10.1145/366622.366647) — the original partition-selection algorithm behind Quickselect.
- [`PriorityQueue<TElement,TPriority>`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — .NET's array-backed quaternary min-heap and the `DequeueEnqueue` operation used by the streaming implementation.
