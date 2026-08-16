---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Breaks a problem into smaller independent instances, solves them recursively, and combines the answers."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

Sorting a million elements and multiplying two large integers can both be split into smaller instances, solved recursively, and assembled from the partial answers. Divide-and-conquer names that shape. Binary search follows only one side of the split, the close variant usually called decrease-and-conquer.

Subproblems are **independent** when each can be solved without another subproblem's result. They need not occupy separate storage: two calls may read the same immutable input or work on different regions of one array. The dependency graph matters here, not the memory layout. A state reached from multiple branches is an overlapping subproblem instead. [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|Dynamic programming]] caches those repeated states and reasons over the resulting dependency graph.

**Core shape:** divide into independent subproblems → recurse to a base case → combine their results.

~~~~~tabsdown
tab: Visualization


```steptrace
{ "algorithm": "divide-and-conquer" }
```


Each recursive node divides one problem into independent subproblems, reaches direct base cases, then carries partial answers upward for combination. [[Home/Computer Science/Algorithms/Sorting Algorithms/Merge Sort|Merge sort]] is one concrete use of that recursion-tree shape.


The paradigm is three steps and a stopping rule:

1. **Divide** — produce smaller instances. Their sizes may be equal, unequal, or input-dependent.
2. **Conquer** — solve each instance recursively until a base case or implementation cutoff is reached.
3. **Combine** — after the required sub-results are available, assemble the answer for the parent instance.

Which step carries the work varies. [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary search]] follows only one half, so it is often classified more specifically as decrease-and-conquer.

Logical independence permits parallel execution but does not make it automatic. Calls that share mutable data still need ownership rules or synchronization, the combine step must wait for every result it consumes, and task-scheduling overhead can exceed the work saved on small inputs. Whether a divide-and-conquer implementation is race-free or faster in parallel depends on its data access, synchronization, grain size, and runtime.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Divide and Conquer complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the array being sorted"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (compare every pair)",
          "formula": "O(n^2)",
          "curveId": "quadratic"
        },
        {
          "kind": "approach",
          "label": "Divide and conquer (merge sort)",
          "formula": "O(n log n)",
          "curveId": "n-log-n"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (compare every pair)",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "approach",
          "label": "Divide and conquer (merge sort)",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```

A common balanced special case creates a fixed number `a` of equal-size subproblems `n/b`, giving `T(n) = a·T(n/b) + f(n)`. The Master Theorem applies to that recurrence, not to divide-and-conquer universally. Unequal or input-dependent splits need a recursion-tree or substitution argument; fixed unequal fractions fit Akra–Bazzi, while randomized partitions need an expected recurrence.

The live stack follows the longest branch. Balanced shrinkage keeps it shallow; a chain of bad [[Home/Computer Science/Algorithms/Sorting Algorithms/Quick Sort|quicksort]] pivots can overflow the call stack. Merge-style combining may also require a separate output buffer.
~~~~~

# Boundaries and Implementation Costs

Overlapping subproblems are repeated states reached from more than one branch. In naive Fibonacci, both `fib(n-1)` and `fib(n-2)` reach `fib(n-3)`, so plain recursion solves the same state again. Memoisation helps because the state repeats, not because calls share storage. Merge sort's range states are unique. Caching them adds overhead without removing work.


A small-range cutoff addresses call overhead. Once a partition is tiny, another recursive split can cost more than a tight [[Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|insertion-sort]] loop. [[Home/Computer Science/Algorithms/Sorting Algorithms/Introsort|Introsort]] also tracks recursion depth and falls back to heapsort when quicksort exhausts that budget. These are separate controls: the cutoff speeds up small partitions, while the depth guard limits adversarial partition chains.

# Diagram and C# Implementation

> [!ABSTRACT]- Recursion structure
>
> ```mermaid
> flowchart TD
>   A[Problem of size n] --> B{Size below cutoff}
>   B -->|Yes| C[Solve base case directly]
>   B -->|No| D[Divide into smaller independent subproblems]
>   D --> E[Conquer each subproblem recursively]
>   E --> F[Synchronize required results]
>   F --> G[Combine sub-answers]
>   G --> H[Answer for size n]
> ```

> [!EXAMPLE]- Generic skeleton in C#
>
> ```csharp
> static TResult DivideAndConquer(Problem p)
> {
>     if (p.Size <= Cutoff)
>     {
>         return SolveDirectly(p);
>     }
>
>     var parts = Divide(p);
>     var answers = new TResult[parts.Length];
>     for (var i = 0; i < parts.Length; i++)
>     {
>         answers[i] = DivideAndConquer(parts[i]);
>     }
>
>     return Combine(answers);
> }
> ```
>
> The loop expresses logical independence only. Concurrent execution still needs race-free data access and a wait for every result consumed by `Combine`. It pays off only when each subproblem is large enough to cover scheduling and synchronization costs.

# References

- [Bentley, Haken, and Saxe, “A General Method for Solving Divide-and-Conquer Recurrences” (1980)](https://doi.org/10.1145/1008861.1008865)
- [Akra and Bazzi, “On the Solution of Linear Recurrence Equations” (1998)](https://doi.org/10.1023/A:1018373005182)
