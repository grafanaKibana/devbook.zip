---
publish: true
created: 2026-08-20T20:41:15.538Z
modified: 2026-08-20T20:41:15.539Z
published: 2026-08-20T20:41:15.539Z
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

The Z-algorithm computes how much of a string's prefix reappears at every position. Its **Z-array** stores that result: `z[i]` is the length of the longest substring beginning at `i` that matches a prefix of `S`.

For `S = "aabaab"`, the array is `[·, 1, 0, 3, 1, 0]`. The substring at index 3 begins with `"aab"`, matching three prefix characters, so `z[3] = 3`. Index 1 shares only the first `a`, giving `z[1] = 1`. By convention, `z[0]` is either undefined or set to `n`. This is the same prefix-overlap information encoded by [[Computer Science/Algorithms/Search Algorithms/String Matching/KMP (Knuth-Morris-Pratt) Algorithm|KMP]], stored as a forward match length instead of a fallback.

A window `[l, r]`, called the **Z-box**, tracks the prefix match that reaches furthest right. Positions inside the box can reuse earlier work whenever their mirrored match ends before the box boundary.

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
      "description": "length of the input string or searched text"
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
          "operation": "Z-array of a string (length n)",
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
          "operation": "Search P in T",
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
          "operation": "Z-array of a string (length n)",
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
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "Θ(n + m)",
              "curveId": "linear"
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

**A separator from the input alphabet.** A separator outside the alphabet caps every text-region `z[i]` at `m`. A longer match would have to match `S[m]`, the separator, against a text character. The cap makes `z[i] == m` equivalent to `z[i] >= m` and prevents a match from crossing the `P`/`T` boundary.

That cap disappears when the separator occurs in the input. Searching for `P = "ab"` in `T = "aba"` with `sep = 'a'` builds `"abaaba"`, whose Z-array is `[6, 0, 1, 3, 0, 1]`. The occurrence at text position 0 maps to index 3 and has `z[3] = 3`, not `2`, because the match continues across the join. A strict `z[i] == m` test misses this valid occurrence. `FindAll` uses `z[i] >= m`. From a text-region index, those first `m` matching characters lie wholly inside `T`, so the result remains correct for any separator. A sentinel outside the alphabet, such as `\0` for ordinary text or `-1` for an integer sequence, simply restores the useful cap.

**A mirror reaching the box edge.** Inside the box, `z[i-l]` is exact only when its match ends before `r`. If `z[i-l] >= r - i + 1`, copying it would claim equality for characters past `r` that have never been compared. In `S = "aaabaaa"`, index 2 mirrors index 1, where `z[1] = 2`. Copying that value would say `"ab"` matches the prefix `"aa"`. The actual value is `z[2] = 1`. At the edge, the mirror supplies a lower bound. The algorithm starts with the box remainder and resumes comparison at `r + 1`.

# Diagram and C# Implementation

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
> `FindAll` rejects an empty pattern instead of defining `n + 1` zero-length occurrences. It begins at `m + 1`, the first index inside `T`. There, `z[i] >= m` proves that `m` text characters reproduce `P`, regardless of the separator. A separator absent from both inputs caps that value at exactly `m`. `\0` works for ordinary text but must change when the input may contain it. Only a strict `== m` check would lose valid matches when the separator also appears in the input.

# References

- [Z-function](https://cp-algorithms.com/string/z-function.html)
