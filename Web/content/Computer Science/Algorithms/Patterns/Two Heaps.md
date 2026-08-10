---
publish: true
created: 2026-08-10T07:55:26.133Z
modified: 2026-08-10T07:55:26.133Z
published: 2026-08-10T07:55:26.133Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Maintains a running median by partitioning values across a max-heap and a min-heap.
level:
  - "4"
priority: Medium
status: Not-Started
---

The Two Heaps pattern maintains an ordered partition while values arrive. A max-heap named `lower` stores the lower half, and a min-heap named `upper` stores the upper half. Their roots meet at the partition boundary, so the median is available without sorting the accumulated stream.

Two invariants make the result correct:

1. Every value in `lower` is less than or equal to every value in `upper`.
2. `lower.Count` equals `upper.Count` or exceeds it by one.

A new value enters `lower` when it is no greater than the lower root; otherwise it enters `upper`. Moving one root across restores the size rule. With an odd count, `lower.Peek()` is the median. With an even count, the median is the average of both roots.

````tabsdown
tab: Visualization

```steptrace
{ "algorithm": "two-heaps", "array": [5, 2, 10, 4, 7, 3, 8, 9] }
```

The stream rail shows insertion order. After each value arrives, the lower max-heap exposes the largest value from the lower half and the upper min-heap exposes the smallest value from the upper half. Rebalancing moves only a root, preserving both the partition and the size difference of at most one.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Two Heaps complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of values processed so far"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Insert and rebalance",
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
          "operation": "Read median",
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
          "operation": "Process n running medians",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n log n)",
              "curveId": "n-log-n"
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
          "operation": "Stored values",
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

# Where the Pattern Applies

The pattern fits running medians and other streaming partition problems where both sides of a boundary must remain available. It differs from [[Computer Science/Algorithms/Patterns/Top-K Elements|Top-K Elements]]: Top-K keeps only `k` survivors and discards the rest, while Two Heaps retains every value because either half may contribute a future median.

Deletion changes the mechanism. Removing an arbitrary expired value, as in a sliding-window median, is not efficient with only the basic heap API because locating that value is linear. Indexed heaps or lazy-deletion maps add the missing removal path; they are justified only when the window actually expires values.

> [!EXAMPLE]- C# running median with `PriorityQueue`
>
> ```csharp
> public sealed class RunningMedian
> {
>     private readonly PriorityQueue<int, long> lower = new(); // max-heap via negative priority
>     private readonly PriorityQueue<int, int> upper = new();  // min-heap
>
>     public void Add(int value)
>     {
>         if (lower.Count == 0 || value <= lower.Peek())
>             lower.Enqueue(value, -(long)value);
>         else
>             upper.Enqueue(value, value);
>
>         if (lower.Count > upper.Count + 1)
>         {
>             int moved = lower.Dequeue();
>             upper.Enqueue(moved, moved);
>         }
>         else if (upper.Count > lower.Count)
>         {
>             int moved = upper.Dequeue();
>             lower.Enqueue(moved, -(long)moved);
>         }
>     }
>
>     public double Median() => lower.Count switch
>     {
>         0 => throw new InvalidOperationException("No values have been added."),
>         _ when lower.Count > upper.Count => lower.Peek(),
>         _ => ((long)lower.Peek() + upper.Peek()) / 2.0
>     };
> }
> ```
>
> .NET's queue is a min-heap, so a `long` negative priority reverses only the lower heap. Widening before negation handles `int.MinValue`, and widening before the even-count sum prevents overflow.

# Questions

> [!QUESTION]- Why is the lower half a max-heap and the upper half a min-heap?
> The two roots must expose the values closest to the partition: the largest lower value and the smallest upper value. Those are exactly the one or two values needed for the median.

> [!QUESTION]- Why does rebalancing one root preserve the partition invariant?
> If one heap is too large, its root is the boundary value on that side. Moving the largest lower value upward or the smallest upper value downward cannot place any other retained value across the boundary incorrectly.

# References

- [`PriorityQueue<TElement, TPriority>`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — official .NET contract: an array-backed quaternary min-heap whose smallest priority is dequeued first.
- [Cormen, Leiserson, Rivest, and Stein, _Introduction to Algorithms_](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) — primary textbook treatment of heap invariants and logarithmic insertion/removal used by both halves.
