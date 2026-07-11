---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Done
publish: true
---

# Intro

A monitoring process scans a byte stream — logs, packets, a large file — for a fixed pattern of length `m` inside text of length `n`. The naive method aligns the pattern at each start position and, on a mismatch after matching several characters, discards that progress and restarts one position over. On text like `aaaaaaaa…` with pattern `aaaab`, nearly every start position matches `m − 1` characters before failing, so the same characters are examined again and again — `O(n·m)` comparisons.

The wasted work has structure. The characters already matched are a prefix of the pattern, and that prefix's own internal repetition fixes how far the pattern can safely slide. KMP computes that self-overlap once, before the scan. On a mismatch after `k` matched characters, it consults the overlap and resumes the pattern where its longest matched prefix-that-is-also-a-suffix already lines up against the text — the text pointer stays put. Each text character is then read at most twice across the whole search.

**Core condition:** pattern fixed in advance → a failure table encodes the pattern's self-overlap → each mismatch slides the pattern without rewinding the text → `Θ(n + m)` time, `Θ(m)` space.

## One scan

The trace searches for the pattern `ABAB` in the text `ABABCABAB`.

```steptrace
{"algorithm":"kmp","text":"ABABCABAB","pattern":"ABAB"}
```

The first four characters match, so `j` reaches `4 = m` and a match is reported at index 0. Instead of restarting, `j` resets to `π[3] = 2`: the trailing `AB` of the region just matched is itself a prefix of the pattern, so those two characters already count as matched and the pattern strip slides right by two while the text pointer holds at index 4. There `C` fails against `pattern[2] = A`; `j` falls to `π[1] = 0`, the text pointer finally advances, and the scan re-enters the pattern at `A` to find the second match at index 5. At no point does the text pointer retreat to re-read `C` or the earlier `AB`.

## Why the text never rewinds

The failure table `π` (also called the LPS array — longest proper prefix that is also a suffix) has one entry per pattern position. `π[j]` is the length of the longest proper prefix of `pattern[0..j]` that also occurs as a suffix of that same span. For `ABABC` the table is `[0, 0, 1, 2, 0]`: `ABAB` ends in `AB`, which is also its prefix, so `π[3] = 2`.

The search keeps a text index `i` and a match length `j` (equivalently, the current pattern position). On a match, both advance. On a mismatch with `j > 0`, `j` drops to `π[j - 1]` and the comparison retries without touching `i`; the already-matched prefix of length `π[j-1]` is guaranteed to align, because it is at once a prefix and a suffix of what was just matched. On a mismatch with `j == 0`, there is nothing to fall back to, so `i` advances. The text index therefore moves in one direction only.

That monotonic `i` is the entire bound. `j` rises by at most one each time `i` advances, and `j ≥ 0`, so the fallbacks can remove at most as much as was added: across the scan `j` decreases at most `n` times in total. Every comparison either advances `i` or decreases `j`, so there are at most `2n` character comparisons regardless of how the pattern overlaps itself.

## Complexity

| Phase | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Build failure table `π` | `Θ(m)` | `Θ(m)` | Each pattern index is assigned once; the builder's fallback pointer only retreats through values it already produced. |
| Search | `Θ(n)` | `O(1)` beyond `π` | `i` advances monotonically; each character is compared at most twice before `i` passes it. |
| Total | `Θ(n + m)` | `Θ(m)` | One preprocessing pass over the pattern, then one non-backtracking pass over the text. |

The bound holds identically in the best, average, and worst case — determinism is the point. Naive search shares the `O(1)`-space profile but has no such ceiling: on `text = aⁿ`, `pattern = aᵐ⁻¹b`, every one of the `n − m + 1` start positions matches `m − 1` characters before failing on the final `b`, so it performs `Θ(n·m)` comparisons. KMP reads that same run once.

## Where the guarantee earns its keep

The repetitive input that breaks naive search is exactly where KMP's ceiling matters. On `aⁿ` against `aᵐ⁻¹b` the failure table is `[0, 1, 2, …, m-2, 0]` — the trailing `b` has no matching prefix, so the last entry drops back to `0` (for `m = 5`, `aaaab` → `[0,1,2,3,0]`). Matching stalls at length `m − 1`, the `b` fails, and `j` falls back one position to `π[m-2] = m-2`, so the scan still finishes in `Θ(n + m)`. This is a correctness-of-cost property, not a speedup on friendly text: on random text with a short, low-overlap pattern, naive search and KMP examine nearly the same number of characters, and naive wins on constants and code size.

The classic implementation bug lives in the failure table. On a mismatch while building it, the length pointer must fall back through `failure[k - 1]`, not reset to `0`. Resetting to zero corrupts every entry where the prefix overlaps itself: `AABAAAB` then builds as `[0,1,0,1,2,1,0]` instead of `[0,1,0,1,2,2,3]`, and the search silently misses matches that depend on the longer overlap. A quick comparison against known outputs surfaces this class of bug.

KMP gains nothing from a large alphabet. It compares left to right and, in the worst case, inspects essentially every text character. Skip-based methods exploit alphabet size instead: [[Boyer-Moore]] scans the pattern right to left and, on a mismatch, uses a bad-character table to jump ahead by up to `m` positions, so a wider alphabet makes each mismatch more informative and the average scan sublinear. KMP's edge is a guarantee, not throughput on wide alphabets.

## Reference drawer

> [!ABSTRACT]- Search control flow
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
> ```csharp
> public static IEnumerable<int> FindAll(string text, string pattern)
> {
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
> Both loops share the same fallback shape: the inner `while` retreats through `failure` rather than resetting to `0`. That is what keeps the total work linear and the table correct.

## Comparison

| Algorithm | Time | Space / preprocessing | Stronger case | Weaker case | Semantic property |
| --- | --- | --- | --- | --- | --- |
| Naive search | `O(n·m)` worst, `O(n)` on low overlap | `O(1)`, none | Short patterns, low self-overlap, tiny inputs | Repetitive text and pattern | Deterministic; re-reads text after each mismatch |
| KMP | `Θ(n + m)` | `Θ(m)` failure table | Adversarial or streaming input needing a hard bound | Large alphabets where skipping would help | Deterministic; text pointer never rewinds; no hashing |
| [[Rabin Karp Search]] | `O(n + m)` expected, `O(n·m)` worst | `O(1)` rolling hash | Many patterns matched in one pass via a hash set | Hash collisions or adversarial input | Probabilistic; compares hashes, verifies on a hit |
| [[Boyer-Moore]] | Sublinear average on large alphabets, `O(n·m)` worst | `O(m + |Σ|)` skip tables | Long patterns over large alphabets | Small alphabets, short patterns | Scans right-to-left; skips via bad-character and good-suffix rules |
| [[Z-Algorithm]] | `Θ(n + m)` | `Θ(n + m)` Z-array | Same linear bound; adapts to other string problems | Builds a Z-array over the concatenation | Deterministic; equivalent linear-time construction to KMP |

KMP is the deterministic `O(n + m)` single-pattern guarantee with no hashing and no text rewinding; its value is a hard worst-case ceiling on adversarial or streaming input rather than raw speed on ordinary text. Boyer-Moore is usually faster in practice on large alphabets, because a mismatch lets it skip ahead instead of reading every character. Rabin-Karp becomes stronger when many patterns are searched at once, since one rolling hash checks a whole set per position. The [[Z-Algorithm]] reaches the same linear bound through the Z-array and is often the easier starting point for problems beyond plain matching, such as counting distinct substrings. For matching many fixed patterns simultaneously, [[Aho-Corasick]] replaces per-pattern scans with a single automaton.

## Questions

> [!QUESTION]- Why does the text index never move backward, and what does that buy?
> On a mismatch the algorithm only lowers the match length `j` via `π[j-1]`; it never decrements the text index `i`. Because `j` can fall back at most as much as it climbed, total comparisons stay at `2n`, giving the `Θ(n + m)` bound. A monotonic text pointer also lets the search run over a stream that cannot be rewound.

> [!QUESTION]- What does `π[j]` encode, and how is it used on a mismatch?
> `π[j]` is the length of the longest proper prefix of `pattern[0..j]` that is also a suffix of it. On a mismatch after matching `j` characters, `j` resets to `π[j-1]`, which realigns that shared prefix/suffix against the text so no already-matched characters are re-read.

> [!QUESTION]- On what input does KMP's guarantee actually pay off, and where does it gain nothing?
> It pays off on repetitive input such as `text = aⁿ`, `pattern = aᵐ⁻¹b`, where naive search degrades to `Θ(n·m)` while KMP stays `Θ(n + m)`. It gains nothing on large alphabets: unlike Boyer-Moore it reads essentially every character and cannot skip.

> [!QUESTION]- What is the standard bug when building the failure table?
> Resetting the length pointer to `0` on a mismatch instead of falling back through `failure[k-1]`. That corrupts entries where the prefix overlaps itself — `AABAAAB` builds as `[0,1,0,1,2,1,0]` rather than `[0,1,0,1,2,2,3]` — and the search then misses matches that depend on the longer overlap.

## References

- [Knuth, Morris, Pratt — "Fast Pattern Matching in Strings" (SIAM J. Comput. 6(2), 1977)](https://doi.org/10.1137/0206024) — the original algorithm, the failure-function construction, and the linear-time proof.
- [Prefix function and KMP (cp-algorithms)](https://cp-algorithms.com/string/prefix-function.html) — failure-table construction, the fallback loop, and the amortized argument, with applications to related string problems.
- [Knuth–Morris–Pratt algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Knuth%E2%80%93Morris%E2%80%93Pratt_algorithm) — worked failure-table examples and the formal correctness argument.
