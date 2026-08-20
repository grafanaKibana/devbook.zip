---
publish: true
created: 2026-08-20T20:41:15.537Z
modified: 2026-08-20T20:41:15.538Z
published: 2026-08-20T20:41:15.538Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Matches patterns by comparing rolling hashes of consecutive text windows.
level:
  - "4"
priority: Medium
status: Done
---

Searching a text `T` of length `n` for a pattern `P` of length `m` creates `n − m + 1` candidate windows. Rabin–Karp hashes `P` once and maintains the hash of the current window. A different hash rejects the window with one integer comparison.

Equal hashes only identify a candidate. Distinct strings can collide, so the algorithm still compares the `m` characters before reporting a match. The rolling hash saves work. The direct comparison preserves correctness.

````tabsdown
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
          "operation": "Best",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + m)",
              "curveId": "linear"
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
````

# Collisions and the Multi-pattern Payoff

A hash match is evidence, not proof.

Collision rate depends on the base, modulus, and input distribution. A large prime such as `10^9 + 7` or `10^9 + 9`, with reduction after every multiplication, keeps the arithmetic in range and usually makes accidental collisions rare. Fixed public parameters can still be targeted, so adversarial workloads may randomize the base or verify with a second independent modulus.

Hashing pays off when one rolling-window pass screens for many patterns of the same length. Mixed lengths require grouping patterns by length and maintaining a rolling state for each group. Typical uses include document fingerprinting, duplicate-block detection, and multi-signature log scanning.

# Diagram and C# Implementation

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
>
> `FindAll` scans every window and yields each confirmed start index. An empty pattern keeps the conventional single match at index `0`. `SequenceEqual` runs only after equal hashes and prevents a collision from becoming a false match. The `+ Modulus` term keeps the subtraction non-negative before reduction. `Base = 256` remains a valid polynomial base for UTF-16 `char` values; base and modulus choices affect collision frequency, so they should be measured on the actual corpus and hardened for adversarial inputs when needed. Direct verification keeps the result correct regardless.

# References

- [Efficient randomized pattern-matching algorithms](https://doi.org/10.1147/rd.312.0249)
- [String hashing](https://cp-algorithms.com/string/string-hashing.html)
