---
topic: [Computer Science]
subtopic: [Algorithms]
summary: "A refined brute force that builds candidate solutions incrementally and prunes a partial candidate the moment it can't possibly succeed."
level: ["4"]
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "Computer Science"
qard-topic: "Algorithms/Paradigms/Backtracking"
flashcard_uid: "bbcb105b"
created: "2026-06-20T05:33:50.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

The eight-queens problem has 4,426,165,368 ways to place eight pieces on 64 squares, but only 92 valid arrangements. Generating every board before testing it wastes almost all the work on positions whose first few queens already conflict.

Backtracking avoids that waste by building one candidate a choice at a time and checking constraints as it goes. A queen is placed in one row. If it shares a column or diagonal with a queen above, no completion of the remaining rows can work, so the search drops the entire partial board. This depends on being able to test a prefix instead of waiting for a finished candidate. One queen in each of eight rows leaves `8^8` column choices when columns may repeat. Rejecting shared columns narrows the search to `8! = 40,320` permutations, and diagonal checks cut it further.

%% tabs %%

%% tab: Visualization %%

```steptrace
{"algorithm":"n-queens","n":4}
```

The decisive event is a rejection. When the queen in the current row has no safe column, the partial board cannot be extended, so the search abandons it and returns to the previous row to advance that queen to its next column — every board that would have grown beneath the failed placement is pruned unexamined. Starting the first queen in column 0 leads to exactly this dead end: each of its completions collides, the whole subtree under column 0 is exhausted, and the search retreats to row 0, lifts that queen, and only the column-1 start extends to the arrangement `(1, 3, 0, 2)`. Depth in the tree is the row index, so a rejection at row `k` discards every placement of rows `k+1…n` beneath it at once.

A candidate is a sequence of choices, one per level of a search tree. At each node the algorithm extends the partial candidate by one choice and tests the constraints its prefix can already decide:

- a still-feasible prefix recurses to choose at the next level;
- a prefix that violates a constraint is rejected, and the next sibling is tried;
- a feasible candidate that reaches a leaf is a complete solution by construction.

Rejecting a partial candidate at depth `k` eliminates every completion sharing that prefix without generating any of them. This is the whole difference from naive complete-candidate enumeration: the same tree of complete candidates exists, but the feasibility test keeps the search from descending into doomed regions. An earlier rejection cuts away a larger unfinished subtree.

When a node's children are all exhausted, the algorithm undoes its own choice, restoring the shared partial candidate to the state its parent expects, and returns to the next sibling. That undo is what prevents state from one failed branch leaking into the next sibling.

%% tab: Complexity %%

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

%% endtabs %%

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

<!-- qard-id: 919b1d09-824b-4832-afeb-7606885b2743 -->
> [!qard]- How does backtracking work, and how does it relate to brute-force search?
> Backtracking is a form of brute-force search that builds candidates one choice at a time. It abandons a partial candidate as soon as that candidate is known to be unsuitable.
>
> The search process:
>
> 1. Start with an empty partial candidate.
> 2. Choose one available option and add it to the partial candidate.
> 3. Recursively explore the remaining choices from that partial candidate.
> 4. If the candidate is complete and valid, record it. If a sound check proves the partial candidate cannot lead to a valid solution, it is a dead end and its exploration stops.
> 5. Return to the previous decision point, undo the choice and try the next option. When no options remain, return to the level above.
>
> For example, when placing queens row by row, a placement that already attacks another queen is abandoned without filling the remaining rows.
>
> | Approach | How it searches | Consequence |
> |---|---|---|
> | Naive complete-candidate enumeration | It generates every complete candidate and then checks each one. | Invalid candidates are fully built before they are rejected. |
> | Backtracking | It extends a partial candidate one choice at a time and can check it along the way. | Rejecting a partial candidate skips all of its continuations. |
>
> Pruning depends on having a check that can reject partial candidates. Without such a check, backtracking still visits every complete candidate. Even with pruning, the number of branches can grow exponentially in the worst case, so backtracking does not guarantee a fast search.
>
> [CS106B: Exhaustive Search and Recursive Backtracking (Stanford)](https://web.stanford.edu/class/archive/cs/cs106b/cs106b.1162/preview-backtracking.shtml)

<!-- qard-id: f504e1ef-08f1-4d76-8962-1123f3e2cee5 -->
> [!qard]- In backtracking with shared mutable state, why undo each choice before trying the next?
> Undoing restores the parent state, so each sibling choice starts from the same prefix instead of inheriting the previous branch's changes.
>
> **Pattern:** choose → explore (recurse) → un-choose.
>
> **Example:** permutations of A, B, C built in one shared list.
>
> 1. At the root the list is `[ ]`. Choose A, giving `[A]`.
> 2. Explore below A. The inner levels add and remove B and C, record `[A, B, C]` and `[A, C, B]`, and return with the list at `[A]`.
> 3. **With undo:** remove A, giving `[ ]`. Choose B, giving `[B]`. The B branch now explores permutations that start with B.
> 4. **Without undo:** A stays in the list. Choosing B gives `[A, B]`.
>
> The B branch should start from the root's empty prefix, but it starts from the A branch's leftover state. It therefore explores the wrong part of the search space. If A's 'used' flag also stays set, the search can record `[A, B, C]` again and never produce `[B, A, C]`. If only the list is wrong, it can record an invalid result such as `[A, B, A]`. Later sibling branches can inherit even more leftover state.
>
> Related changes, such as 'used' flags, must also be undone. A retained solution must be copied before later undo steps.
>
> **Alternative:** each branch can instead receive its own copied or immutable state. Then no explicit undo is needed. Copying state adds a per-branch cost; immutable representations may share structure.
>
> [CS106B: Exhaustive Search and Recursive Backtracking (Stanford)](https://web.stanford.edu/class/archive/cs/cs106b/cs106b.1162/preview-backtracking.shtml) · [.NET ImmutableStack implementation](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Collections.Immutable/src/System/Collections/Immutable/ImmutableStack_1.cs)

# References

- [Dancing Links](https://arxiv.org/abs/cs/0011047)
