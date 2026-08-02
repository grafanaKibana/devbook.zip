---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Matches patterns by comparing rolling hashes of consecutive text windows."
level:
  - "4"
priority: Medium
status: Done
publish: true
---

Searching a text `T` of length `n` for a pattern `P` of length `m` tests `P` against the window that begins at each of the `n − m + 1` positions. Rabin-Karp replaces that per-position character test with a single integer comparison: it hashes `P` once, keeps a hash of the current text window, and a hash mismatch proves the strings differ, so only matching hashes are worth verifying.

The move that makes this cheap is the rolling hash. A hash mismatch discards a position with one comparison. Because distinct strings can still collide onto the same hash, a hash match is only a candidate — the algorithm then compares the `m` characters directly, and that verification is what keeps the answer correct.



~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"rabin-karp","text":"GEEKSFORGEEKS","pattern":"GEEK"}
```



The trace searches for `GEEK` in `GEEKSFORGEEKS`, sliding a four-character window and comparing its rolling hash against the pattern hash.

The window at index 0 hashes equal to the pattern, so that position triggers a character check and confirms the first match. Every following slide reuses the previous hash: the algorithm subtracts the weight of the character leaving on the left, shifts, and adds the character entering on the right. Positions whose hash differs from the pattern's are rejected on an integer comparison and never reach character verification. A matching hash triggers a direct pattern comparison, which confirms the second occurrence at index 8 just as it confirmed the first.



Rabin-Karp reads each length-`m` string as a number in base `b`, reduced modulo a large prime `p`. With characters mapped to integers, the window `T[i..i+m-1]` hashes to:

`h = (T[i]·b^(m-1) + T[i+1]·b^(m-2) + ... + T[i+m-1]) mod p`

The pattern is hashed the same way, once.

Sliding from window `i` to window `i+1` reuses `h`. The character `T[i]` leaves the high-order position and `T[i+m]` enters the low-order position:

`h' = ((h − T[i]·b^(m-1))·b + T[i+m]) mod p`

Subtracting `T[i]·b^(m-1)` removes the outgoing character's weighted term; multiplying by `b` shifts every remaining character up one place; adding `T[i+m]` seats the incoming character. Each operand stays reduced mod `p`, so the update is a fixed number of integer operations no matter how large `m` is.

Hash equality is necessary but not sufficient for string equality. The map from `m`-character strings to residues mod `p` is many-to-one, so two different windows can share a hash — a collision. Rabin-Karp treats a hash match as a claim to be checked: on `h == patternHash` it compares the `m` characters directly and reports a match only when they agree. That verification is the invariant separating Rabin-Karp from a probabilistic filter — without it, a collision would be reported as a false match.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Rabin Karp Search complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    },
    "secondarySize": {
      "symbol": "m",
      "description": "secondary input, pattern, bucket, or sequence size"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Best",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(n + m)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(n + m)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(n · m)"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```

The expected row assumes a large modulus and suitable base make spurious hash matches rare. Adversarial collisions force full pattern verification at many windows and select the chart's adverse row.
~~~~~

# Collisions and the Multi-pattern Payoff

A hash match is not a string match.

A weak modulus or overflow makes those collisions common rather than rare. A large prime such as `10^9 + 7` or `10^9 + 9`, with a reduction after every multiplication, keeps residues spread and the arithmetic in range.

The screening is strongest across many patterns at once. One pass filters for all of them together, which is where the hashing earns its place — document fingerprinting, plagiarism and duplicate-block detection, multi-signature log scanning.

# Reference Drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> graph TD
>   S[Input pattern P of length m and text T] --> A[Choose base b and prime modulus p]
>   A --> B[Compute hash of P]
>   B --> C[Compute hash of first window T from 0 to m minus 1]
>   C --> D[Set i to 0]
>   D --> E{i at most len T minus m}
>   E -->|No| Z[Done no more windows]
>   E -->|Yes| F{window hash equals pattern hash}
>   F -->|No| G[Roll hash to next window]
>   F -->|Yes| H{character by character match}
>   H -->|Yes| I[Report match at i]
>   H -->|No| J[Hash collision skip]
>   I --> G
>   J --> G
>   G --> K[Increment i]
>   K --> E
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static IEnumerable<int> FindAll(string text, string pattern)
> {
>     const long Base = 256;
>     const long Modulus = 1_000_000_007;
>
>     int n = text.Length, m = pattern.Length;
>     if (m == 0)
>     {
>         yield return 0;
>         yield break;
>     }
>     if (m > n) yield break;
>
>     long highPower = 1; // b^(m-1) mod p
>     for (int i = 0; i < m - 1; i++)
>     {
>         highPower = highPower * Base % Modulus;
>     }
>
>     long patternHash = 0, windowHash = 0;
>     for (int i = 0; i < m; i++)
>     {
>         patternHash = (patternHash * Base + pattern[i]) % Modulus;
>         windowHash = (windowHash * Base + text[i]) % Modulus;
>     }
>
>     for (int i = 0; i <= n - m; i++)
>     {
>         if (windowHash == patternHash && text.AsSpan(i, m).SequenceEqual(pattern))
>         {
>             yield return i;
>         }
>
>         if (i < n - m)
>         {
>             windowHash = ((windowHash - text[i] * highPower % Modulus + Modulus) % Modulus
>                           * Base + text[i + m]) % Modulus;
>         }
>     }
> }
> ```
> `FindAll` scans every window and yields every confirmed start index; an empty pattern keeps the conventional single match at index `0`. `SequenceEqual` is the mandatory verification: it runs only when the hashes match and guards against reporting a collision as a match. The `+ Modulus` before the final reductions keeps the subtraction non-negative in modular arithmetic. `Base = 256` assumes byte-range (ASCII) input; non-ASCII `char` values exceed 255, so a larger base (or hashing the byte encoding) is needed — correctness is unaffected either way because verification checks every hit.

# Questions

> [!QUESTION]- How does the rolling hash advance by one text position?
> The window hash is a base-`b` polynomial mod `p`. Moving right subtracts the outgoing character's weighted term `T[i]·b^(m-1)`, multiplies by `b` to shift the retained terms, and adds the incoming `T[i+m]`.

> [!QUESTION]- Why does a hash match still require a character comparison?
> The hash maps `m`-character strings onto residues mod `p`, a many-to-one map, so two different windows can share a value.

> [!QUESTION]- What forces character verification at many consecutive windows?
> Genuine matches everywhere, such as searching `aaaa` for `aa`, verify every position. A weak or small modulus can create the same pressure through frequent collisions; a large prime modulus makes spurious matches rarer.

# References

- [Efficient randomized pattern-matching algorithms](https://doi.org/10.1147/rd.312.0249) — Karp and Rabin's original paper introducing the hashing scheme and its randomized collision analysis (IBM Journal of Research and Development, 1987).
- [Rabin–Karp algorithm](https://en.wikipedia.org/wiki/Rabin%E2%80%93Karp_algorithm) — rolling-hash mechanics, collision analysis, and the multiple-pattern extension.
- [String hashing](https://cp-algorithms.com/string/string-hashing.html) — polynomial rolling hash with base and modulus selection, and its use in string matching.
