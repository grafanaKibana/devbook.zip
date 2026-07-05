---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Ready to Repeat
dg-publish: true
---

# Intro

Bit manipulation operates directly on the binary representation of integers, trading readability for speed and compactness. A 64-bit integer is a set of 64 booleans you can test, set, and combine in a single CPU instruction — so bitmasks model small sets, flags, and subsets with O(1) operations and near-zero memory. It shows up in flags/permissions enums, bitset-based DP over subsets, hashing, low-level protocols, and a family of clever O(1) tricks worth recognising.

## How It Works

The core operators (`&` AND, `|` OR, `^` XOR, `~` NOT, `<<`/`>>` shifts) compose into idioms:

| Goal | Expression |
|---|---|
| Test bit *i* | `(x >> i) & 1` |
| Set bit *i* | `x \| (1 << i)` |
| Clear bit *i* | `x & ~(1 << i)` |
| Toggle bit *i* | `x ^ (1 << i)` |
| Is power of two? | `x > 0 && (x & (x - 1)) == 0` |
| Clear lowest set bit | `x & (x - 1)` |
| Isolate lowest set bit | `x & (-x)` |
| Multiply / divide by 2ᵏ | `x << k` / `x >> k` |

Two recurring high-value facts: **`x & (x-1)` removes the lowest 1-bit** (basis of Brian Kernighan's bit-count and the power-of-two test), and **XOR is its own inverse** (`a ^ a == 0`, `a ^ 0 == a`), which makes it perfect for "find the unpaired element."

## Example

```csharp
// Count set bits — prefer the hardware intrinsic when available
int bits = System.Numerics.BitOperations.PopCount((uint)x);

// Find the one element that appears an odd number of times (all others in pairs)
public static int SingleNumber(int[] nums)
{
    int acc = 0;
    foreach (var n in nums) acc ^= n;   // pairs cancel to 0, the loner remains
    return acc;
}

// Iterate every subset of an n-element set via bitmask
for (int mask = 0; mask < (1 << n); mask++)
    for (int i = 0; i < n; i++)
        if ((mask & (1 << i)) != 0) { /* element i is in this subset */ }
```

In .NET, prefer `[Flags]` enums and `System.Numerics.BitOperations` (`PopCount`, `LeadingZeroCount`, `TrailingZeroCount`) over hand-rolled loops — they compile to single CPU instructions.

## Pitfalls

- **Signed shift surprises** — `>>` on a signed `int` is an *arithmetic* shift that copies the sign bit, so `-8 >> 1 == -4`, not a logical shift. Use unsigned types (`uint`/`ulong`) or `>>>` (C# 11 unsigned right shift) when you want zero-fill.
- **Shift count overflow / width** — `1 << 31` overflows a signed `int` into negative; for a 32-bit mask use `1u << 31`, and for ≥ 32 bits use `1L`/`1UL`. Shifting by ≥ the type width is undefined-ish (in C# the count is masked to the bit width), a frequent off-by-one in bitset DP.
- **Operator precedence** — `&`, `|`, `^` bind *looser* than `==` and `+`. `x & 1 == 0` parses as `x & (1 == 0)` and won't even compile against an int in C#; always parenthesise: `(x & 1) == 0`.
- **Readability cost** — clever bit tricks are write-once, read-never. Use them where they earn their keep (hot loops, flags, subset enumeration) and comment the intent; elsewhere a plain boolean or `HashSet` is clearer and just as fast.

## Tradeoffs

| Use case | Bitmask | Alternative | When to prefer the alternative |
|---|---|---|---|
| Small fixed set of flags | `[Flags]` enum / int mask | `HashSet`/`bool[]` | Larger or dynamic sets, or when clarity matters more than speed |
| Subset enumeration (n ≤ ~20) | `for mask in 0..2ⁿ` | Recursion/backtracking | Larger n (2ⁿ explodes); when you need pruning |
| Membership in 0..63 | single `ulong` | `BitArray` / `HashSet<int>` | Universe > 64 or sparse — use `BitArray` or a hash set |
| Fast popcount / log2 | `BitOperations` intrinsics | Manual loop | Never — the intrinsic is faster and clearer |

**Decision rule**: use bit manipulation for compact flag sets, membership over a tiny dense universe (≤ 64), and subset-DP. For larger or sparse sets reach for `BitArray`/`HashSet`; for anything where correctness clarity matters, don't out-clever yourself.

## Questions

> [!QUESTION]- Why does `x & (x - 1)` clear the lowest set bit, and what is it used for?
> Subtracting 1 flips the lowest set bit to 0 and turns all the zeros below it into ones; AND-ing with the original keeps everything above unchanged and wipes that low region. Repeatedly applying it visits exactly the set bits — Brian Kernighan's popcount runs in O(number of set bits). It also gives the one-liner power-of-two test (`(x & (x-1)) == 0`).

> [!QUESTION]- Why is XOR ideal for finding a single unpaired element?
> XOR is commutative and self-inverse: `a ^ a = 0` and `a ^ 0 = a`. XOR-ing every element together cancels each pair to 0, leaving only the element that has no partner — in O(n) time and O(1) space, with no hash set.

> [!QUESTION]- What's the difference between an arithmetic and a logical right shift?
> An arithmetic shift (`>>` on signed types) preserves the sign by copying the sign bit into the high positions, so negative numbers stay negative. A logical shift (`>>` on unsigned types, or `>>>` in C# 11) fills with zeros. Picking the wrong one corrupts results when the high bit is set.

## References

- [Bit manipulation (cp-algorithms)](https://cp-algorithms.com/algebra/bit-manipulation.html) — idioms, popcount, and subset enumeration with proofs.
- [BitOperations class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.numerics.bitoperations) — hardware-accelerated PopCount / leading/trailing zero count.
- [Bit Twiddling Hacks (Sean Eron Anderson)](https://graphics.stanford.edu/~seander/bithacks.html) — the classic catalogue of branch-free bit tricks.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/Algorithms/Algorithms|Algorithms]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Algorithms/Patterns/Sliding Window|Sliding Window]]
> - [[Software Engineering/02 Computer Science/Algorithms/Patterns/Two Pointers|Two Pointers]]
<!-- whats-next:end -->
