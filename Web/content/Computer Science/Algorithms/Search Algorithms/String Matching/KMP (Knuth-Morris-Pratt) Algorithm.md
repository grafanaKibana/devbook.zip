---
publish: true
created: 2026-08-20T20:41:15.537Z
modified: 2026-08-20T20:41:15.537Z
published: 2026-08-20T20:41:15.537Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Searches for a pattern without rescanning text by using a precomputed prefix (LPS) array.
level:
  - "4"
priority: Medium
status: Done
---

Naive string search restarts the pattern one position later after a mismatch, even when the matched prefix already reveals how far the pattern can move. KMP preprocesses that self-overlap into a prefix, or failure, table.

During the search, a mismatch lowers only the matched pattern length. The text index never retreats. The table identifies the longest prefix that already matches the consumed text's suffix. That invariant gives KMP a linear scan and lets it operate on a stream that cannot be rewound.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"kmp","text":"ABABCABAB","pattern":"ABAB"}
```



The trace searches for the pattern `ABAB` in the text `ABABCABAB`.

The first four characters match, so `j` reaches `4 = m` and a match is reported at index 0. Instead of restarting, `j` resets to `π[3] = 2`: the trailing `AB` of the region just matched is itself a prefix of the pattern, so those two characters already count as matched and the pattern strip slides right by two while the text pointer holds at index 4. There `C` fails against `pattern[2] = A`; `j` falls to `π[1] = 0`, so the same `C` may be compared again at index 4 against the shorter-prefix position before the text pointer advances. The pointer never retreats, and the scan re-enters the pattern at `A` to find the second match at index 5.



The failure table `π` (also called the LPS array — longest proper prefix that is also a suffix) has one entry per pattern position. `π[j]` is the length of the longest proper prefix of `pattern[0..j]` that also occurs as a suffix of that same span. For `ABABC` the table is `[0, 0, 1, 2, 0]`: `ABAB` ends in `AB`, which is also its prefix, so `π[3] = 2`.

The search keeps a text index `i` and a match length `j` (equivalently, the current pattern position). On a match, both advance. On a mismatch with `j > 0`, `j` drops to `π[j - 1]` and the comparison retries without touching `i`; the already-matched prefix of length `π[j-1]` is guaranteed to align, because it is at once a prefix and a suffix of what was just matched. On a mismatch with `j == 0`, there is nothing to fall back to, so `i` advances. The text index therefore moves in one direction only.

The text index `i` never moves backward. On a mismatch, only `j` retreats through previously computed prefix lengths, preserving the text already consumed.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "KMP (Knuth-Morris-Pratt) Algorithm complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "length of the searched text"
    },
    "secondarySize": {
      "symbol": "m",
      "description": "length of the pattern"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Build failure table π",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Total",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + m)",
              "curveId": "linear"
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
          "operation": "Build failure table π",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "Θ(m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1) beyond π",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Total",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "Θ(m)",
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

# Where the Guarantee Earns Its Keep

KMP's bound matters most on repetitive input. For `aⁿ` searched with `aᵐ⁻¹b`, the failure table is `[0, 1, 2, …, m-2, 0]`. The trailing `b` has no matching prefix. For `m = 5`, `aaaab` produces `[0,1,2,3,0]`. On random text with a short, low-overlap pattern, naive search may win on constants and code size because both methods inspect nearly the same characters.

The classic implementation bug lives in the failure table. On a mismatch during construction, the length pointer must fall back through `failure[k - 1]`, not reset to `0`. Resetting corrupts self-overlapping entries: `AABAAAB` becomes `[0,1,0,1,2,1,0]` instead of `[0,1,0,1,2,2,3]`, and later searches can miss matches that depend on the longer overlap.

KMP compares left to right and does not skip untouched text regions. [[Computer Science/Algorithms/Search Algorithms/String Matching/Boyer-Moore|Boyer-Moore]] instead scans the pattern right to left and uses a bad-character table to jump over alignments that cannot match, so a wider alphabet makes each mismatch more informative.

# Diagram and C# Implementation

> [!ABSTRACT]- Search control flow
>
> ```mermaid
> flowchart TD
>   A[Build failure table for the pattern] --> B[Set text index i and match length j to 0]
>   B --> C{i less than length of text}
>   C -->|No| Z[Search complete]
>   C -->|Yes| D{text at i equals pattern at j}
>   D -->|No, j greater than 0| E[Set j to failure at j minus 1]
>   E --> D
>   D -->|No, j equals 0| F[Advance i]
>   D -->|Yes| G[Advance i and j]
>   G --> H{j equals length of pattern}
>   H -->|No| C
>   H -->|Yes| I[Report match at i minus j, then set j to failure at j minus 1]
>   F --> C
>   I --> C
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static IEnumerable<int> FindAll(string text, string pattern)
> {
>     ArgumentException.ThrowIfNullOrEmpty(pattern);
>     var failure = BuildFailure(pattern);
>     var j = 0; // characters of the pattern currently matched
>
>     for (var i = 0; i < text.Length; i++)
>     {
>         while (j > 0 && text[i] != pattern[j])
>         {
>             j = failure[j - 1];
>         }
>
>         if (text[i] == pattern[j])
>         {
>             j++;
>         }
>
>         if (j == pattern.Length)
>         {
>             yield return i - j + 1;
>             j = failure[j - 1];
>         }
>     }
> }
>
> private static int[] BuildFailure(string pattern)
> {
>     var failure = new int[pattern.Length];
>     var k = 0; // length of the longest prefix-suffix seen so far
>
>     for (var i = 1; i < pattern.Length; i++)
>     {
>         while (k > 0 && pattern[i] != pattern[k])
>         {
>             k = failure[k - 1];
>         }
>
>         if (pattern[i] == pattern[k])
>         {
>             k++;
>         }
>
>         failure[i] = k;
>     }
>
>     return failure;
> }
> ```
>
> The method rejects an empty pattern before building the failure table because the search loop indexes `pattern[j]`. Callers must provide at least one character. Both loops then share the same fallback shape: the inner `while` retreats through `failure` rather than resetting to `0`. That preserves reusable overlap and keeps the table correct.

# References

- [Knuth, Morris, Pratt, "Fast Pattern Matching in Strings" (1977)](https://doi.org/10.1137/0206024)
- [Prefix function and KMP (cp-algorithms)](https://cp-algorithms.com/string/prefix-function.html)
