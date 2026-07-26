---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Matches a pattern by comparing right-to-left and skipping ahead via bad-character and good-suffix rules, sublinear in practice."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

Scanning a megabyte of source code for the literal `getUserById` means asking, at each of a million positions, whether the pattern starts there. The naive check compares left-to-right at every alignment, so a near-match that only fails on its final character still costs a comparison per position — `O(n·m)` in the worst case, and it never skips a byte it has not already read.

Boyer-Moore reverses the comparison direction. It aligns the pattern under the text and compares from the pattern's *last* character backward. A mismatch there yields two facts: the offending text character, and how much of the pattern's tail already matched. That is enough to prove that a run of the following alignments cannot match, so the pattern jumps forward past them — and those positions are never read. On English text or source code the jump is frequently the full pattern length, so the scan touches only a fraction of the input.

The jump distance comes from two precomputed tables, and every shift is sound only because scanning right-to-left turned one mismatch into a statement about a whole block of text.

**Core condition:** large alphabet, right-to-left comparison → one mismatch skips a block unexamined → roughly `n/m` characters read, tables in `O(m + |Σ|)` space.

The trace keeps the pattern aligned under the text while the comparison cursor moves right-to-left and both rules expose the shift they propose.

```steptrace
{"algorithm":"boyer-moore","text":"ACCCDBACBA","pattern":"ACBA"}
```

# Why a Mismatch Skips a Block

Each alignment fixes the pattern's last character over some text index and compares leftward until a character disagrees (or the whole pattern matches). Two independent rules each propose a shift; the algorithm advances by the larger.

**Bad-character rule.** At a mismatch between `pattern[j]` and text character `c`, let `lastOccurrence(c)` be the rightmost index of `c` in the pattern, or `-1` when it is absent. The proposed shift is `max(1, j - lastOccurrence(c))`. If `c` is absent and the mismatch happens at the final pattern position, that becomes a full-pattern jump of `m`. This is the source of the large-alphabet speedup: the more distinct symbols exist, the more often the mismatching character is absent from a short pattern, and the larger the average skip.

**Good-suffix rule.** Suppose the suffix after `pattern[j]` matched before the mismatch. The strong rule first looks for another occurrence of that suffix whose preceding pattern character differs from the mismatching `pattern[j]`; requiring a different predecessor prevents the same mismatch from recurring immediately. If no eligible occurrence exists, it falls back to the longest suffix of the matched region that is also a prefix of the pattern. This reuses the partial-match information the bad-character rule discards.

The shift is `max(bad_char_shift, good_suffix_shift)`, which is always at least one, so the search never stalls. Correctness rests on a negative argument: any smaller shift would either drop a known-mismatching character back over the text or misalign a suffix already proven to match, so every alignment skipped over provably cannot produce a match — even though its characters were never compared. That clause is the whole mechanism. Left-to-right scanning learns nothing about the characters ahead, so it can never justify a jump larger than one on the same evidence.

Preprocessing builds both tables ahead of the scan. A last-occurrence table stores the raw rightmost index for each character (`|Σ|` entries), making the mismatch calculation `max(1, j - lastOccurrence(c))` explicit. An equivalent delta table used by Horspool-style code stores `m - 1 - i`, excludes the pattern's final position, and must adjust that end-relative delta back to the current mismatch position `j`; applying its values as unconditional shifts is a different algorithm. The good-suffix table maps each mismatch position to a safe suffix-preserving shift; its construction is `Θ(m)` but the index arithmetic is delicate.

## One Search

Searching for `ACBA` in `ACCCDBACBA` produces all three decisions exposed in the trace:

```text
alignment 0: ACCC
             ACBA
P[3]='A' vs 'C': mismatch.
bad = 3 - lastOccurrence('C') = 2; good = 1; bad character wins.

alignment 2: CCDB
             ACBA
P[3]='A' vs 'B': mismatch.
bad = 3 - lastOccurrence('B') = 1; good = 1; tie.

alignment 3: CDBA
             ACBA
P[3]='A' and P[2]='B' match; P[1]='C' vs 'D' mismatches.
bad = 1 - (-1) = 2; good = 3; good suffix wins.

alignment 6: ACBA
             ACBA
All four characters match right-to-left; report index 6.
```

The alignment starts are `0 → 2 → 3 → 6`; the corresponding shift distances are `2`, `1`, and `3`. No alignment between those starts can be a match.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Preprocessing | `Θ(m + \|Σ\|)` | `Θ(m + \|Σ\|)` | Build the bad-character table over the alphabet and the good-suffix table over the pattern. |
| Best / sublinear | `O(n/m)` | `O(m + \|Σ\|)` | Large alphabet, long pattern: each alignment mismatches on its last character and that character is absent from the pattern, so every probe jumps a full `m` and most text is never read. |
| Worst, plain | `O(n·m)` | `O(m + \|Σ\|)` | An all-equal pattern `A^m` in text `A^n`, where every alignment matches all `m` characters right-to-left (a full match) and the good-suffix rule shifts by only one, so ~`n` alignments each cost `O(m)`. |
| Worst, Galil rule | `O(n)` | `O(m + \|Σ\|)` | Remembering how much of the pattern is already known to match after a shift skips those re-comparisons, bounding total character comparisons linearly. |

The tables persist through the scan, so search space stays `O(m + |Σ|)`; the loop itself keeps only a few indices beyond them. The plain-versus-Galil split matters: the sublinear `O(n/m)` is a property of large-alphabet inputs, not a guarantee. Without Galil's rule an adversarial input degrades to `O(n·m)`, and the guaranteed-linear bound requires the extra bookkeeping.

# Where the Skip Disappears

A small alphabet can reduce the advantage when the pattern is long enough to contain most symbols and the text distribution makes them recur often. Repetition matters too: searching `AAAA` inside a long run of `A` lands in the `O(n·m)` worst case because every alignment is a full match over all `m` characters and the good-suffix rule shifts by only one. But alphabet size alone does not determine performance—a short or skewed pattern can still exclude common text symbols, and a useful good-suffix shift can recover distance even when the mismatching character occurs in the pattern. For binary or DNA data, measure against the actual pattern lengths, symbol distribution, and repetition instead of assuming the skip disappears.

The good-suffix table is the part that breaks silently. Its prefix fallback is easy to compute off by one, and a wrong entry produces either a missed match or a shift of zero that loops forever. **Boyer-Moore-Horspool** removes that table and uses a bad-character delta keyed on the text character under the pattern's final position.

Production code does not converge on one universal variant. GNU `grep` documents a Boyer-Moore fixed-string matcher but does not identify it as Horspool. `glibc`'s `memmem` chooses by needle length: a modified Horspool search for 3–256 bytes, then Two-Way for longer needles. Those are workload-specific engineering choices, not evidence that full Boyer-Moore is absent from production or that editor search commands share one implementation.

# Reference Drawer

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
>     int[] lastOccurrence = BuildLastOccurrenceTable(pattern);
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
>             int bc = Math.Max(1, j - lastOccurrence[text[shift + j]]);
>             shift += Math.Max(goodSuffix[j], bc); // never <= 0 because goodSuffix >= 1
>         }
>     }
> }
>
> private static int[] BuildLastOccurrenceTable(string pattern)
> {
>     var table = new int[256];
>     Array.Fill(table, -1);
>     for (int i = 0; i < pattern.Length; i++) table[pattern[i]] = i;
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
> The `lastOccurrence` table assumes byte-range characters; Unicode text needs a `Dictionary<char,int>` whose missing value is `-1`. Horspool uses a different delta table: it excludes the final pattern position and shifts from the character aligned under that position.

# Questions

> [!QUESTION]- Why does comparing right-to-left let Boyer-Moore skip characters it never reads?
> A mismatch at the pattern's last position exposes a text character together with its offset. If that character is absent from the pattern, no alignment that places any pattern character over it can match, so the pattern jumps clear past it — up to `m` positions — without comparing the characters in between. Left-to-right scanning learns nothing about the text ahead, so it can never justify a jump larger than one on the same information.

> [!QUESTION]- What does each shift rule contribute, and why might an implementation choose Horspool?
> The bad-character rule aligns the pattern's rightmost copy of the mismatching text character, giving large skips on large alphabets. The strong good-suffix rule reuses an already-matched suffix only when its preceding character differs from the mismatching pattern character, then falls back to a pattern prefix. The algorithm takes the larger shift, so it is never worse than either alone. Horspool is attractive when a simpler one-table implementation matters more than the extra skips, but the right choice depends on the workload.

> [!QUESTION]- Why is the plain worst case `O(n·m)`, and what recovers a linear bound?
> The sublinear behavior depends on frequent large skips, which vanish when text and pattern share long repeated runs — as with an all-equal pattern `aaaa` over `aaaa…a`, where every alignment is a full match over all `m` characters and the good-suffix rule then shifts by only one. Galil's rule remembers how much of the pattern is already known to match after a shift and skips re-comparing those positions, bounding total comparisons at `O(n)`.

# References

- [A Fast String Searching Algorithm](https://dl.acm.org/doi/10.1145/359842.359859) — Boyer and Moore's original 1977 CACM paper introducing right-to-left scanning with the two shift heuristics.
- Charras & Lecroq, *Handbook of Exact String-Matching Algorithms* (King's College Publications, 2004) — the canonical bad-character, good-suffix, and `suffixes` preprocessing this note's implementation follows (also published as the online ESMAJ handbook).
- [GNU grep: Performance](https://www.gnu.org/software/grep/manual/html_node/Performance.html) — documents the fixed-string matcher's use of Boyer-Moore without naming the Horspool variant.
- [`glibc` `memmem.c`](https://sourceware.org/git/?p=glibc.git;a=blob;f=string/memmem.c) — shows the modified Horspool path for 3–256-byte needles and the Two-Way fallback above that limit.
- [Boyer–Moore string-search algorithm](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_string-search_algorithm) — both heuristics, the Galil rule, and the complexity analysis distinguishing the plain and linear worst cases.
- [Boyer–Moore–Horspool algorithm](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore%E2%80%93Horspool_algorithm) — a bad-character-only variant with simpler preprocessing and shift logic.
