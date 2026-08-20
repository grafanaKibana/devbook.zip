---
publish: true
created: 2026-08-20T20:41:15.537Z
modified: 2026-08-20T20:41:15.537Z
published: 2026-08-20T20:41:15.537Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Matches a pattern by comparing right-to-left and skipping ahead via bad-character and good-suffix rules.
level:
  - "4"
priority: Medium
status: Creation
---

Boyer-Moore aligns the pattern under the text and compares from right to left. A mismatch exposes both the offending text character and the suffix that already matched. Two precomputed rules turn that information into a safe jump over alignments that cannot succeed.

The **bad-character rule** uses the mismatching character's rightmost pattern position. The **good-suffix rule** repositions the suffix already known to match. Taking the larger safe shift can skip text positions that are never inspected, which is the algorithm's practical advantage over checking every alignment from the left.

The trace keeps the pattern aligned under the text while the comparison cursor moves right to left and each rule proposes a shift.

````tabsdown
tab: Visualization


```steptrace
{"algorithm":"boyer-moore","text":"ACCCDBACBA","pattern":"ACBA"}
```





Each alignment fixes the pattern's last character over some text index and compares leftward until a character disagrees (or the whole pattern matches). Two independent rules each propose a shift; the algorithm advances by the larger.

**Bad-character rule.** At a mismatch between `pattern[j]` and text character `c`, let `lastOccurrence(c)` be the rightmost index of `c` in the pattern, or `-1` when it is absent. The proposed shift is `max(1, j - lastOccurrence(c))`. If `c` is absent and the mismatch happens at the final pattern position, that becomes a full-pattern jump of `m`. With more distinct symbols, the mismatching character is more often absent from a short pattern and the proposed skip is larger.

**Good-suffix rule.** Suppose the suffix after `pattern[j]` matched before the mismatch. The strong rule first looks for another occurrence of that suffix whose preceding pattern character differs from the mismatching `pattern[j]`; requiring a different predecessor prevents the same mismatch from recurring immediately. If no eligible occurrence exists, it falls back to the longest suffix of the matched region that is also a prefix of the pattern. This reuses the partial-match information the bad-character rule discards.

The shift is `max(bad_char_shift, good_suffix_shift)`, which is always at least one, so the search never stalls. Correctness rests on a negative argument: any smaller shift would either drop a known-mismatching character back over the text or misalign a suffix already proven to match, so every alignment skipped over provably cannot produce a match — even though its characters were never compared. That clause is the whole mechanism. A left-to-right comparison at the current alignment does not expose the trailing mismatch needed for this bad-character/block-skipping argument; KMP instead advances by reusing pattern-overlap information.

Preprocessing builds both tables ahead of the scan. A last-occurrence table stores the raw rightmost index for each character, making the mismatch calculation `max(1, j - lastOccurrence(c))` explicit. An equivalent delta table used by Horspool-style code stores `m - 1 - i`, excludes the pattern's final position, and must adjust that end-relative delta back to the current mismatch position `j`; applying its values as unconditional shifts is a different algorithm. The good-suffix table maps each mismatch position to a safe suffix-preserving shift, but its index arithmetic is delicate.



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

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Boyer-Moore complexity",
  "variables": {
    "alphabetSize": {
      "symbol": "σ",
      "description": "alphabet cardinality"
    },
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
          "operation": "Preprocessing",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(m) expected",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Best / sublinear",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(n/m)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst, plain",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(n·m)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst, Galil rule",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n)",
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
          "operation": "Preprocessing",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "Θ(m) expected",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Best / sublinear",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst, plain",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst, Galil rule",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(m)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```

The favorable chart row describes inputs where large shifts repeatedly skip untouched text. The plain algorithm can repeat comparisons on adversarial text; the Galil rule remembers a region already known to match and avoids those repeated comparisons.
````

# Where the Skip Disappears

A small alphabet often shortens bad-character shifts because mismatching symbols recur in the pattern. It does not determine performance by itself: a short or skewed pattern may still exclude common text symbols, while the good-suffix rule can recover a useful jump. Binary and DNA workloads therefore need measurements against their actual pattern lengths and repetition.

The good-suffix table is the part that breaks silently. Its prefix fallback is easy to compute off by one, and a wrong entry produces either a missed match or a shift of zero that loops forever. **Boyer-Moore-Horspool** removes that table and uses a bad-character delta keyed on the text character under the pattern's final position.

Production code does not converge on one variant. GNU `grep` documents a Boyer-Moore fixed-string matcher without identifying it as Horspool. `glibc`'s `memmem` selects a modified Horspool search for 3–256-byte needles and Two-Way for longer ones. These are workload-specific choices, not a universal implementation rule.

# Diagram and C# Implementation

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
>     Dictionary<char, int> lastOccurrence = BuildLastOccurrenceTable(pattern);
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
>             char mismatch = text[shift + j];
>             int last = lastOccurrence.TryGetValue(mismatch, out var index) ? index : -1;
>             int bc = Math.Max(1, j - last);
>             shift += Math.Max(goodSuffix[j], bc); // never <= 0 because goodSuffix >= 1
>         }
>     }
> }
>
> private static Dictionary<char, int> BuildLastOccurrenceTable(string pattern)
> {
>     var table = new Dictionary<char, int>();
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
>
> The `Dictionary<char,int>` supports arbitrary .NET `char` values and treats a missing character as position `-1`. Like `string` indexing, the search compares UTF-16 code units rather than user-perceived grapheme clusters. Horspool uses a different delta table: it excludes the final pattern position and shifts from the character aligned under that position.

# References

- [A Fast String Searching Algorithm](https://dl.acm.org/doi/10.1145/359842.359859)
- [`glibc` `memmem.c`](https://sourceware.org/git/?p=glibc.git;a=blob;f=string/memmem.c)
