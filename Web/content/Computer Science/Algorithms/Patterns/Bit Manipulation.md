---
publish: true
created: 2026-07-12T06:27:34.384Z
modified: 2026-07-12T06:27:34.384Z
published: 2026-07-12T06:27:34.384Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Operates on integers' binary representation, using bitmasks to model sets, flags, and subsets in O(1).
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

An integer is a fixed-width array of bits — 32 for `int`, 64 for `long`. Any question phrased over those bits (how many are set, which is the lowest, whether a value belongs to a universe of at most 64 items) can be answered by looping bit by bit, or by acting on the whole word at once. AND, OR, XOR, NOT, and the two shifts each transform every bit in a single CPU instruction, and a handful of algebraic identities collapse a per-bit loop into one expression. That is the trade: a bit-by-bit scan becomes an `O(1)` mask, a subset of a small universe becomes one machine word, and counting the set bits costs `O(number of set bits)` instead of `O(word width)`.

**Core shape:** fixed-width binary word → `& | ^ ~` and shifts act on all bits per instruction → identities like `n & (n-1)` and `n & -n` turn per-bit loops into `O(popcount)` or `O(1)` work.

## One count

The trace runs Brian Kernighan's population count on `44` (`00101100`) in an 8-bit word.

```steptrace
{"algorithm":"kernighan-popcount","value":44,"width":8}
```

Each pass computes `n & (n - 1)`. Subtracting 1 from `n` flips its lowest set bit to 0 and turns every zero below it into a 1 — the borrow propagates up the trailing zeros until it consumes that lowest one. AND-ing `n` with the result keeps every bit above the lowest one untouched and clears the lowest one along with the zeros beneath it, so exactly one set bit disappears per iteration. The loop therefore runs once per set bit: three iterations for `44`, not the eight a bit-by-bit scan of the word would take. When `n` reaches 0 no set bits remain and the count is final.

## Operators and identities

Five operators do the work: `&` (AND), `|` (OR), `^` (XOR), `~` (NOT), and the shifts `<<` / `>>`. A single bit is addressed through a one-hot mask `1 << k`, which has bit `k` set and every other bit clear:

| Operation on bit `k` | Expression |
| --- | --- |
| Test | `(n >> k) & 1` |
| Set | `n \| (1 << k)` |
| Clear | `n & ~(1 << k)` |
| Toggle | `n ^ (1 << k)` |

Three identities carry most of the weight beyond masking:

- `n & (n - 1)` clears the lowest set bit — the borrow argument from the trace. Iterating it visits each set bit once, and `n > 0 && (n & (n - 1)) == 0` tests for an exact power of two.
- `n & -n` isolates the lowest set bit as a value. In two's-complement `-n == ~n + 1`, which flips every bit above the lowest set bit while reproducing that bit and its trailing zeros; AND with `n` keeps only that bit. This is how a Fenwick tree walks index ranges and how the least-significant set bit is extracted.
- XOR is its own inverse: `a ^ a == 0` and `a ^ 0 == a`. XOR-ing a whole array cancels every value that appears an even number of times, leaving the one unpaired value; the same property swaps two variables with no temporary.

A machine word doubles as a set over a universe of at most 64 elements: bit `i` records membership of element `i`, union is `|`, intersection is `&`, difference is `a & ~b`, and `1 << n` counts the subsets of an `n`-element set. That representation is the state in bitmask [[Dynamic Programming]], where "which of these `n` items are already used" is a single integer.

## Complexity

Every operator — AND, OR, XOR, NOT, shift, `n & (n-1)`, `n & -n` — is a single instruction on a fixed-width word, so each is `O(1)` regardless of the operand. What varies is an algorithm built on top of them. Kernighan's popcount depends on the number of set bits, not the word width `w`:

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(1)` | `O(1)` | `n == 0`; the loop body never runs. |
| Typical | `O(popcount(n))` | `O(1)` | Each `n & (n-1)` clears exactly one set bit, so iterations equal set bits. |
| Worst | `O(w)` | `O(1)` | All `w` bits are set, so every position costs an iteration. |

A naive scan tests all `w` positions unconditionally — `O(w)` in every case. A precomputed lookup table answers a byte or nibble in a constant number of table reads (`O(w/8)` for a full word) at the cost of the table's memory. The hardware `POPCNT` instruction, exposed as `System.Numerics.BitOperations.PopCount`, is a single `O(1)` instruction on CPUs that support it.

## Where the representation bites

Right shift is not one operation. On a signed type C#'s `>>` is arithmetic: it copies the sign bit into the vacated high positions, so `-8 >> 1 == -4`, preserving sign. The logical shift that zero-fills is `>>>` (C# 11) or `>>` on an unsigned type. Java splits the same way — `>>` arithmetic, `>>>` logical — while C leaves right-shift of a negative value implementation-defined. Choosing the arithmetic shift where a zero-fill was intended leaves spurious 1s in the high bits whenever the sign bit is set.

Shifting by at least the type width has no portable result. C# masks the shift count to the low bits of the width, so `1 << 32` on an `int` shifts by `32 & 31 == 0` and yields `1`, not `0`; C and C++ call the same expression undefined behavior. A subset-DP loop that shifts by exactly `n` at the boundary is where this usually surfaces.

`n & -n` depends on two's-complement negation. It isolates the lowest set bit only because `-n` is `~n + 1`; under a sign-magnitude representation the identity fails outright. The neighbouring trap is widening: assigning a negative `int` to a `long` sign-extends, filling the new high bits with the sign, so a value treated as a 32-bit mask silently grows 32 leading ones. Widening through an unsigned type (`(uint)x`) zero-extends instead and keeps the mask intact.

## Reference drawer

> [!ABSTRACT]- Kernighan's popcount loop
>
> ```mermaid
> flowchart TD
>   A[count = 0] --> B{n != 0}
>   B -->|No| Z[return count]
>   B -->|Yes| C["n = n & (n - 1)"]
>   C --> D[count = count + 1]
>   D --> B
> ```

> [!EXAMPLE]- C# implementations
>
> ```csharp
> // Population count: one iteration per set bit
> public static int PopCount(uint n)
> {
>     int count = 0;
>     while (n != 0)
>     {
>         n &= n - 1;   // clear the lowest set bit
>         count++;
>     }
>     return count;
> }
>
> // Prefer the hardware intrinsic where available
> int bits = System.Numerics.BitOperations.PopCount(n);
>
> // The one unpaired value; every other value appears an even number of times
> public static int SingleNumber(int[] nums)
> {
>     int acc = 0;
>     foreach (var n in nums) acc ^= n;   // pairs cancel to 0
>     return acc;
> }
>
> // Enumerate every subset of an n-element universe
> for (int mask = 0; mask < (1 << n); mask++)
>     for (int i = 0; i < n; i++)
>         if ((mask & (1 << i)) != 0) { /* element i is in this subset */ }
> ```
>
> `BitOperations` (`PopCount`, `LeadingZeroCount`, `TrailingZeroCount`) compiles to a single CPU instruction where the hardware supports it and a software routine otherwise.

## Comparison

Four ways to count the set bits in a word, from the identity to the silicon:

| Method | Time | Extra cost | Stronger case | Weaker case |
| --- | --- | --- | --- | --- |
| Naive bit scan | `O(w)` always | None | Fully portable, no assumptions | Every call pays the full word width |
| Kernighan `n & (n-1)` | `O(popcount(n))` | None | Sparse words with few set bits | Dense words approach `O(w)` |
| Lookup table (byte/nibble) | `O(w/8)` reads | Precomputed table in memory | Many counts amortizing the table | Cache pressure; table must stay hot |
| `BitOperations.PopCount` | `O(1)` instruction | Needs CPU `POPCNT` support | Any hot path on modern x86/ARM | Absent hardware → software fallback |

The hardware intrinsic wins wherever the CPU exposes `POPCNT`, and `.NET` falls back to a software routine when it does not, which makes it the default for a set-bit count. Kernighan's loop is the best portable choice when set bits are sparse; a lookup table pays off only when it stays cache-resident and the intrinsic is unavailable.

Counting bits is the narrow contest. The identities themselves are not optimizations waiting for a library call to replace them: XOR cancellation, `1 << k` masking, and `n & -n` are the correct — often the only — expression of "the unpaired value", "toggle this flag", or "the lowest active bit". They are load-bearing in low-level and embedded code with no room for a container, and in bitmask [[Dynamic Programming]], where the entire state is one integer.

## Questions

> [!QUESTION]- Why does `n & (n - 1)` clear only the lowest set bit?
> Subtracting 1 borrows through the trailing zeros and flips the lowest set bit to 0, leaving every higher bit unchanged; the two values differ exactly in that bit and the zeros beneath it. AND keeps the shared high bits and clears the low region. Iterating it touches each set bit once, so Kernighan's popcount runs in `O(number of set bits)`.

> [!QUESTION]- Why does XOR-ing an entire array isolate a single unpaired value?
> XOR is commutative and self-inverse: `a ^ a == 0` and `a ^ 0 == a`. Every value appearing an even number of times cancels to 0 regardless of order, so the accumulator ends holding only the value with no partner — `O(n)` time, `O(1)` space, no auxiliary set.

> [!QUESTION]- What distinguishes an arithmetic right shift from a logical one, and when does the choice matter?
> An arithmetic shift copies the sign bit into the vacated high positions (`>>` on signed types in C# and Java), so `-8 >> 1 == -4`. A logical shift zero-fills (`>>>`, or `>>` on unsigned types). The difference only shows on values with the high bit set; using the arithmetic shift where zero-fill was intended leaves stray 1s in the high bits.

> [!QUESTION]- Why does `n & -n` isolate the lowest set bit only under two's-complement?
> `-n` is computed as `~n + 1`, which inverts every bit above the lowest set bit while reproducing that bit and its trailing zeros; AND with `n` keeps just that bit. The identity is a property of two's-complement negation and does not hold under a sign-magnitude representation.

## References

- [`BitOperations` class (.NET)](https://learn.microsoft.com/en-us/dotnet/api/system.numerics.bitoperations) — official contract for `PopCount`, `LeadingZeroCount`, and `TrailingZeroCount`, including the hardware-intrinsic-or-software-fallback guarantee.
- [Bit manipulation (cp-algorithms)](https://cp-algorithms.com/algebra/bit-manipulation.html) — derivations of `n & (n-1)`, `n & -n`, popcount, and subset enumeration.
- [Bit Twiddling Hacks (Sean Eron Anderson)](https://graphics.stanford.edu/~seander/bithacks.html) — reference catalogue of branch-free bit operations, including several popcount constructions.
