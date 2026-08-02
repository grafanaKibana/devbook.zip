---
publish: true
created: 2026-07-29T20:22:59.993Z
modified: 2026-08-02T11:47:14.377Z
published: 2026-08-02T11:47:14.377Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: An implicit complete binary tree with a parent-child priority rule, keeping the best item at the root.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

A scheduler holds thousands of pending tasks and repeatedly needs the one with the earliest deadline while new tasks keep arriving.

The structure buys that speed by remembering less than a sorted list. It guarantees that the root is the smallest (or largest) element and nothing more: siblings, cousins, and every element below the root sit in a partial order. The second-smallest item in a binary min-heap is a root child — the smaller one when both exist — but there is no direct arbitrary successor or kth-rank lookup and no sorted iteration.

**Core shape:** complete binary tree → heap-order property (min-heap: parent ≤ both children) → packed implicitly into an array → only the root is the extreme

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"heap","array":[3,5,8,9]}
```

Use the controls to insert and extract repeatedly. The visualizer preserves the current heap between operations, highlights the active sift path, and restores `[3, 5, 8, 9]` on reset.

#### Representation and Invariants

A binary heap is a **complete** binary tree: every level is full except possibly the last, which fills left to right with no gaps. That completeness is what makes an implicit array representation valid — with no holes, the tree maps onto contiguous indices by arithmetic instead of pointers.

For a node at index `i`:

- its children are at `2i + 1` and `2i + 2`,
- its parent is at `(i - 1) / 2` (integer division),
- the root is index `0`, and the last element is the rightmost leaf.

No per-node object, no child pointers, no allocation per element — just one array plus a count. Three operations move state:

- `insert` appends the new value at the end (index `count`), then **sifts up**: while the value is smaller than its parent, swap the two and follow the parent index toward the root.
- `extract-min` reads index `0`, moves the last element into the root, shrinks the count, then **sifts down**: repeatedly swap with the smaller of its two children until neither child is smaller.
- `peek` returns index `0` without touching the array.

The heap-order invariant is local: every parent is `≤` both of its children (min-heap; a max-heap reverses the comparison). Sift-up restores it along a single root-ward path after an append; sift-down restores it along a single leaf-ward path after the root is replaced. The invariant says nothing about order *across* subtrees, so arbitrary ranks cannot be read directly from array positions.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Heap complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "peek / find-min",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "insert",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(log n) amortized; O(n) worst case"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "extract-min",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "build-heap",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "decrease-key",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(log n)",
              "curveId": "log-n"
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
          "operation": "peek / find-min",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "insert",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1) amortized",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "extract-min",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "build-heap",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "decrease-key",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Whole structure",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
````

# Boundaries

Every boundary here traces back to the same fact: the array holds a partial order, not a sorted sequence.

- A heap answers "what is the minimum," never "where is `x`."
- **Efficient arbitrary delete and decrease-key need an external position map.** The operations touch a node by _position_, but the heap exposes elements only by heap-order, not by identity. In .NET 9 and .NET 10, `System.Collections.Generic.PriorityQueue.Remove` performs that linear scan and can be followed by `Enqueue` to emulate a priority update, but the type has no `DecreaseKey`. Lazy deletion — enqueue the new priority and skip stale entries on dequeue — avoids the scan when duplicate entries are acceptable.

# Reference Drawer

> [!ABSTRACT]- Array-backed min-heap (indices under values)
>
> ```mermaid
> graph TD
>   A["1 · idx 0"]
>   B["3 · idx 1"]
>   C["5 · idx 2"]
>   D["8 · idx 3"]
>   E["9 · idx 4"]
>   F["6 · idx 5"]
>   G["7 · idx 6"]
>   A --> B
>   A --> C
>   B --> D
>   B --> E
>   C --> F
>   C --> G
> ```
>
> The same state stored linearly: `[1, 3, 5, 8, 9, 6, 7]`. Node `idx 1` (value `3`) has children at `2·1+1 = 3` and `2·1+2 = 4`.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class MinHeap
> {
>     private readonly List<int> _items = new();
>
>     public int Count => _items.Count;
>
>     public int Peek() =>
>         _items.Count > 0 ? _items[0] : throw new InvalidOperationException("Empty heap.");
>
>     public void Insert(int value)
>     {
>         _items.Add(value);
>         SiftUp(_items.Count - 1);
>     }
>
>     public int ExtractMin()
>     {
>         var min = Peek();
>         var last = _items.Count - 1;
>         _items[0] = _items[last];
>         _items.RemoveAt(last);
>         if (_items.Count > 0)
>         {
>             SiftDown(0);
>         }
>
>         return min;
>     }
>
>     public static MinHeap Build(IEnumerable<int> values)
>     {
>         var heap = new MinHeap();
>         heap._items.AddRange(values);
>         for (var i = heap._items.Count / 2 - 1; i >= 0; i--)
>         {
>             heap.SiftDown(i);
>         }
>
>         return heap;
>     }
>
>     private void SiftUp(int i)
>     {
>         while (i > 0)
>         {
>             var parent = (i - 1) / 2;
>             if (_items[i] >= _items[parent])
>             {
>                 break;
>             }
>
>             (_items[i], _items[parent]) = (_items[parent], _items[i]);
>             i = parent;
>         }
>     }
>
>     private void SiftDown(int i)
>     {
>         var n = _items.Count;
>         while (true)
>         {
>             var smallest = i;
>             var left = 2 * i + 1;
>             var right = 2 * i + 2;
>             if (left < n && _items[left] < _items[smallest]) smallest = left;
>             if (right < n && _items[right] < _items[smallest]) smallest = right;
>             if (smallest == i)
>             {
>                 break;
>             }
>
>             (_items[i], _items[smallest]) = (_items[smallest], _items[i]);
>             i = smallest;
>         }
>     }
> }
> ```
>
> `Build` starts sift-down at index `Count / 2 - 1` — the last internal node — because every index beyond it is a leaf that already satisfies heap order. A decrease-key or arbitrary remove needs stable unique item handles and a parallel handle-to-index dictionary updated inside both sift loops; mapping by value alone fails when duplicate values occupy different indices.

# Questions

> [!QUESTION]- Why can a complete binary tree be stored without any pointers?
> Completeness means levels fill left to right with no gaps, so node positions are contiguous. A node at index `i` therefore has children at `2i+1` and `2i+2` and a parent at `(i-1)/2`, computed arithmetically. A tree with holes would break that indexing and force explicit links.

# References

- [`PriorityQueue<TElement, TPriority>.Remove`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2.remove?view=net-10.0) — official .NET 9/10 API documentation for the scan used to remove an arbitrary element.
- [`PriorityQueue` source in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Collections/src/System/Collections/Generic/PriorityQueue.cs) — the production .NET implementation uses a quaternary rather than binary heap, but applies the same implicit-array and sift mechanisms with four children per node.
- [Sedgewick and Wayne, _Algorithms, 4th Edition_, §2.4 Priority Queues](https://algs4.cs.princeton.edu/24pq/) — binary-heap representation, swim/sink operations, resizing costs, and the bottom-up heap-construction proof.
- [CLRS, _Introduction to Algorithms_, Chapter 6 — Heapsort](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) — the build-heap height-sum proof and the heap-order invariant.
