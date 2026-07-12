---
publish: true
created: 2026-07-12T14:27:20.410Z
modified: 2026-07-12T14:27:20.410Z
published: 2026-07-12T14:27:20.410Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Matches a pattern by comparing right-to-left and skipping ahead via bad-character and good-suffix rules, sublinear in practice.
level:
  - "4"
priority: Medium
status: Creation
---

# Intro

Scanning a megabyte of source code for the literal `getUserById` means asking, at each of a million positions, whether the pattern starts there. The naive check compares left-to-right at every alignment, so a near-match that only fails on its final character still costs a comparison per position — `O(n·m)` in the worst case, and it never skips a byte it has not already read.

Boyer-Moore reverses the comparison direction. It aligns the pattern under the text and compares from the pattern's _last_ character backward. A mismatch there yields two facts: the offending text character, and how much of the pattern's tail already matched. That is enough to prove that a run of the following alignments cannot match, so the pattern jumps forward past them — and those positions are never read. On English text or source code the jump is frequently the full pattern length, so the scan touches only a fraction of the input.

The jump distance comes from two precomputed tables, and every shift is sound only because scanning right-to-left turned one mismatch into a statement about a whole block of text.

**Core condition:** large alphabet, right-to-left comparison → one mismatch skips a block unexamined → roughly `n/m` characters read, tables in `O(m + |Σ|)` space.

A visualization would align the pattern under the text and step through the right-to-left comparisons and rule-driven jumps.

> [!NOTE] Visualization pending
> Planned StepTrace: a string-matching card aligning the pattern under the text, comparing right-to-left, and jumping the pattern forward by the maximum of the bad-character and good-suffix shift on a mismatch. No matching renderer exists in `engine.js` yet.

## Why a mismatch skips a block

Each alignment fixes the pattern's last character over some text index and compares leftward until a character disagrees (or the whole pattern matches). Two independent rules each propose a shift; the algorithm advances by the larger.

**Bad-character rule.** Take the text character `c` that caused the mismatch. Shift the pattern so its _rightmost_ occurrence of `c` lands under that text position. If `c` occurs nowhere in the pattern, the entire pattern moves past `c` — a jump of `m`. This is the source of the large-alphabet speedup: the more distinct symbols exist, the more often the mismatching character is simply absent from a short pattern, and the larger the average skip.

**Good-suffix rule.** When a suffix of the pattern matched before the mismatch, shift so that another occurrence of that suffix inside the pattern lines up; if none exists, align a prefix of the pattern with a suffix of the matched region. This reuses the partial-match information the bad-character rule discards.

The shift is `max(bad_char_shift, good_suffix_shift)`, which is always at least one, so the search never stalls. Correctness rests on a negative argument: any smaller shift would either drop a known-mismatching character back over the text or misalign a suffix already proven to match, so every alignment skipped over provably cannot produce a match — even though its characters were never compared. That clause is the whole mechanism. Left-to-right scanning learns nothing about the characters ahead, so it can never justify a jump larger than one on the same evidence.

Preprocessing builds both tables ahead of the scan. The bad-character table is keyed on each character's last position `i` in the pattern, but the implementation stores the resulting shift `m − 1 − i` directly rather than the raw index (`|Σ|` entries). The good-suffix table maps each mismatch position to a safe suffix-preserving shift; its construction is `Θ(m)` but the index arithmetic is delicate.

### One alignment

Searching `TRUTH` (`m = 5`) inside `...WE VALUE TRUTH...`, where each character's last position in the pattern is `T→3, R→1, U→2, H→4`:

```text
Text:    W E   V A L U E   T R U T H
Pattern: T R U T H
         compare right-to-left, starting at P[4]='H' over text 'L'

P[4]='H' vs 'L': mismatch. 'L' is absent from the pattern, so the
bad-character rule shifts the whole pattern past it — a jump of 5.
The four characters left of 'L' were never inspected.

Next alignment lands 'H' over the text's real 'H'; all five characters
match right-to-left, and a hit is reported.
```

Over English text most mismatching characters are absent from a short pattern, so each mismatch buys a near-maximal jump.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Preprocessing | `Θ(m + \|Σ\|)` | `Θ(m + \|Σ\|)` | Build the bad-character table over the alphabet and the good-suffix table over the pattern. |
| Best / sublinear | `O(n/m)` | `O(m + \|Σ\|)` | Large alphabet, long pattern: each alignment mismatches on its last character and that character is absent from the pattern, so every probe jumps a full `m` and most text is never read. |
| Worst, plain | `O(n·m)` | `O(m + \|Σ\|)` | An all-equal pattern `A^m` in text `A^n`, where every alignment matches all `m` characters right-to-left (a full match) and the good-suffix rule shifts by only one, so ~`n` alignments each cost `O(m)`. |
| Worst, Galil rule | `O(n)` | `O(m + \|Σ\|)` | Remembering how much of the pattern is already known to match after a shift skips those re-comparisons, bounding total character comparisons linearly. |

The tables persist through the scan, so search space stays `O(m + |Σ|)`; the loop itself keeps only a few indices beyond them. The plain-versus-Galil split matters: the sublinear `O(n/m)` is a property of large-alphabet inputs, not a guarantee. Without Galil's rule an adversarial input degrades to `O(n·m)`, and the guaranteed-linear bound requires the extra bookkeeping.

## Where the skip disappears

On small alphabets the advantage evaporates. With `|Σ|` of 2 to 4 — binary, or DNA over `{A,C,G,T}` — the mismatching character is almost always present in the pattern, so the bad-character shift is usually one. Searching `AAAA` inside a long run of `A` lands in the `O(n·m)` worst case: every alignment is a full match over all `m` characters and the good-suffix rule then shifts by only one, so ~`n` alignments each cost `O(m)`. The shift buys nothing because there is no absent character to jump past. Boyer-Moore's edge grows with alphabet size, so DNA and binary streams are exactly where it stops helping.

The good-suffix table is the part that breaks silently. Its "case 2" prefix fallback is easy to compute off by one, and a wrong entry produces either a missed match or a shift of zero that loops forever. Because the marginal speedup over the bad-character rule alone is small on real text, most production code ships **Boyer-Moore-Horspool** — bad-character rule only, keyed on the text character sitting under the pattern's last position — which drops the fragile table entirely and is nearly as fast on large-alphabet data. GNU `grep`'s fixed-string search and most editor find commands use this variant rather than the full two-rule algorithm; `glibc`'s `memmem` takes a different route entirely, using the Two-Way (Crochemore–Perrin) algorithm.

## Reference drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[Align pattern at text position i] --> B[Set j to m minus 1]
>   B --> C{pattern at j equals text at i plus j}
>   C -->|Yes| D{j equals 0}
>   D -->|Yes| E[Report match at i]
>   D -->|No| F[Decrement j]
>   F --> C
>   C -->|No| G[Compute bad-character shift]
>   G --> H[Compute good-suffix shift]
>   H --> I[Advance i by the larger shift]
>   E --> I
>   I --> J{i within text bounds}
>   J -->|Yes| B
>   J -->|No| K[Done]
> ```

> [!EXAMPLE]- C# implementation (full Boyer-Moore)
>
> ```csharp
> public static IEnumerable<int> Search(string text, string pattern)
> {
>     int n = text.Length, m = pattern.Length;
>     if (m == 0 || m > n) yield break;
>
>     int[] badChar = BuildBadCharTable(pattern);
>     int[] goodSuffix = BuildGoodSuffixTable(pattern);
>
>     int shift = 0;
>     while (shift <= n - m)
>     {
>         int j = m - 1;
>         while (j >= 0 && pattern[j] == text[shift + j]) j--;
>
>         if (j < 0)
>         {
>             yield return shift;
>             shift += goodSuffix[0];              // good-suffix shift after a full match
>         }
>         else
>         {
>             int bc = badChar[text[shift + j]] - m + 1 + j;
>             shift += Math.Max(goodSuffix[j], bc); // never <= 0 because goodSuffix >= 1
>         }
>     }
> }
>
> private static int[] BuildBadCharTable(string pattern)
> {
>     int m = pattern.Length;
>     var table = new int[256];
>     for (int c = 0; c < 256; c++) table[c] = m;      // absent char -> full jump
>     for (int i = 0; i < m - 1; i++) table[pattern[i]] = m - 1 - i;
>     return table;
> }
>
> private static int[] BuildGoodSuffixTable(string pattern)
> {
>     int m = pattern.Length;
>     int[] suffix = ComputeSuffixes(pattern);
>     var table = new int[m];
>     for (int i = 0; i < m; i++) table[i] = m;
>
>     int j = 0;
>     for (int i = m - 1; i >= 0; i--)
>         if (suffix[i] == i + 1)                       // case 2: a prefix is also a suffix
>             for (; j < m - 1 - i; j++)
>                 if (table[j] == m) table[j] = m - 1 - i;
>
>     for (int i = 0; i <= m - 2; i++)                  // case 1: reoccurring good suffix
>         table[m - 1 - suffix[i]] = m - 1 - i;
>
>     return table;
> }
>
> private static int[] ComputeSuffixes(string pattern)
> {
>     int m = pattern.Length;
>     var suffix = new int[m];
>     suffix[m - 1] = m;
>     int g = m - 1, f = 0;
>     for (int i = m - 2; i >= 0; i--)
>     {
>         if (i > g && suffix[i + m - 1 - f] < i - g)
>             suffix[i] = suffix[i + m - 1 - f];
>         else
>         {
>             if (i < g) g = i;
>             f = i;
>             while (g >= 0 && pattern[g] == pattern[g + m - 1 - f]) g--;
>             suffix[i] = f - g;
>         }
>     }
>     return suffix;
> }
> ```
>
> The `badChar` table assumes byte-range characters; Unicode text needs a `Dictionary<char,int>` (default `m`) instead of `int[256]`. Dropping `BuildGoodSuffixTable` and shifting by the bad-character rule alone yields Boyer-Moore-Horspool.

## Questions

> [!QUESTION]- Why does comparing right-to-left let Boyer-Moore skip characters it never reads?
> A mismatch at the pattern's last position exposes a text character together with its offset. If that character is absent from the pattern, no alignment that places any pattern character over it can match, so the pattern jumps clear past it — up to `m` positions — without comparing the characters in between. Left-to-right scanning learns nothing about the text ahead, so it can never justify a jump larger than one on the same information.

> [!QUESTION]- What does each shift rule contribute, and why do most implementations drop the good-suffix rule?
> The bad-character rule aligns the pattern's rightmost copy of the mismatching text character, giving large skips on large alphabets. The good-suffix rule reuses an already-matched suffix, which helps on repetitive patterns the bad-character rule handles poorly. The algorithm takes the larger shift, so it is never worse than either alone. The good-suffix table's index arithmetic is error-prone for a small real gain, so production code such as GNU `grep`'s fixed-string search ships Boyer-Moore-Horspool with the bad-character rule only.

> [!QUESTION]- Why is the plain worst case `O(n·m)`, and what recovers a linear bound?
> The sublinear behavior depends on frequent large skips, which vanish when text and pattern share long repeated runs — as with an all-equal pattern `aaaa` over `aaaa…a`, where every alignment is a full match over all `m` characters and the good-suffix rule then shifts by only one. Galil's rule remembers how much of the pattern is already known to match after a shift and skips re-comparing those positions, bounding total comparisons at `O(n)`.

## References

- [A Fast String Searching Algorithm](https://dl.acm.org/doi/10.1145/359842.359859) — Boyer and Moore's original 1977 CACM paper introducing right-to-left scanning with the two shift heuristics.
- Charras & Lecroq, _Handbook of Exact String-Matching Algorithms_ (King's College Publications, 2004) — the canonical bad-character, good-suffix, and `suffixes` preprocessing this note's implementation follows (also published as the online ESMAJ handbook).
- [Boyer–Moore string-search algorithm](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_string-search_algorithm) — both heuristics, the Galil rule, and the complexity analysis distinguishing the plain and linear worst cases.
- [Boyer–Moore–Horspool algorithm](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore%E2%80%93Horspool_algorithm) — the bad-character-only simplification most production code ships.
