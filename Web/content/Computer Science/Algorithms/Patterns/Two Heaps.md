---
publish: true
created: 2026-08-20T20:41:15.532Z
modified: 2026-08-20T20:41:15.532Z
published: 2026-08-20T20:41:15.532Z
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

Two heaps maintain an ordered partition as values arrive. A max-heap named `lower` stores the lower half. A min-heap named `upper` stores the upper half. Their roots expose the two values beside the partition, which makes the current median available without sorting the accumulated stream.

Two invariants make the result correct:

1. Every value in `lower` is less than or equal to every value in `upper`.
2. `lower.Count` equals `upper.Count` or exceeds it by one.

A value no greater than `lower.Peek()` enters `lower`. Anything larger enters `upper`. If the size rule breaks, moving one boundary root restores it. An odd number of values leaves the median at `lower.Peek()`. With an even count, the two roots are averaged.

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

The pattern fits running medians and other streaming problems that need both sides of an ordered boundary. It differs from [[Computer Science/Algorithms/Patterns/Top-K Elements|Top-K Elements]]: Top-K discards values outside its `k` survivors, while Two Heaps retains everything because either half may affect a later median.

Arbitrary deletion changes the mechanism. A sliding-window median must remove expired values, but the basic heap API has to scan its backing collection to locate one. Indexed heaps or lazy-deletion maps can add that removal path. They are extra machinery and only earn their place when values actually expire.

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

# References

- [`PriorityQueue<TElement, TPriority>`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2)
