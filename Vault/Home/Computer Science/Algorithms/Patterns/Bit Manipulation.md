---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Operates on integers' binary representation, using bitmasks to model sets, flags, and small finite sets."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

An integer is a fixed-width array of bits — 32 for `int`, 64 for `long`. Any question phrased over those bits (how many are set, which is the lowest, whether a value belongs to a universe of at most 64 items) can be answered by looping bit by bit, or by acting on the whole word at once. AND, OR, XOR, NOT, and the two shifts each transform every bit in a single CPU instruction, and a handful of algebraic identities collapse a per-bit loop into one expression.



~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"kernighan-popcount","value":44,"width":8}
```



Each pass computes `n & (n - 1)`. Subtracting 1 from `n` flips its lowest set bit to 0 and turns every zero below it into a 1 — the borrow propagates up the trailing zeros until it consumes that lowest one. AND-ing `n` with the result keeps every bit above the lowest one untouched and clears the lowest one along with the zeros beneath it, so exactly one set bit disappears per iteration. The loop therefore runs once per set bit: three iterations for `44`, not the eight a bit-by-bit scan of the word would take. When `n` reaches 0 no set bits remain and the count is final.



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

A machine word doubles as a set over a universe of at most 64 elements: bit `i` records membership of element `i`, union is `|`, intersection is `&`, and difference is `a & ~b`. The signed-`int` subset loop below deliberately supports only `0 <= n <= 30`; within that bound, `1 << n` counts the subsets of an `n`-element set. That representation is the state in bitmask [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|Dynamic Programming]], where "which of these `n` items are already used" is a single integer.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Bit Manipulation complexity",
  "variables": {
    "wordSize": {
      "symbol": "w",
      "description": "machine-word width"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (scan bit by bit)",
          "formula": "O(w)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Bit manipulation (whole word)",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (scan bit by bit)",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "approach",
          "label": "Bit manipulation (whole word)",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```

~~~~~

# Where the Representation Bites

Right shift has two meanings. On a signed C# type, `>>` is arithmetic: it copies the sign bit into the vacated high positions, so `-8 >> 1 == -4`. A logical shift zero-fills instead. C# uses `>>>` (since C# 11), or `>>` on an unsigned type. Java makes the same distinction, while C leaves right-shifting a negative value implementation-defined. The difference appears as soon as the high bit is set.

Shift counts at or above the type width are another boundary. C# masks the count to the low bits of the width, so `1 << 32` on an `int` becomes a shift by `32 & 31 == 0` and yields `1`. In C and C++, the same expression has undefined behavior. A subset-DP loop that shifts by exactly `n` is a common place to hit this edge.

`n & -n` depends on two's-complement negation, where `-n` is `~n + 1`. A sign-magnitude representation would break the identity. Widening creates a related trap: converting a negative `int` to `long` sign-extends it, adding 32 leading ones to a value that may have been intended as a 32-bit mask. Converting through `(uint)x` zero-extends and keeps those high bits clear.

# Diagram and C# Implementation

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
> if ((uint)n > 30)
>     throw new ArgumentOutOfRangeException(nameof(n));
>
> for (int mask = 0; mask < (1 << n); mask++)
>     for (int i = 0; i < n; i++)
>         if ((mask & (1 << i)) != 0) { /* element i is in this subset */ }
> ```
> `BitOperations` (`PopCount`, `LeadingZeroCount`, `TrailingZeroCount`) compiles to a single CPU instruction where the hardware supports it and a software routine otherwise.

# Comparison

Four ways to count the set bits in a word, from the identity to the silicon:

| Method | Extra cost | Stronger case | Weaker case |
| --- | --- | --- | --- |
| Naive bit scan | None | Fully portable, no assumptions | Every call pays the full word width |
| Kernighan `n & (n-1)` | None | Sparse words with few set bits | Dense words visit most bit positions |
| Lookup table (byte/nibble) | Precomputed table in memory | Many counts that reuse the table | Cache pressure. Table must stay hot |
| `BitOperations.PopCount` | .NET runtime API | General-purpose set-bit counts | Runtime may use a software fallback |

`BitOperations.PopCount` is the default in .NET: the runtime uses a hardware intrinsic when one is available and otherwise falls back to software. Kernighan's loop remains useful when the identity itself matters or no suitable intrinsic exists. A lookup table earns its memory only when repeated counts keep it hot in cache.

Popcount is only one use. XOR cancellation expresses an unpaired value, `1 << k` addresses one flag, and `n & -n` isolates the lowest active bit. These identities also carry bitmask [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|Dynamic Programming]], where a single integer records the whole used-item set.

# References

- [`BitOperations` class (.NET)](https://learn.microsoft.com/en-us/dotnet/api/system.numerics.bitoperations)
- [Bit manipulation (cp-algorithms)](https://cp-algorithms.com/algebra/bit-manipulation.html)
