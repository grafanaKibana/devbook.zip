---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "A refined brute force that builds candidate solutions incrementally and prunes a partial candidate the moment it can't possibly succeed."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

The eight-queens problem has 4,426,165,368 ways to place eight pieces on 64 squares, but only 92 valid arrangements. Generating every board before testing it wastes almost all the work on positions whose first few queens already conflict.

Backtracking avoids that waste by building one candidate a choice at a time and checking constraints as it goes. A queen is placed in one row. If it shares a column or diagonal with a queen above, no completion of the remaining rows can work, so the search drops the entire partial board. This depends on being able to test a prefix instead of waiting for a finished candidate. One queen in each of eight rows leaves `8^8` column choices when columns may repeat. Rejecting shared columns narrows the search to `8! = 40,320` permutations, and diagonal checks cut it further.


~~~~~tabsdown
tab: Visualization


```steptrace
{"algorithm":"n-queens","n":4}
```


The decisive event is a rejection. When the queen in the current row has no safe column, the partial board cannot be extended, so the search abandons it and returns to the previous row to advance that queen to its next column — every board that would have grown beneath the failed placement is pruned unexamined. Starting the first queen in column 0 leads to exactly this dead end: each of its completions collides, the whole subtree under column 0 is exhausted, and the search retreats to row 0, lifts that queen, and only the column-1 start extends to the arrangement `(1, 3, 0, 2)`. Depth in the tree is the row index, so a rejection at row `k` discards every placement of rows `k+1…n` beneath it at once.


A candidate is a sequence of choices, one per level of a search tree. At each node the algorithm extends the partial candidate by one choice and tests the constraints its prefix can already decide:

- a still-feasible prefix recurses to choose at the next level;
- a prefix that violates a constraint is rejected, and the next sibling is tried;
- a feasible candidate that reaches a leaf is a complete solution by construction.

Rejecting a partial candidate at depth `k` eliminates every completion sharing that prefix without generating any of them. This is the whole difference from brute force: the same tree of complete candidates exists, but the feasibility test keeps the search from descending into doomed regions. An earlier rejection cuts away a larger unfinished subtree.

When a node's children are all exhausted, the algorithm undoes its own choice, restoring the shared partial candidate to the state its parent expects, and returns to the next sibling. That undo is what prevents state from one failed branch leaking into the next sibling.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Backtracking complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "board size, one queen per row"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (enumerate every assignment)",
          "formula": "O(n^n)",
          "curveFrom": "factorial",
          "curveTo": "unbounded"
        },
        {
          "kind": "approach",
          "label": "Backtracking",
          "formula": "O(n!)",
          "curveId": "factorial"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (enumerate every assignment)",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Backtracking",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```
~~~~~

# When Pruning Stops Helping

The prefix test creates all of the savings. A late or incorrect test can erase that advantage or corrupt the result.

If every partial prefix looks feasible and the constraint can only be checked at the leaf, rejection never fires early. The search still generates and tests every complete configuration. Depth-first traversal alone saves no work.

The partial candidate is usually one shared mutable buffer. A choice left in place after its subtree is exhausted leaks into the next sibling, which may read a `used[]` flag or board square from an abandoned branch. The program keeps running, but its enumeration is now incomplete or wrong.

Appending the live buffer as a solution stores a reference that later choices overwrite. A leaf must copy the candidate instead. Repeated input elements cause a different problem: equal sibling choices generate identical subtrees unless duplicates are skipped at that level.

# Diagram and C# Implementation

> [!ABSTRACT]- Pruned search tree
>
> ```mermaid
> graph TD
>   R[root] --> A[place a]
>   R --> B[place b ✗ pruned]
>   A --> A1[a then c]
>   A --> A2[a then d ✗ pruned]
>   A1 --> S[solution]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static IList<IList<int>> Permutations(int[] nums)
> {
>     var results = new List<IList<int>>();
>     var current = new List<int>();
>     var used = new bool[nums.Length];
>
>     void Backtrack()
>     {
>         if (current.Count == nums.Length)
>         {
>             results.Add(new List<int>(current));   // snapshot the complete candidate
>             return;
>         }
>
>         for (var i = 0; i < nums.Length; i++)
>         {
>             if (used[i]) continue;                 // prefix constraint: each element once
>             used[i] = true; current.Add(nums[i]);  // choose
>             Backtrack();                           // recurse on the extended prefix
>             used[i] = false; current.RemoveAt(current.Count - 1); // undo
>         }
>     }
>
>     Backtrack();
>     return results;
> }
> ```
> The `used[i]` guard is the prefix test. N-queens replaces it with an `IsSafe(row, col)` check over occupied columns and diagonals. The `used[i] = false` line restores the parent state before the next sibling runs.

# Questions

> [!QUESTION]- What turns brute-force enumeration into backtracking?
> A feasibility test on the partial candidate. Brute force waits until a configuration is complete. Backtracking checks after each choice and discards every completion that shares a rejected prefix.

# References

- [Dancing Links](https://arxiv.org/abs/cs/0011047)
