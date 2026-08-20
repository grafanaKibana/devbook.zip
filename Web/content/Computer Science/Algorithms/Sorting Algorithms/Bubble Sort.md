---
publish: true
created: 2026-08-20T20:41:15.540Z
modified: 2026-08-20T20:41:15.540Z
published: 2026-08-20T20:41:15.540Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Repeatedly swaps adjacent out-of-order elements. A slow teaching baseline for why better sorts exist.
level:
  - "4"
priority: Low
status: Ready to Repeat
---

When adjacent swaps are the only permitted move, every value travels one position at a time. Bubble Sort repeatedly scans left to right, compares `a[i]` with `a[i+1]`, and swaps when `a[i] > a[i+1]`. The running maximum keeps moving right and reaches its final slot by the end of the pass.

That movement is uneven. A large value can cross the array in one pass, while a small value moves left only when the scan reaches its immediate neighbor. After each pass, one more tail position is settled. A pass with no swaps proves that the array is already ordered and ends the sort early.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"bubble-sort","array":[8,3,5,1,9,2,7,4]}
```

The trace sorts `[8, 3, 5, 1, 9, 2, 7, 4]` with left-to-right compare-and-swap passes.

`9` is the largest value in the first pass. Once a swap brings it into the traveling comparison window it beats every element to its right and slides to index 7, its permanent position. The next pass stops one element short because that tail slot is already correct, and each later pass shortens again as the sorted suffix grows leftward. The `swapped` flag watches for the moment this settling is complete: the first pass that finishes without a single swap means no adjacent pair is out of order, so the whole array is sorted and the loop exits.

#### Why a Pass Settles the Tail

The invariant is local: after comparing and swapping `a[i]` and `a[i+1]`, the larger of the two sits at `i+1`. Carried across a full pass, the running maximum is always held at the current index and pushed rightward, so it ends the pass at the far end. After pass `k`, the last `k` positions hold the `k` largest values in order and are never touched again — which is why the scanned range can shrink by one each pass.

The `swapped` flag turns "no work happened" into a stopping condition. On already-sorted input the first pass makes zero swaps and ends the sort. Without the flag, the plain double loop keeps scheduling passes after the array is known to be ordered.

The sort is **stable** because a swap happens only on a strict `a[i] > a[i+1]`; equal keys never cross, so their input order survives.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Bubble Sort complexity",
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

The best case assumes the `swapped` early-exit flag. Without it, even ordered input follows the quadratic comparison curve because the fixed double loop still schedules every pass.
````

# Where Adjacency Hurts

The asymmetry is clear on `[2, 3, 4, 5, 1]`. The `1` shifts left by one slot per pass: first `[2, 3, 4, 1, 5]`, then `[2, 3, 1, 4, 5]`. It needs four passes to reach the front even though the rest of the array is ordered. These trailing small values are called "turtles," and they often determine the pass count.

> [!NOTE]
> Cocktail shaker sort alternates forward and backward passes. The reverse pass can move a turtle several positions toward the front in one round, reducing the pass count on inputs like the one above.

# Diagram and C# Implementation

> [!ABSTRACT]- Control flow
>
> ```mermaid
> graph TD
>   A[Start array A] --> B[Set swapped true]
>   B --> C{swapped}
>   C -->|No| Z[Done]
>   C -->|Yes| D[Set swapped false]
>   D --> E[Set i to 0]
>   E --> F{i less than n minus 1}
>   F -->|No| K[Decrement n]
>   K --> L{n greater than 1}
>   L -->|Yes| C
>   L -->|No| Z
>   F -->|Yes| G{A at i greater than A at i plus 1}
>   G -->|Yes| H[Swap A at i and A at i plus 1 and set swapped true]
>   G -->|No| I[No op]
>   H --> J[Increment i]
>   I --> J
>   J --> F
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void BubbleSort(int[] a)
> {
>     int n = a.Length;
>     bool swapped;
>     do
>     {
>         swapped = false;
>         for (int i = 0; i < n - 1; i++)
>         {
>             if (a[i] > a[i + 1])
>             {
>                 (a[i], a[i + 1]) = (a[i + 1], a[i]);
>                 swapped = true;
>             }
>         }
>         n--; // last element is already in place
>     } while (swapped);
> }
> ```
>
> `n--` removes the settled tail element from later scans. The `do/while` runs at least once, and `swapped` ends the sort after the first pass with no exchange.

# References

- [Bubble Sort: An Archaeological Algorithmic Analysis](https://users.cs.duke.edu/~ola/papers/bubble.pdf)
