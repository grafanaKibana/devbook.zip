---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A sorted array holds ten million evenly spaced sensor readings, and one reading must be located by value. [[Binary Search]] reaches it in about 24 probes by halving the range each time, ignoring one fact the data offers: when values are spread evenly across their range, the target's *value* predicts its *index*. A reading whose value sits 95% of the way between the smallest and largest one almost certainly sits about 95% of the way through the array.

Interpolation Search probes at that predicted position instead of the middle. Given the current bounds `lo` and `hi`, it maps the target's value-offset into an index:

`pos = lo + (target - a[lo]) * (hi - lo) / (a[hi] - a[lo])`

To find `950` in `[0 … 1000]` it probes near index `95%`, not `50%` — the same instinct that opens a phone book near the back to find "Smith". The comparison then narrows the range exactly as Binary Search does. On uniformly distributed data each probe removes far more than half of the candidates, reaching `O(log log n)` — roughly 5 probes over a billion elements against Binary Search's 30. That speed is a bet on the distribution: when values are skewed, the estimate points to the wrong region and the same loop degrades to `O(n)`, below Binary Search's guaranteed `O(log n)`.

**Core condition:** sorted, uniformly distributed numeric input → a value predicts its index → `O(log log n)` average probes with `O(1)` auxiliary space, collapsing to `O(n)` once the distribution is uneven.

The distinguishing step is where the first probe lands.

> [!NOTE] Visualization pending
> Planned StepTrace: a search card probing at a position estimated from the target's value relative to the range endpoints — linear interpolation, not the midpoint — then narrowing the range. No matching renderer exists in `engine.js` yet.

## Why the range collapses faster

At the start of every loop the target, if present, lies in `[a[lo], a[hi]]` — the same invariant Binary Search maintains. Interpolation Search adds an assumption about *where* inside that range it lies. The formula treats the values between `a[lo]` and `a[hi]` as points on a straight line against their indices: the fraction `(target - a[lo]) / (a[hi] - a[lo])` of the value span maps to that same fraction of the index span. When the data actually follows that line, the probe lands on or beside the target's true index, and even a miss leaves a sub-range far smaller than half.

The comparison that follows is identical to Binary Search. `a[pos] < target` proves indices `lo … pos` are too small, so `lo` moves to `pos + 1`; `a[pos] > target` moves `hi` to `pos - 1`. The loop also guards `a[lo] <= target <= a[hi]`, so a target that falls outside the current value window exits immediately rather than interpolating into an empty region.

The `O(log log n)` bound follows from what each probe removes on uniform data: it reduces the candidate count to roughly its *square root* rather than its half. Repeated square-root reduction of `n` reaches one candidate in about `log log n` steps. The iterative form stores only `lo`, `hi`, and `pos`, so auxiliary space stays `O(1)`.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(1)` | `O(1)` | The first interpolated probe equals the target. |
| Average | `O(log log n)` | `O(1)` | Under the uniform-distribution assumption: each probe shrinks the candidate set to about its square root. |
| Worst | `O(n)` | `O(1)` | Skewed or adversarial values push every estimate toward a boundary, so the range advances by roughly one element per probe. |

The average bound is inseparable from its assumption: on keys that are not close to uniform, the same code exhibits the worst-case row. Binary Search's `O(log n)` carries no such condition, which is the trade Interpolation Search makes for its faster average.

## When the distribution stops cooperating

Non-uniform data destroys the analysis rather than merely slowing it. Feed exponentially growing values `1, 2, 4, 8, …, 2^k`: the single largest element dwarfs the rest of the span, so `a[hi] - a[lo]` is essentially `a[hi]` alone. When one endpoint value dwarfs the rest of the span like this, any target that is only a small fraction of that maximum makes `(target - a[lo]) / (a[hi] - a[lo])` near zero, so every estimate collapses toward `lo` and the boundary advances by about one element per probe. Such a target sits deep in the array by index — around `n − Θ(log n)`, since the values only reach a small fraction of the maximum near the very end — so crawling out to its true position costs `O(n)` probes, slower than the `O(log n)` Binary Search that was given up. Clustered timestamps and Zipfian frequency tables produce the same collapse for the same reason.

The probe also requires keys with meaningful arithmetic. `(target - a[lo]) * (hi - lo) / (a[hi] - a[lo])` needs subtraction and a ratio, not just an ordering. Strings under a custom comparator, GUIDs, or opaque records support comparison but not a numeric offset, so the position cannot be estimated at all; those inputs are restricted to comparison-based search such as Binary Search.

The denominator fails when `a[hi] == a[lo]`. A run of equal values, or a range that has collapsed to one element, makes the value span zero. Unguarded, the division throws or yields an out-of-range index that reads arbitrary memory positions. Detecting the flat block and resolving it with a direct equality check keeps the loop valid — the same category of defensive guard as computing a midpoint that cannot overflow.

## Reference drawer

> [!ABSTRACT]- Control flow
> ```mermaid
> flowchart TD
>   A[Sorted array and target] --> B{lo not past hi and target within value range}
>   B -->|No| Z[Target is absent]
>   B -->|Yes| C{value at hi equals value at lo}
>   C -->|Yes| D[Flat block: compare directly]
>   C -->|No| E[Estimate pos by linear interpolation]
>   E --> F{value at pos equals target}
>   F -->|Yes| Y[Return pos]
>   F -->|No| G{value at pos less than target}
>   G -->|Yes| H[Move lo past pos]
>   G -->|No| I[Move hi before pos]
>   H --> B
>   I --> B
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> public static int InterpolationSearch(int[] values, int target)
> {
>     var lo = 0;
>     var hi = values.Length - 1;
>
>     while (lo <= hi && target >= values[lo] && target <= values[hi])
>     {
>         // Flat block: the interpolation denominator would be zero.
>         if (values[hi] == values[lo])
>         {
>             return values[lo] == target ? lo : -1;
>         }
>
>         // Widen an operand to long before subtracting and multiplying, so
>         // neither the value difference nor the product overflows 32-bit int.
>         var span = ((long)target - values[lo]) * (hi - lo);
>         var pos = lo + (int)(span / (values[hi] - values[lo]));
>
>         if (values[pos] == target)
>         {
>             return pos;
>         }
>
>         if (values[pos] < target)
>         {
>             lo = pos + 1;
>         }
>         else
>         {
>             hi = pos - 1;
>         }
>     }
>
>     return -1;
> }
> ```
>
> The `target >= values[lo] && target <= values[hi]` guard doubles as the absence check: once the target leaves the range's value window, no interpolated position can be valid.

## Comparison

| Strategy | Lookup time | Required input | Stronger case | Weaker case |
| --- | --- | --- | --- | --- |
| Interpolation Search | `O(log log n)` avg, `O(n)` worst | Sorted, uniformly distributed, numeric | Large uniformly distributed numeric arrays | Skewed distributions or non-numeric keys |
| [[Binary Search]] | `O(log n)` | Sorted, indexable | Any sorted input regardless of distribution | Very small inputs where a scan is simpler |
| [[Exponential Search]] | `O(log i)`, `i` = target index | Sorted; unknown or unbounded length | Target near the front of a streamed or unbounded sequence | Target deep in the array, where it reduces to `O(log n)` anyway |
| [[Jump Search]] | `O(√n)` | Sorted, block-steppable | Media where stepping forward is cheap but seeking back is costly | Random-access arrays, where `O(log n)` search dominates |

Interpolation Search is the strongest option on large numeric arrays that are provably close to uniform: `O(log log n)` genuinely beats `O(log n)` there. Binary Search is the safer default whenever the distribution is unknown or skewed, because its `O(log n)` holds regardless of how values are spaced. Exponential Search wins when the length is unknown and the target is likely near the front; Jump Search fits sequential media where a logarithmic pattern of backward seeks would cost more than `√n` forward steps.

## Questions

> [!QUESTION]- Why does Interpolation Search beat Binary Search only on uniform data?
> The interpolated probe assumes value grows linearly with index. On uniform data that model is accurate, so each probe lands near the target and shrinks the candidate set to about its square root, giving `O(log log n)`. When the gaps between values are uneven the estimate is consistently off, the range barely shrinks, and the cost rises to `O(n)` — below the `O(log n)` of the Binary Search it replaced.

> [!QUESTION]- What property of a value distribution forces the linear worst case?
> A single endpoint value that dwarfs the rest of the span — as with exponentially growing keys, clustered timestamps, or Zipfian counts. Once the maximum is far larger than most values, any target that is only a small fraction of that maximum interpolates to a position near `lo`, so each estimate advances the boundary by about one element instead of shrinking the range geometrically, and isolating the target costs `O(n)`.

> [!QUESTION]- Why can it not run on arbitrary comparable keys?
> The probe computes `(target - a[lo]) * (hi - lo) / (a[hi] - a[lo])`, which needs subtraction and a ratio with numeric meaning. Ordering-only types such as strings under a custom comparator support comparison but not that arithmetic, so no position can be estimated and only comparison-based search applies.

## References

- [Interpolation search](https://en.wikipedia.org/wiki/Interpolation_search) — the estimate formula, the `O(log log n)` analysis, and the uniformity precondition behind it.
- [Perl, Itai & Avni, "Interpolation search — a log log N search" (CACM, 1978)](https://dl.acm.org/doi/10.1145/359545.359557) — the primary source proving the `O(log log n)` expected-probe bound on uniformly distributed keys.
