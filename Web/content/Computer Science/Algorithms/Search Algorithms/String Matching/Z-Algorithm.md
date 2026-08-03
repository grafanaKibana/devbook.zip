---
publish: true
created: 2026-08-03T10:27:09.356Z
modified: 2026-08-03T10:27:09.356Z
published: 2026-08-03T10:27:09.356Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Computes the longest prefix match starting at each index in one forward pass using a sliding Z-box.
level:
  - "4"
priority: Medium
status: Creation
---

The Z-algorithm avoids repeatedly comparing each suffix from scratch by computing the **Z-array**: `z[i]` is the length of the longest substring starting at index `i` that also matches a prefix of `S`.

For `S = "aabaab"`, `z = [·, 1, 0, 3, 1, 0]`. The block starting at index 3 (`"aab"`) matches the prefix `"aab"` for three characters, so `z[3] = 3`; index 1 shares only the leading `a`, so `z[1] = 1`. (`z[0]` spans the whole string and is left undefined or set to `n` by convention.) The array records, for every suffix, how far it agrees with the prefix — the same prefix-overlap information [[Computer Science/Algorithms/Search Algorithms/String Matching/KMP (Knuth-Morris-Pratt) Algorithm|KMP]]'s failure function encodes, expressed as a forward match length rather than a recursive fallback.

A window `[l, r]` — the **Z-box** — remembers the match reaching furthest right; positions inside it reuse an already-computed mirror when that match ends within the box.

The trace keeps the prefix, current Z-box, mirror source, and committed Z values aligned while each entry is copied or extended.

````tabsdown
tab: Visualization


```steptrace
{"algorithm":"z-algorithm","text":"aabcaabxaaaz"}
```





The pass carries one interval, the box `[l, r]`: the match with the largest right endpoint proven equal to a prefix, so `S[l..r] == S[0..r-l]`. Processing index `i` takes one of two paths.

- **`i > r` — outside the box.** Nothing is known at `i`, so compare `S[i], S[i+1], …` against `S[0], S[1], …` directly, stopping at the first mismatch. `z[i]` is the matched length; if the match ends past the old `r`, the box slides to `[i, i + z[i] - 1]`.
- **`i <= r` — inside the box.** Because `S[i..r]` equals `S[i-l..r-l]`, position `i` mirrors position `k = i - l`. When `z[k] < r - i + 1`, the mirrored match ends strictly before the box edge and is fully determined: `z[i] = z[k]`, no comparisons. When `z[k] >= r - i + 1`, the mirror only guarantees a match up to `r`; past that the characters were never verified, so `z[i]` starts at the box remainder `r - i + 1` and extends by direct comparison from `r + 1`, then slides the box.

The invariant that licenses the copy: everything at or left of `r` inside the box is a verified prefix match, so a mirror wholly inside the box needs no recheck. Only extension past `r` performs real comparisons.

Direct comparisons happen only while extending beyond `r`. Each one either fails and ends the extension at `i`, or succeeds and pushes `r` one position right. The box never moves left.

The pass over `S = "aabxaabxay"` makes the reuse concrete:

```text
Z-array of S = "aabxaabxay"   (indices 0..9)

i=1: outside. S[1]='a'==S[0], S[2]='b'!=S[1]. z[1]=1, box -> [1,1].
i=2: outside (i > r). S[2]='b'!=S[0]. z[2]=0.
i=3: outside. S[3]='x'!=S[0]. z[3]=0.
i=4: outside. 'a a b x a' match S[0..4], S[9]='y'!=S[5]. z[4]=5, box -> [4,8].
i=5: inside [4,8]. k=1, z[1]=1 < r-i+1=4 -> copy z[5]=1, no comparisons.
i=6: inside. k=2, z[2]=0 < 3 -> copy z[6]=0.
i=7: inside. k=3, z[3]=0 < 2 -> copy z[7]=0.
i=8: inside, edge. k=4, z[4]=5 >= 1 -> reset to remainder 1, extend from r+1=9:
     S[9]='y'!=S[1]. z[8]=1.
i=9: outside (i > r). S[9]='y'!=S[0]. z[9]=0.

Z = [10, 1, 0, 0, 5, 1, 0, 0, 1, 0]
```

Indices 5, 6, and 7 copy their values from mirrors inside `[4, 8]` without rechecking the characters already covered by the box.



Single-pattern search reduces to one Z-array. Build `S = P + sep + T`, where `sep` is a character occurring in neither `P` nor `T`, and compute `z` over `S`. Any index `i` in the `T` region with `z[i] >= |P|` marks an occurrence: the substring at `i` reproduces the whole pattern prefix in `|P|` characters that lie entirely inside `T`. A proper separator caps every text-region Z-value at `|P|` — no match can run across the boundary — so here `>=` and `==` coincide.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Z-Algorithm complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    },
    "secondarySize": {
      "symbol": "m",
      "description": "secondary input, pattern, bucket, or sequence size"
    },
    "sizeS": {
      "symbol": "S",
      "description": "string, state, or output size"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Z-array of a string S",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(|S|)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search P in T",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(n + m)"
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
          "operation": "Z-array of a string S",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "Θ(1) beyond the array",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search P in T",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "Θ(n + m)"
            }
          ]
        }
      ]
    }
  }
}
```

The search space row counts both the temporary concatenated string and its Z-array. Computing only the Z-array for an existing string needs no second copy of that string.
````

# When the Assumptions Stop Holding

**A separator drawn from the alphabet — and why `>=` survives it.** A separator outside the input alphabet caps every text-region `z[i]` at `m`: exceeding `m` would require matching `S[m]`, the separator, against a text character, which cannot happen. That cap keeps `z[i] == m` and `z[i] >= m` equivalent and stops any match from spanning the `P`/`T` boundary. Let the separator back into the alphabet and the cap is gone. Searching for `P = "ab"` in `T = "aba"` with `sep = 'a'` builds `"ab" + "a" + "aba" = "abaaba"`, whose Z-array is `[6, 0, 1, 3, 0, 1]`. The real occurrence of `"ab"` at text position 0 lands at index 3, where the match runs on through the separator-turned-`a` into the prefix and gives `z[3] = 3`. A strict `z[i] == m` test checks for `2` and misses it — a genuine hit dropped. The shipped `FindAll` uses `z[i] >= m`, which is robust: any text-region index (scanned from `m + 1` on) with `z[i] >= m` has `S[i..i+m-1]` equal to `P` in `m` consecutive characters lying wholly inside `T` — an occurrence whatever `sep` is. So the separator's job is narrower than correctness: with `>=`, an in-alphabet separator costs only the `== m` equivalence, not the result. A sentinel outside the alphabet — a `\0` byte, or `-1` over an integer sequence — keeps the two tests interchangeable.

**Copying a mirror that reaches the box edge.** Inside the box the mirror `z[i-l]` is exact only while it ends before `r`. When `z[i-l] >= r - i + 1`, taking it verbatim asserts a match over characters past `r` that were never compared. On `S = "aaabaaa"`, index 2 mirrors index 1 with `z[1] = 2`, but copying that would claim `S[2..3] = "ab"` matches the prefix `"aa"`; the true value is `z[2] = 1`. The mirror at the edge is only a lower bound, so `z[i]` must be reset to the box remainder and re-extended from `r + 1`.

# Reference Drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[For index i from 1 to n minus 1] --> B{i greater than r}
>   B -->|Yes| C[Extend naively from i comparing to prefix]
>   B -->|No| D[Set k to i minus l]
>   D --> E{z at k less than r minus i plus 1}
>   E -->|Yes| F[Copy z at i equals z at k]
>   E -->|No| G[Re extend from r plus 1 comparing to prefix]
>   C --> H[Slide box to i and i plus z at i minus 1]
>   G --> H
>   F --> I[Advance to next i]
>   H --> I
>   I --> A
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static int[] ZArray(string s)
> {
>     if (s.Length == 0)
>     {
>         return [];
>     }
>
>     var n = s.Length;
>     var z = new int[n];
>     z[0] = n;                 // conventional; the box logic never reads z[0]
>     int l = 0, r = 0;         // inclusive box [l, r]: s[l..r] == s[0..r-l]
>
>     for (var i = 1; i < n; i++)
>     {
>         if (i <= r)           // inside the box: mirror, capped at the edge
>         {
>             var remainder = r - i + 1;
>             var mirror = z[i - l];
>             if (mirror < remainder)
>             {
>                 z[i] = mirror; // strict copy: mismatch is already known inside the box
>                 continue;
>             }
>
>             z[i] = remainder;  // only the box-edge case may extend
>         }
>
>         while (i + z[i] < n && s[z[i]] == s[i + z[i]])  // extend past r
>         {
>             z[i]++;
>         }
>
>         if (z[i] > 0 && i + z[i] - 1 > r)   // match ran past r: slide the box
>         {
>             l = i;
>             r = i + z[i] - 1;
>         }
>     }
>
>     return z;
> }
>
> public static IEnumerable<int> FindAll(string pattern, string text, char separator = '\0')
> {
>     if (pattern.Length == 0)
>     {
>         throw new ArgumentException("Pattern must not be empty.", nameof(pattern));
>     }
>
>     var s = pattern + separator + text;
>     var z = ZArray(s);
>     var m = pattern.Length;
>
>     for (var i = m + 1; i < s.Length; i++)
>     {
>         if (z[i] >= m)               // the whole pattern prefix reappears here
>         {
>             yield return i - (m + 1); // map back to an index in text
>         }
>     }
> }
> ```
>
> `FindAll` rejects an empty pattern rather than defining the `n + 1` zero-length occurrences. It scans non-empty patterns from `m + 1`, so every index it tests lies in `T`; a text-region `z[i] >= m` means `m` characters of `T` reproduce `P`, a genuine occurrence for any separator. With a separator outside both arguments the cap makes `z[i] >= m` fire only at exactly `m`; `\0` suits ordinary text but must change if the input can contain it. Should the separator leak into the alphabet, `>= m` still reports correctly — only a stricter `== m` test would start dropping hits.

# Questions

> [!QUESTION]- What does `z[i]` measure, and how does the Z-box reuse an earlier match?
> `z[i]` is the length of the longest substring starting at index `i` that also matches a prefix of the string. The box `[l, r]` is the match interval with the largest `r`; a position inside it copies its value from the mirror `z[i-l]` when that mirror ends before the edge, spending no comparisons. Direct comparisons occur only while extending past `r`, and each either fails once or pushes `r` one step right.

> [!QUESTION]- Why should the concatenation separator lie outside the input alphabet?
> To keep the cap: a separator absent from `P` and `T` holds every text-region `z[i]` to at most `|P|`, so `z[i] == |P|` and `z[i] >= |P|` coincide and no match spans the pattern/text join. If the separator also appears in the input, a genuine occurrence can extend across the join and produce `z[i] > |P|` — a strict `== |P|` test would then drop it. The shipped `>= |P|` test survives this (a text-region `z[i] >= |P|` is always `|P|` real characters of `T` matching `P`); a sentinel outside the alphabet is what lets the simpler `==` formulation stay correct too.

> [!QUESTION]- Inside the box, when can `z[i]` be copied from the mirror, and when must it be recomputed?
> When `z[i-l] < r - i + 1` the mirrored match ends strictly before the box edge, so it is fully verified and `z[i] = z[i-l]`. When `z[i-l] >= r - i + 1` the mirror only guarantees a match up to `r`; the characters past `r` were never compared, so `z[i]` is reset to the box remainder `r - i + 1` and extended from `r + 1`.

# References

- [Main and Lorentz's 1984 repetition-finding paper](https://doi.org/10.1016/0196-6774\(84\)90021-X) — the original paper uses string-period structure related to the Z-box mechanism.
- [Z-function](https://cp-algorithms.com/string/z-function.html)
- [Algorithms on Strings, Trees, and Sequences](https://doi.org/10.1017/CBO9780511574931)
- [Competitive Programmer's Handbook](https://cses.fi/book/book.pdf) — Antti Laaksonen; the string chapter covers the Z-array alongside the prefix function and their shared applications.
