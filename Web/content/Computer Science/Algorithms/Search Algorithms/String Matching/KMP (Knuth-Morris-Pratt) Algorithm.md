---
publish: true
created: 2026-07-18T14:02:43.998Z
modified: 2026-08-08T07:48:03.031Z
published: 2026-08-08T07:48:03.031Z
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

A monitoring process scans a byte stream — logs, packets, a large file — for a fixed pattern of length `m` inside text of length `n`. The naive method aligns the pattern at each start position and, on a mismatch after matching several characters, discards that progress and restarts one position over.

The wasted work has structure. The characters already matched are a prefix of the pattern, and that prefix's own internal repetition fixes how far the pattern can safely slide. KMP computes that self-overlap once, before the scan. On a mismatch after `k` matched characters, it consults the overlap and resumes the pattern where its longest matched prefix-that-is-also-a-suffix already lines up against the text — the text pointer stays put.

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

The repetitive input that breaks naive search is exactly where KMP's ceiling matters. On `aⁿ` against `aᵐ⁻¹b` the failure table is `[0, 1, 2, …, m-2, 0]` — the trailing `b` has no matching prefix, so the last entry drops back to `0` (for `m = 5`, `aaaab` → `[0,1,2,3,0]`). This is a correctness-of-cost property, not a speedup on friendly text: on random text with a short, low-overlap pattern, naive search and KMP examine nearly the same number of characters, and naive wins on constants and code size.

The classic implementation bug lives in the failure table. On a mismatch while building it, the length pointer must fall back through `failure[k - 1]`, not reset to `0`. Resetting to zero corrupts every entry where the prefix overlaps itself: `AABAAAB` then builds as `[0,1,0,1,2,1,0]` instead of `[0,1,0,1,2,2,3]`, and the search silently misses matches that depend on the longer overlap. A quick comparison against known outputs surfaces this class of bug.

KMP compares left to right and does not skip untouched text regions. [[Computer Science/Algorithms/Search Algorithms/String Matching/Boyer-Moore|Boyer-Moore]] instead scans the pattern right to left and uses a bad-character table to jump over alignments that cannot match, so a wider alphabet makes each mismatch more informative.

# Reference Drawer

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
> The method rejects an empty pattern before building the failure table because the search loop indexes `pattern[j]`; callers must provide at least one character. Both loops then share the same fallback shape: the inner `while` retreats through `failure` rather than resetting to `0`. That preserves reusable overlap and keeps the table correct.

# Questions

> [!QUESTION]- Why does the text index never move backward, and what does that buy?
> On a mismatch the algorithm only lowers the match length `j` via `π[j-1]`; it never decrements the text index `i`. A monotonic text pointer also lets the search run over a stream that cannot be rewound.

> [!QUESTION]- What does `π[j]` encode, and how is it used on a mismatch?
> `π[j]` is the length of the longest proper prefix of `pattern[0..j]` that is also a suffix of it. On a mismatch after matching `j` characters, `j` resets to `π[j-1]`, which realigns that shared prefix/suffix against the text so no already-matched characters are re-read.

> [!QUESTION]- On what input does KMP reuse the most overlap, and what can it not skip?
> Repetitive text and patterns repeatedly fall back to a shorter valid prefix instead of restarting the match. On large alphabets it gains little from that reuse: unlike Boyer-Moore it still reads essentially every character and cannot jump over untouched regions.

> [!QUESTION]- What is the standard bug when building the failure table?
> Resetting the length pointer to `0` on a mismatch instead of falling back through `failure[k-1]`. That corrupts entries where the prefix overlaps itself — `AABAAAB` builds as `[0,1,0,1,2,1,0]` rather than `[0,1,0,1,2,2,3]` — and the search then misses matches that depend on the longer overlap.

# References

- [Knuth, Morris, Pratt, "Fast Pattern Matching in Strings" (1977)](https://doi.org/10.1137/0206024) — the original algorithm and failure-function construction.
- [Prefix function and KMP (cp-algorithms)](https://cp-algorithms.com/string/prefix-function.html)
- [Knuth–Morris–Pratt algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Knuth%E2%80%93Morris%E2%80%93Pratt_algorithm) — worked failure-table examples and the formal correctness argument.
