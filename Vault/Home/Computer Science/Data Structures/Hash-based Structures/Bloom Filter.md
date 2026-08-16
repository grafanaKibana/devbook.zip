---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A probabilistic membership filter using fixed bits, with tunable false positives but never false negatives."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A service checks whether a key exists before an expensive disk, database, or network lookup. Most queried keys are absent, so the system spends much of its time confirming misses. A [[Home/Computer Science/Data Structures/Hash-based Structures/Hash Set|Hash Set]] answers membership exactly but must retain every key. That may cost more memory than the lookup guard can justify.

A Bloom filter retains an *m*-bit array and derives *k* positions for each element. Adding an element sets the bits `h₁(x)..hₖ(x)`. A query returns "possibly present" when all *k* bits are 1, and "definitely absent" as soon as one bit is 0. The elements themselves are gone. This compressed state cannot enumerate members, return associated data, or support safe deletion in the standard form. Overlapping bit patterns can make an element that was never added appear present. A zero bit still proves absence, so the standard add-only filter has false positives but no false negatives.

**Core shape:** elements → *k* hash bits set in an *m*-bit array → all-ones means probably present, any-zero means definitely absent

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"bloom-filter"}
```

#### Representation and Invariants

The stored state is a single bit array of length *m* and a family of *k* hash functions, each mapping an element to an index in `[0, m)`. Nothing else persists — no keys, no counts, no insertion order.

- `Add(x)` computes `h₁(x)..hₖ(x)` and sets each of those *k* bits to 1. Bits already at 1 stay at 1; the operation only ever turns bits on.
- `Query(x)` computes the same *k* positions and returns "possibly present" when every one of them is 1. If any position holds 0, `x` was never added, and the answer "definitely absent" is exact.

Three properties follow directly from the fact that bits are only ever set, never cleared, and are shared across elements:

1. Every bit that a present element touched is 1, so a present element always passes its query. False negatives cannot occur.
2. A bit reaching 1 records that *some* element hashed to it, not *which* element. Once several elements have been added, a queried element can find all *k* of its bits already set by unrelated elements. That is the false positive, and it is intrinsic to storing overlapping fingerprints rather than the elements.
3. Because no bit belongs to a single element, no operation can safely undo an insertion — clearing a bit for one element could clear a bit another present element depends on, which would manufacture a false negative.

The representative state is therefore a compressed image of set membership, not the set. Identity, multiplicity, and order are gone the moment an element is folded into the bits.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Bloom Filter complexity",
  "variables": {
    "hashCount": {
      "symbol": "k",
      "description": "number of hash positions tested per value"
    },
    "secondarySize": {
      "symbol": "m",
      "description": "number of bits in the filter"
    },
    "valueLength": {
      "symbol": "l",
      "description": "encoded input-value length"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Construct empty filter",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "Θ(m) bits cleared",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Average",
              "formula": "Θ(m)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "Θ(m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Add(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(l + k)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Average",
              "formula": "O(l + k)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(l + k)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Query(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(l + 1) first 0 bit",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Average",
              "formula": "O(l + k)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(l + k)",
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
          "operation": "Construct empty filter",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "Θ(m) bits",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Add(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(l) in the example",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Query(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(l) in the example",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# When the Structure Stops Fitting

Deletion is the sharp boundary. A standard filter cannot clear an element's bits because other elements may depend on the same positions. A **counting Bloom filter** replaces bits with small counters and decrements them on removal. That costs several times more space and is safe only when removals correspond to known insertions. Underflow corrupts shared counts. Overflow or saturation can lose increments and later create false negatives, so the implementation must prevent those states or size counters for the expected load.

Enumeration and per-element counts are unavailable for the same reason. The filter holds no elements and cannot reconstruct them from shared bits. A "possibly present" result only permits the authoritative lookup to continue.

Over-filling raises the false-positive rate without a clear failure event. The rate `p ≈ (1 − e^(−kn/m))^k` assumes a design capacity *n*. Inserting beyond it drives more bits to 1 until "possibly present" stops filtering useful work. Fixed filters need *m* and *k* sized for the actual peak *n*. A **scalable Bloom filter** grows by adding larger filters.

All of these limits come from one choice: the filter keeps bits and discards elements.

# Diagram and C# Implementation

> [!ABSTRACT]- Add and query over the bit array
>
> ```mermaid
> flowchart LR
>   X["element x"] --> H["h1..hk"]
>   H --> A["set / test bits i, j, l"]
>   A --> B["bit array (m bits)"]
>   B --> Q{"all k bits = 1?"}
>   Q -->|any 0| N["definitely absent"]
>   Q -->|all 1| M["possibly present"]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> using System;
> using System.Buffers.Binary;
> using System.Collections;
> using System.Collections.Generic;
> using System.Security.Cryptography;
> using System.Text;
>
> public sealed class BloomFilter
> {
>     private readonly BitArray _bits;
>     private readonly int _k;
>
>     public BloomFilter(int sizeBits, int hashCount)
>     {
>         ArgumentOutOfRangeException.ThrowIfNegativeOrZero(sizeBits);
>         ArgumentOutOfRangeException.ThrowIfNegativeOrZero(hashCount);
>         _bits = new BitArray(sizeBits);
>         _k = hashCount;
>     }
>
>     public void Add(string item)
>     {
>         foreach (var index in Positions(item))
>         {
>             _bits[index] = true;
>         }
>     }
>
>     public bool MightContain(string item)
>     {
>         foreach (var index in Positions(item))
>         {
>             if (!_bits[index])
>             {
>                 return false; // a 0 bit proves the element was never added
>             }
>         }
>
>         return true; // all k bits set: possibly present, possibly a false positive
>     }
>
>     // Kirsch–Mitzenmacher double hashing from distinct parts of one stable digest.
>     private IEnumerable<int> Positions(string item)
>     {
>         ArgumentNullException.ThrowIfNull(item);
>         var digest = SHA256.HashData(Encoding.UTF8.GetBytes(item));
>         var h1 = BinaryPrimitives.ReadUInt64LittleEndian(digest);
>         var h2 = BinaryPrimitives.ReadUInt64LittleEndian(digest.AsSpan(16));
>         var step = _bits.Length == 1
>             ? 0UL
>             : 1UL + h2 % (ulong)(_bits.Length - 1);
>         for (var i = 0; i < _k; i++)
>         {
>             var combined = unchecked(h1 + (ulong)i * step);
>             yield return (int)(combined % (ulong)_bits.Length);
>         }
>     }
> }
> ```
>
> `MightContain` does not mutate state. `Add` only ever sets bits. There is no `Remove` — the counting-filter variant would replace `BitArray` with a counter array and reject unbalanced removal, overflow, and underflow.

# References

- [Space/time trade-offs in hash coding with allowable errors (Bloom, 1970)](https://dl.acm.org/doi/10.1145/362686.362692)
- [Less hashing, same performance (Kirsch & Mitzenmacher)](https://www.eecs.harvard.edu/~michaelm/postscripts/rsa2008.pdf)
