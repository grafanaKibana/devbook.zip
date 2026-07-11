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

Searching a text `T` of length `n` for a pattern `P` of length `m` tests `P` against the window that begins at each of the `n − m + 1` positions. A character-by-character test costs up to `m` per position, so text full of partial matches climbs to `O(nm)`. Rabin-Karp replaces that per-position character test with a single integer comparison: it hashes `P` once, keeps a hash of the current text window, and a hash mismatch proves the strings differ, so only matching hashes are worth verifying.

The move that makes this cheap is the rolling hash. Sliding the window one character to the right does not recompute the hash from its `m` characters; it updates the previous hash in `O(1)` by dropping the outgoing character's contribution and folding in the incoming one. A hash mismatch discards a position with one comparison. Because distinct strings can still collide onto the same hash, a hash match is only a candidate — the algorithm then compares the `m` characters directly, and that verification is what keeps the answer correct.

**Core condition:** a window hash that updates in `O(1)` per slide + a verification on every hash match → `O(n + m)` expected search, `O(nm)` only when collisions or genuine matches force verification at most positions.

## One search

The trace searches for `GEEK` in `GEEKSFORGEEKS`, sliding a four-character window and comparing its rolling hash against the pattern hash.

```steptrace
{"algorithm":"rabin-karp","text":"GEEKSFORGEEKS","pattern":"GEEK"}
```

The window at index 0 hashes equal to the pattern, so that position triggers a character check and confirms the first match. Every following slide reuses the previous hash: the algorithm subtracts the weight of the character leaving on the left, shifts, and adds the character entering on the right, producing the next window's hash in a constant number of operations rather than `O(m)`. Positions whose hash differs from the pattern's — the large majority here — are rejected on a single integer compare and never reach a character comparison. Only when a window hash equals the pattern hash does the algorithm spend `O(m)` confirming the characters, which is why the second occurrence at index 8 pays exactly the verification the first one did.

## The rolling hash and its verification guard

Rabin-Karp reads each length-`m` string as a number in base `b`, reduced modulo a large prime `p`. With characters mapped to integers, the window `T[i..i+m-1]` hashes to:

`h = (T[i]·b^(m-1) + T[i+1]·b^(m-2) + ... + T[i+m-1]) mod p`

The pattern is hashed the same way, once.

Sliding from window `i` to window `i+1` reuses `h`. The character `T[i]` leaves the high-order position and `T[i+m]` enters the low-order position:

`h' = ((h − T[i]·b^(m-1))·b + T[i+m]) mod p`

Subtracting `T[i]·b^(m-1)` removes the outgoing character's weighted term; multiplying by `b` shifts every remaining character up one place; adding `T[i+m]` seats the incoming character. Each operand stays reduced mod `p`, so the update is a fixed number of integer operations no matter how large `m` is.

Hash equality is necessary but not sufficient for string equality. The map from `m`-character strings to residues mod `p` is many-to-one, so two different windows can share a hash — a collision. Rabin-Karp treats a hash match as a claim to be checked: on `h == patternHash` it compares the `m` characters directly and reports a match only when they agree. That verification is the invariant separating Rabin-Karp from a probabilistic filter — without it, a collision would be reported as a false match.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(n + m)` | `O(1)` | Hashing `P` and the first window costs `Θ(m)`; the remaining slides are `O(1)` each and few or no hash matches reach verification. |
| Average | `Θ(n + m)` | `O(1)` | Assumes a hash with a large prime modulus and a suitable base, so spurious hash matches are rare; verifications cost `O(1)` amortized per slide and total expected work stays `O(n)`. |
| Worst | `Θ(n · m)` | `O(1)` | A hash match at (almost) every position forces `O(m)` verification each time — an adversarial or weak modulus producing constant collisions, or genuine matches everywhere as in text `aa…a` searched for `aa…a`. |

Auxiliary space is a handful of integer accumulators — the pattern hash, the running window hash, and the precomputed high-order power `b^(m-1)` — independent of both `n` and `m`.

## Collisions and the multi-pattern payoff

A hash match is not a string match. Dropping the `O(m)` verification to save time turns the algorithm into a filter that reports any two substrings sharing a residue as equal; the verification is not an optimization to remove.

A weak modulus or overflow makes those collisions common rather than rare. A small or composite `p`, or a base/modulus pair whose intermediate products overflow the integer type before reduction, shrinks or corrupts the hash space; residues cluster, hash matches fire at most positions, and each drags in an `O(m)` verification — the average `Θ(n + m)` collapses into the `Θ(nm)` worst case. A large prime such as `10^9 + 7` or `10^9 + 9`, with a reduction after every multiplication, keeps residues spread and the arithmetic in range.

The screening is strongest across many patterns at once. A single rolling hash over the text can screen a whole set of equal-length patterns: hash every pattern into a set, then test each window hash for membership in `O(1)`. One pass filters for all of them together, which is where the hashing earns its place — document fingerprinting, plagiarism and duplicate-block detection, multi-signature log scanning.

## Reference drawer

> [!ABSTRACT]- Control flow
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
> ```csharp
> public static int RabinKarp(string text, string pattern)
> {
>     const long Base = 256;
>     const long Modulus = 1_000_000_007;
>
>     int n = text.Length, m = pattern.Length;
>     if (m == 0 || m > n)
>     {
>         return m == 0 ? 0 : -1;
>     }
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
>             return i;
>         }
>
>         if (i < n - m)
>         {
>             windowHash = ((windowHash - text[i] * highPower % Modulus + Modulus) % Modulus
>                           * Base + text[i + m]) % Modulus;
>         }
>     }
>
>     return -1;
> }
> ```
> `SequenceEqual` is the mandatory verification: it runs only when the hashes match and guards against reporting a collision as a match. The `+ Modulus` before the final reductions keeps the subtraction non-negative in modular arithmetic. `Base = 256` assumes byte-range (ASCII) input; non-ASCII `char` values exceed 255, so a larger base (or hashing the byte encoding) is needed — correctness is unaffected either way because verification checks every hit.

## Comparison

| Strategy | Search time | Preprocessing / space | Stronger case | Weaker case |
| --- | --- | --- | --- | --- |
| Naive scan | `O(nm)` worst, `O(n)` typical | None | A one-off search or tiny input where setup is not worth it | Long text with many partial matches |
| Rabin-Karp | `Θ(n + m)` expected, `Θ(nm)` worst | `Θ(m)` pattern hash; `O(1)` space; hashes many equal-length patterns at once | Many equal-length patterns; fingerprint / plagiarism screening | A single pattern needing a hard worst-case bound (collisions can force `O(nm)`) |
| [[KMP (Knuth-Morris-Pratt) Algorithm\|KMP]] | `Θ(n + m)` worst | `Θ(m)` prefix function | One pattern with a guaranteed linear bound; streaming input | Multiple patterns (rerun per pattern); no sublinear skipping |
| [[Boyer-Moore]] | `O(n / m)` best, `O(nm)` worst | `O(m + σ)` bad-character / good-suffix tables | Large alphabets where a mismatch skips many characters | Small alphabets, short patterns, or many patterns at once |
| [[Aho-Corasick]] | `Θ(n + Σmᵢ + z)` for `z` matches | `Θ(Σmᵢ)` automaton over all patterns | Many patterns of varied length, matched in one pass | A single pattern (KMP is simpler); memory-tight settings |

Rabin-Karp's natural fit is a set of equal-length patterns, or fingerprint and plagiarism screening by hashing, where one rolling hash filters for the whole set and the expected bound holds under a good modulus. It pays for that with a verification on every hash hit and a worst case that repetitive text or collisions can trigger. For a single pattern with a hard worst-case guarantee, KMP's deterministic `Θ(n + m)` is stronger; Boyer-Moore pulls ahead on large alphabets by skipping most characters; and when the patterns differ in length, Aho-Corasick's automaton matches them all in one pass that equal-length hashing cannot express.

## Questions

> [!QUESTION]- How does sliding the window keep the hash update at `O(1)`?
> The window hash is a base-`b` polynomial mod `p`. Moving one position right subtracts the outgoing character's weighted term `T[i]·b^(m-1)`, multiplies by `b` to shift the rest up one place, and adds the incoming `T[i+m]` — a fixed count of modular operations, independent of `m`. Recomputing from the `m` characters instead would make each step `O(m)` and the scan `O(nm)`.

> [!QUESTION]- Why does a hash match still require a character comparison?
> The hash maps `m`-character strings onto residues mod `p`, a many-to-one map, so two different windows can share a value. A match on the hash means only that the strings might be equal; the `O(m)` character check confirms it and stops a collision from being reported as a match.

> [!QUESTION]- What turns the expected `Θ(n + m)` into the `Θ(nm)` worst case?
> A hash match at almost every position, each forcing an `O(m)` verification. It arises with genuine matches everywhere (text `aaaa` searched for `aa`) or with a weak or small modulus that makes collisions frequent. A large prime modulus keeps spurious matches rare, which is the low-collision assumption behind the average bound.

> [!QUESTION]- What workload makes Rabin-Karp a better fit than KMP?
> Screening many equal-length patterns in one pass — hash every pattern into a set and test each window hash for membership in `O(1)`, so a single rolling hash filters for all of them. For a single pattern needing a guaranteed linear bound, KMP is stronger; for patterns of varied length, Aho-Corasick's automaton fits better.

## References

- [Efficient randomized pattern-matching algorithms](https://doi.org/10.1147/rd.312.0249) — Karp and Rabin's original paper introducing the hashing scheme and its randomized collision analysis (IBM Journal of Research and Development, 1987).
- [Rabin–Karp algorithm](https://en.wikipedia.org/wiki/Rabin%E2%80%93Karp_algorithm) — rolling-hash mechanics, collision analysis, and the multiple-pattern extension.
- [String hashing](https://cp-algorithms.com/string/string-hashing.html) — polynomial rolling hash with base and modulus selection, and its use in string matching.
