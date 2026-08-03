---
publish: true
created: 2026-08-03T15:21:47.250Z
modified: 2026-08-03T15:52:21.761Z
published: 2026-08-03T15:52:21.761Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: A refined brute force that builds candidate solutions incrementally and prunes a partial candidate the moment it can't possibly succeed.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

Placing eight queens on a chessboard so that none attacks another has 4,426,165,368 ways to drop eight pieces onto 64 squares, and only 92 of them are solutions. Generating every arrangement and then testing it spends almost all of its work on boards that a single early queen already invalidated.

Backtracking removes that waste by building a candidate one choice at a time and checking it against the constraints after each choice. A queen is committed to a row; if it shares a column or diagonal with a queen placed above, no completion of the remaining rows can succeed, so every board extending that partial placement is discarded without being generated. The reduction rests on one property: the constraint must be testable on a partial candidate — a prefix — not only on a finished one. Placing one queen in each of eight rows leaves `8^8` column choices when columns may repeat; rejecting shared columns narrows that to `8! = 40,320` permutations, and diagonal checks prune it further.

````tabsdown
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
          "kind": "text",
          "label": "Naive (enumerate every assignment)",
          "formula": "O(n^n)"
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
````

# When Pruning Stops Helping

The advantage lives entirely in the prefix test, and three mechanism details decide whether it materializes.

If the constraint can only be evaluated on a finished candidate — every partial prefix looks feasible — rejection never fires before completion, so the search degenerates to generating and testing every complete configuration. The depth-first structure adds nothing without an early feasibility signal.

The partial candidate is one shared mutable buffer, so a choice that is not undone after its subtree is exhausted leaks into later branches. A sibling then reads a `used[]` flag or board square that still reflects an abandoned placement and either skips valid candidates or accepts impossible ones. Nothing raises an error; the enumeration is silently incomplete or wrong.

Recording a solution by appending the live buffer stores a reference that subsequent choices overwrite, leaving the result full of identical copies of the final buffer state — a leaf must snapshot (copy) the candidate. With repeated input elements, equal sibling choices generate identical subtrees, so the same solution appears more than once unless equal siblings at a level are skipped.

# Reference Drawer

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
>
> The `used[i]` guard is the prefix feasibility test; a constraint problem such as n-queens replaces it with an `IsSafe(row, col)` check that reads the columns and diagonals already occupied. The `used[i] = false` line is the undo that keeps sibling branches independent.

# Questions

> [!QUESTION]- What turns brute-force enumeration into backtracking?
> A feasibility test applied to a partial candidate. Brute force builds every complete configuration and tests it at the end; backtracking tests the prefix after each choice and, on a violation, discards every configuration sharing that prefix without generating them.

> [!QUESTION]- Why must a choice be undone after its subtree is explored?
> The partial candidate is a single mutable buffer shared by all branches to avoid copying. After a subtree is exhausted the choice is reverted so the next sibling starts from the state its parent established. An un-reverted choice leaks into siblings and silently corrupts the enumeration.

# References

- [Backtracking](https://en.wikipedia.org/wiki/Backtracking) — formal definition of the method as a depth-first walk of a candidate tree with a partial-candidate rejection test.
- [Dancing Links](https://arxiv.org/abs/cs/0011047) — Donald Knuth's technique for efficient backtracking over exact-cover problems (n-queens, Sudoku), with undo of each choice.
- [Introduction to backtracking](https://usaco.guide/silver/intro-backtracking) — categorized constraint problems and the pruning patterns that keep the search tree small.
