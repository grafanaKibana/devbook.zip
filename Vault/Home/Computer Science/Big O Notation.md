---
topic:
  - Computer Science
subtopic: []
summary: "Describes how time or space grows with input size by retaining the dominant term and ignoring constants."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

Big O notation describes how an algorithm's cost grows with its input, discarding machine-specific constants so competing approaches can be compared by growth rather than one benchmark on one machine.

Formally, `f(n) = O(g(n))` means `f` grows no faster than `g` beyond some input size. Constants `c` and `n₀` exist such that `f(n) ≤ c · g(n)` for all `n ≥ n₀`. Constant factors disappear (`3n + 100` is `O(n)`), as do lower-order terms (`n² + n` is `O(n²)`), because the fastest-growing term dominates as `n → ∞`. This makes scaling comparable across machines. Big O alone still cannot rank algorithms within the same class or distinguish a tight bound from a loose upper bound, and at `n = 20` the discarded constants may dominate.

The same notation measures time and space. **Time complexity** counts operations as a function of input size. **Space complexity** counts extra memory, including recursion frames that can overflow the call stack.

**Core idea:** cost as a function of `n`, keep only the dominant term, drop constants → a hardware-independent growth class that predicts behaviour at scale but not at small `n`.

# The growth classes, side by side

The complexity class is the shape of the curve. Every line begins at the visual origin, then the logarithmic vertical scale covers 1 to 10k operations over the bounded `n = 2…10` domain. Factorial is evaluated only through `10!`. Once a curve exceeds 10k it leaves the plot, which makes the exponential and factorial jumps visible instead of compressing every practical class against the baseline.

```complexity
{
  "version": 1,
  "mode": "catalogue",
  "title": "Growth of common complexity classes",
  "variables": {
    "n": "number of input elements"
  },
  "entries": [
    {
      "kind": "catalogue",
      "curveId": "constant"
    },
    {
      "kind": "catalogue",
      "curveId": "log-log-n"
    },
    {
      "kind": "catalogue",
      "curveId": "log-n"
    },
    {
      "kind": "catalogue",
      "curveId": "linear"
    },
    {
      "kind": "catalogue",
      "curveId": "n-log-n"
    },
    {
      "kind": "catalogue",
      "curveId": "quadratic"
    },
    {
      "kind": "catalogue",
      "curveId": "exponential"
    },
    {
      "kind": "catalogue",
      "curveId": "factorial"
    }
  ]
}
```

## Complexity catalogue

| Complexity | Growth | Typical example |
| --- | --- | --- |
| `O(1)` | Same time regardless of input size | Array indexing or a well-distributed hash lookup |
| `O(log log n)` | Shrinks faster than a fixed-factor split under a strong distribution assumption | [[Home/Computer Science/Algorithms/Search Algorithms/Interpolation Search|Interpolation search]] over uniformly distributed sorted keys |
| `O(log n)` | Halves the remaining problem each step | Binary search |
| `O(n)` | Processes each element once | Linear scan |
| `O(n log n)` | Performs linear work across logarithmic levels | Merge sort or expected randomized quicksort |
| `O(n²)` | Repeats linear work for each element | Bubble sort or brute-force pair checking |
| `O(2ⁿ)` | Doubles the state space with each new element | Exhaustive subset search |
| `O(n!)` | Visits every permutation | Exhaustive permutation search |

At `n = 10`, `n²` is 100, `2ⁿ` is 1,024, and `n!` is 3,628,800. Polynomial versus exponential growth is the conventional theoretical tractability boundary, not a guarantee of practical feasibility: an `O(2ⁿ)` [[Home/Computer Science/Algorithms/Paradigms/Backtracking|brute-force]] search usually becomes impractical in the dozens and an `O(n!)` permutation search in the low teens. The exact cutoff depends on the hardware, latency budget, and work done per state.

The chart's crossover understates the gap at real input sizes. Counting operations at a few scales makes it concrete:

| `n` | `log₂ n` | `n` | `n log₂ n` | `n²` | `2ⁿ` |
| --- | --- | --- | --- | --- | --- |
| 10 | ~3 | 10 | ~33 | 100 | ~1,000 |
| 100 | ~7 | 100 | ~664 | 10,000 | ~1.3 × 10³⁰ |
| 1,000 | ~10 | 1,000 | ~10⁴ | 10⁶ | ~10³⁰¹ |
| 1,000,000 | ~20 | 10⁶ | ~2 × 10⁷ | 10¹² | beyond astronomical |

At a million elements, `log₂ n` is still about 20 while `n²` is a trillion. No constant-factor tuning rescues an `n²` algorithm at that scale. Changing it to `n log n` cuts the operation count by roughly 50,000 times. The `2ⁿ` column passes 10³⁰ at `n = 100`, so an exponential bound is usually a signal to look for [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|dynamic programming]], a [[Home/Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy]] rule, or an approximation instead of a larger machine.

# Common DSA pattern complexities

The table uses `n` for processed elements, `k` for a retained subset or window size, `m` for the number of disjoint-set operations, `R` for the number of candidate answer values, and `C` for the cost of one feasibility check. `α(n)` is the inverse Ackermann function, which grows so slowly that it is effectively constant at practical sizes.

| Pattern | Time | Auxiliary space | Condition that makes the bound true |
| --- | --- | --- | --- |
| [[Home/Computer Science/Algorithms/Patterns/Sliding Window|Sliding Window]] | `O(n)` | `O(1)` to `O(k)` | Each element enters and leaves the window at most once. Stored window state determines the space bound. |
| [[Home/Computer Science/Algorithms/Patterns/Two Pointers|Two Pointers]] | `O(n)` after any preprocessing | `O(1)` | Coordinated pointers move monotonically. Sorting first adds `O(n log n)` time and may add space. |
| [[Home/Computer Science/Algorithms/Patterns/Prefix Sum|Prefix Sum]] | `O(n)` build, `O(1)` range query | `O(n)` | Static range sums. Updates invalidate the simple prefix array and require a different structure. |
| [[Home/Computer Science/Algorithms/Patterns/Top-K Elements|Top-K Elements]] | `O(n log k)` | `O(k)` | A size-`k` heap keeps only the current winners. Returning sorted output adds `O(k log k)`. |
| [[Home/Computer Science/Algorithms/Patterns/Two Heaps|Two Heaps]] | `O(log n)` insert, `O(1)` median | `O(n)` | Both halves are retained and rebalanced. Arbitrary deletion needs indexed heaps or lazy deletion. |
| [[Home/Computer Science/Algorithms/Patterns/Binary Search on Answer|Binary Search on Answer]] | `O(C log R)` | Predicate-dependent | Candidate answers are discrete and the feasibility predicate is monotonic. |
| [[Home/Computer Science/Data Structures/Graph Structures/Union-Find|Union-Find]] | `O(n + m α(n))` for initialization plus `m` operations | `O(n)` | Path compression and union by rank/size are both enabled. The bound is amortized over the sequence. |
| [[Home/Computer Science/Algorithms/Patterns/Monotonic Stack and Queue|Monotonic Stack or Queue]] | `O(n)` | `O(n)` worst case | Each element is pushed once and popped at most once, so individual pops amortize across the scan. |

# Common data-structure operations

`V` and `E` denote graph vertices and edges, `deg(v)` is the degree of vertex `v`, and `L` is key length for a trie. Average hash-table bounds assume a suitable hash function and controlled load factor. Amortized bounds describe a sequence of operations, not the worst cost of one call.

| Structure | Access / lookup | Insert | Remove | Explanation |
| --- | --- | --- | --- | --- |
| Static array | Index `O(1)`. Value search `O(n)` | At position `O(n)` | At position `O(n)` | Contiguous indexing is constant. Interior edits shift a suffix. |
| [[Home/Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic array]] | Index `O(1)`. Value search `O(n)` | Append `O(1)` amortized, `O(n)` worst. Interior `O(n)` | Last `O(1)`. Interior `O(n)` | Occasional capacity growth copies all elements, producing the append worst case. |
| [[Home/Computer Science/Data Structures/Linear Structures/LinkedList|Linked list]] | `O(n)` by index or value | `O(1)` around a held node. Otherwise `O(n)` to locate | `O(1)` with the required node/predecessor. Otherwise `O(n)` | Pointer rewiring is constant only after the edit location is already known. |
| [[Home/Computer Science/Data Structures/Linear Structures/Stack|Stack]] / [[Home/Computer Science/Data Structures/Linear Structures/Queue|queue]] | Peek `O(1)` | Push/enqueue `O(1)` amortized | Pop/dequeue `O(1)` amortized | Array-backed forms have an occasional `O(n)` resize. Linked forms allocate per node. |
| [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|Hash table or set]] | `O(1)` average, `O(n)` worst | `O(1)` average/amortized, `O(n)` worst | `O(1)` average, `O(n)` worst | Collisions and resize behavior create the worst cases. Hashing the key itself may cost `O(L)`. |
| Balanced binary search tree | `O(log n)` | `O(log n)` | `O(log n)` | Rebalancing keeps tree height logarithmic. An unbalanced BST can degrade to `O(n)`. |
| [[Home/Computer Science/Data Structures/Trees/Heap-like/Heap|Binary heap]] | Root `O(1)`. Arbitrary search `O(n)` | `O(log n)` | Root `O(log n)` | Heap order constrains parents, not a full search order. Bottom-up build is `O(n)`. |
| [[Home/Computer Science/Data Structures/Trees/Trie|Trie]] | `O(L)` | `O(L)` | `O(L)` | Cost follows key length rather than key count. Memory follows the total stored prefixes and branching representation. |
| [[Home/Computer Science/Data Structures/Graph Structures/Union-Find|Union-Find]] | Find `O(α(n))` amortized | Make-set `O(1)`. Union update/merge `O(α(n))` amortized | Unsupported | The inverse-Ackermann bound requires path compression and union by rank/size. A standard disjoint-set forest cannot split a set by removing an element. |
| Graph adjacency list | Edge lookup `O(deg(u))`. Neighbor scan `O(deg(u))` | Edge `O(1)` amortized | Edge `O(deg(u))` | Space is `O(V + E)`. Using a set per neighbor list changes expected edge lookup/update toward `O(1)` at extra overhead. |
| Graph adjacency matrix | Edge lookup `O(1)`. Neighbor scan `O(V)` | Edge `O(1)` | Edge `O(1)` | Space is `O(V²)`, which pays for constant-time edge membership. |

# Space complexity and the cases

Space includes the **call stack**. A recursive traversal that allocates `O(1)` heap memory may still use `O(h)` stack frames, where `h` is the recursion depth. A chain-shaped input 100k nodes deep can overflow a thread stack without allocating heap objects. Auxiliary space means memory beyond the input: merge sort uses `O(n)` for its merge buffer, naive recursive quicksort uses `O(log n)` expected and `O(n)` worst-case stack space, while an in-place scan uses `O(1)`.

A single algorithm has different bounds depending on the input, and the distinction is not pedantic:

- **Worst case** — the guarantee under adversarial or degenerate input. What an SLA or a security boundary is written against. A [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|hash-map]] lookup is `O(n)` worst case when every key collides.
- **Average case** — expected cost over a distribution of inputs. A [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|hash-map]] lookup is `O(1)` average, a bound commonly used for capacity planning.
- **Best case** — the floor. Usually uninteresting except to note it (a target found on the first probe is `O(1)`).
- **Amortised** — cost averaged over a *sequence* of operations, distinct from average case. [[Home/Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic-array]] append is `O(1)` amortised even though a single resize is `O(n)`, and [[Home/Computer Science/Data Structures/Graph Structures/Union-Find|union-find]] is `O(α(n))` amortised per operation — a guarantee over the whole sequence, not any one call.

Big O states an upper bound. **Big Θ** (theta) states a *tight* bound where the upper and lower bounds match: merge sort is `Θ(n log n)` in every case, while quicksort is `O(n²)` worst case and `Θ(n log n)` on average. **Big Ω** (omega) states a lower bound. Informal discussion often uses "O" for a tight bound, but Θ is the precise notation for matching asymptotic upper and lower bounds.

> [!EXAMPLE]- Reading complexity off the code (C#)
> ```csharp
> // O(n): one pass, work per element is O(1).
> long Sum(int[] a)
> {
>     long total = 0;
>     foreach (var x in a) total += x;   // n iterations × O(1)
>     return total;
> }
>
> // O(n²): a loop inside a loop, each O(n).
> bool HasDuplicate(int[] a)
> {
>     for (var i = 0; i < a.Length; i++)
>         for (var j = i + 1; j < a.Length; j++)   // ~n²/2 pairs → drop the ½ → O(n²)
>             if (a[i] == a[j]) return true;
>     return false;
> }
>
> // O(n): the same question, one pass, trading O(n) space for the second loop.
> bool HasDuplicateFast(int[] a)
> {
>     var seen = new HashSet<int>();      // O(n) auxiliary space
>     foreach (var x in a)
>         if (!seen.Add(x)) return true;  // O(1) average per element → O(n) total
>     return false;
> }
> ```
> `HasDuplicate` and `HasDuplicateFast` answer the same question. The second trades `O(n)` memory to drop time from `O(n²)` to `O(n)`. Reading a bound is mostly counting nested loops and multiplying by the per-iteration cost, then discarding constants and lower-order terms.

# Where Big O misleads

- **Constants matter at small `n`.** Big O drops them, so an `O(n log n)` algorithm with heavy setup can lose to an `O(n²)` one on small inputs. `Array.Sort` switches to insertion sort for small subarrays inside its `O(n log n)` introsort because the quadratic algorithm has a smaller constant on short partitions.
- **The hidden constant can be huge.** Two `O(n)` algorithms can differ 100× in wall-clock from cache behaviour, branch prediction, or allocation. Big O narrows the field. Profiling on representative data picks the winner within a class.
- **"`n`" must be defined.** For string work, is `n` the number of strings or their total length? A [[Home/Computer Science/Data Structures/Trees/Trie|trie]] lookup is `O(L)` in key length, independent of the `n` keys stored — stating the bound without naming the variable is meaningless.
- **The base of a logarithm is irrelevant.** `log₂ n` and `log₁₀ n` differ by a constant factor, which Big O drops, so `O(log n)` needs no base. Inside an exponent the base is decisive: `2ⁿ` and `3ⁿ` are different classes.

# Questions

> [!QUESTION]- Why does Big O drop constant factors and lower-order terms?
> Big O describes growth as `n → ∞`, where the fastest-growing term dominates. `n² + 100n + 500` is `O(n²)` because the quadratic term eventually outweighs the rest.

> [!QUESTION]- What is the difference between average-case and amortised complexity?
> Average-case complexity takes an expectation over a distribution of inputs. A hash lookup is `O(1)` average when keys spread across buckets. Amortised complexity spreads expensive operations across a sequence on one structure. Dynamic-array append is `O(1)` amortised because many cheap appends pay for the occasional `O(n)` resize.

# References

- [NIST Dictionary of Algorithms and Data Structures: big-O notation](https://xlinux.nist.gov/dads/HTML/bigOnotation.html)
