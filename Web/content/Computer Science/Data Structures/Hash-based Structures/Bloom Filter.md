---
publish: true
created: 2026-07-29T14:28:24.646Z
modified: 2026-07-29T14:28:24.646Z
published: 2026-07-29T14:28:24.646Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A probabilistic membership filter using fixed bits, with tunable false positives but never false negatives.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A service checks whether a key exists before running an expensive lookup — a disk read, a database round trip, a network call. Most of those keys are absent, so most of the expensive work is wasted. Holding the full key set in a [[Computer Science/Data Structures/Hash-based Structures/Hash Set|Hash Set]] answers the question exactly but costs storage proportional to the keys themselves, which is the memory the caller was trying to avoid touching.

A Bloom filter keeps only an _m_-bit array and _k_ hash-derived positions. Adding an element sets the _k_ bits `h₁(x)..hₖ(x)` to 1; querying an element reports "possibly present" only if all _k_ of those bits are 1, and "definitely absent" the moment any one of them is 0. The elements themselves are never stored — the structure discards identity and retains a fixed-width fingerprint of the whole set. That discard is what makes it small, and it is also why the filter cannot enumerate its members, return a stored value, or (in the standard form) delete. Two distinct elements can set overlapping bits, so a query can report "possibly present" for something never added: a false positive. A 0 bit, by contrast, can only exist for an element that was never added, so a false negative is impossible.

**Core shape:** elements → _k_ hash bits set in an _m_-bit array → all-ones means probably present, any-zero means definitely absent → `O(m)` bits, no elements retained.

```steptrace
{"algorithm":"bloom-filter"}
```

# Representation and Invariants

The stored state is a single bit array of length _m_ and a family of _k_ hash functions, each mapping an element to an index in `[0, m)`. Nothing else persists — no keys, no counts, no insertion order.

- `Add(x)` computes `h₁(x)..hₖ(x)` and sets each of those _k_ bits to 1. Bits already at 1 stay at 1; the operation only ever turns bits on.
- `Query(x)` computes the same _k_ positions and returns "possibly present" when every one of them is 1. If any position holds 0, `x` was never added, and the answer "definitely absent" is exact.

Three properties follow directly from the fact that bits are only ever set, never cleared, and are shared across elements:

1. Every bit that a present element touched is 1, so a present element always passes its query. False negatives cannot occur.
2. A bit reaching 1 records that _some_ element hashed to it, not _which_ element. Once several elements have been added, a queried element can find all _k_ of its bits already set by unrelated elements. That is the false positive, and it is intrinsic to storing overlapping fingerprints rather than the elements.
3. Because no bit belongs to a single element, no operation can safely undo an insertion — clearing a bit for one element could clear a bit another present element depends on, which would manufacture a false negative.

The representative state is therefore a compressed image of set membership, not the set. Identity, multiplicity, and order are gone the moment an element is folded into the bits.

# Complexity

| Operation | Best time | Average time | Worst time | Structure space | Aux space per op |
| --- | --- | --- | --- | --- | --- |
| Construct empty filter | `Θ(m)` bits cleared | `Θ(m)` | `Θ(m)` | `Θ(m)` bits | `O(1)` |
| `Add(x)` | `O(\|x\| + k)` | `O(\|x\| + k)` | `O(\|x\| + k)` | — | `O(\|x\|)` in the example |
| `Query(x)` | `O(\|x\| + 1)` first 0 bit | `O(\|x\| + k)` | `O(\|x\| + k)` | — | `O(\|x\|)` in the example |

For strings, computing the base hashes costs `O(|x|)` and deriving or testing the _k_ positions costs `O(k)`, so `Add` and `Query` are `O(|x| + k)`. Once the input is fixed-width or two base hashes are already available in `O(1)`, the operations are `O(k)`. The C# example materialises UTF-8 bytes before hashing, so its auxiliary space is `O(|x|)`; a streaming hash can reduce that to `O(1)`. Their cost is independent of how many elements the filter already holds. The structure space is `O(m)` **bits**, not `O(n)` elements: at a 1% target false-positive rate, 100 million keys require about 958.5 million bits, or 120 MB (114 MiB), far below the cost of storing 100 million strings in a hash set. A query can also short-circuit on the first 0 bit, so a "definitely absent" answer often reads fewer than _k_ positions.

The price of that space is a tunable false-positive rate. After _n_ insertions into _m_ bits with _k_ hashes, the probability that a never-added element reports "possibly present" is approximately:

```text
p ≈ (1 − e^(−kn/m))^k
```

For a fixed ratio `m/n`, that expression is minimised by:

```text
k = (m/n) · ln 2
```

which drives roughly half the bits to 1. Increasing _m_ lowers _p_ by giving elements more room; _k_ trades off between too few probes (weak discrimination) and too many (bits fill faster). These bits are the filter's whole footprint — there is no per-element allocation to grow alongside _n_.

# When the Structure Stops Fitting

Deletion is the hard boundary. The standard filter cannot remove an element, because no bit is owned by a single element; clearing the bits for one key can strip a bit that another present key relies on, and the next query for that key would return "definitely absent" — a false negative the structure is defined never to produce. A **counting Bloom filter** replaces each bit with a small counter that increments on add and decrements on remove, which supports deletion at several times the space of a plain bit array — but only when each removal corresponds to a known insertion and adds/removes remain balanced. Removing an absent element or decrementing at zero corrupts shared counts; overflow or saturation can lose increments and produce a later false negative after decrements, so implementations must reject underflow/overflow or use counters wide enough for the expected load.

Counting and enumeration are unavailable for the same reason. The filter holds no elements, so it cannot list what it contains, and it holds no per-element counts, so it cannot report multiplicity. A "possibly present" answer names no element; it only licenses the authoritative lookup that does.

Over-filling degrades the guarantee gradually rather than failing loudly. The rate `p ≈ (1 − e^(−kn/m))^k` was fixed for a design capacity _n_; pushing past it drives more bits to 1, and "possibly present" trends toward "always present" until the filter stops eliminating any work. Sizing _m_ and _k_ for the real peak _n_ keeps _p_ at its target; a **scalable Bloom filter** instead chains larger filters as capacity is exceeded.

Every one of these boundaries traces back to the same design choice: no elements are stored. The filter answers membership cheaply precisely because it threw away everything except the bits.

# Reference Drawer

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
> `MightContain` does not mutate state; `Add` only ever sets bits. There is no `Remove` — the counting-filter variant would replace `BitArray` with a counter array and reject unbalanced removal, overflow, and underflow.

# Questions

> [!QUESTION]- Why can a Bloom filter produce false positives but never false negatives?
> `Add` only ever sets bits to 1 and never clears them, so every bit a present element touched is still 1 and that element always passes its query — no false negatives. A queried element's _k_ bits can all have been set to 1 by other elements, though, which makes a never-added element report "possibly present": a false positive.

> [!QUESTION]- Why does the standard filter forbid deletion, and what changes to allow it?
> No bit belongs to a single element; bits are shared across everything that hashed to them. Clearing an element's bits could clear one another present element depends on, turning its next query into a false "definitely absent". A counting Bloom filter stores a small counter per slot instead of one bit, so a remove decrements rather than clears, at several times the space. Removal is safe only for known inserted elements with balanced adds/removes; underflow corrupts the counts, while overflow or saturation can lose increments and later produce false negatives.

> [!QUESTION]- What do _m_ and _k_ control, and what is the optimal _k_?
> _m_ is the bit-array size and _k_ the number of hash functions. The false-positive rate is `p ≈ (1 − e^(−kn/m))^k` for _n_ inserted elements. For a fixed `m/n`, `k = (m/n)·ln 2` minimises _p_, driving about half the bits to 1; larger _m_ lowers _p_ by adding room, while _k_ balances too few probes against filling the bits too fast.

> [!QUESTION]- Why is the space `O(m)` bits rather than `O(n)`?
> The filter stores no elements — only the _m_-bit array and hash configuration. Its footprint is fixed at construction: sizing for 100 million keys at a 1% false-positive target takes about 958.5 million bits, or 120 MB (114 MiB). The cost of discarding the keys is the false-positive rate and the loss of enumeration, retrieval, and standard deletion.

# References

- [Space/time trade-offs in hash coding with allowable errors (Bloom, 1970)](https://dl.acm.org/doi/10.1145/362686.362692) — the original paper introducing the bit-array membership filter and its error trade-off.
- [Bloom filter (Wikipedia)](https://en.wikipedia.org/wiki/Bloom_filter) — derivation of the false-positive formula, the optimal _k_, and the counting and scalable variants.
- [Less hashing, same performance (Kirsch & Mitzenmacher)](https://www.eecs.harvard.edu/~michaelm/postscripts/rsa2008.pdf) — the double-hashing construction used to derive _k_ indices from two base hashes.
- [Cuckoo filter: practically better than Bloom (Fan et al.)](https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf) — a deletable filter that can use less space at moderate false-positive targets in lookup-heavy workloads; the advantage depends on load factor, target rate, and insertion behavior.
