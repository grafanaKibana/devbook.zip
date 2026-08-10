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

Formally, `f(n) = O(g(n))` means `f` grows no faster than `g` beyond some input size — there exist constants `c` and `n₀` such that `f(n) ≤ c · g(n)` for all `n ≥ n₀`. The practical consequences are two deliberate erasures: **constant factors drop** (`3n + 100` is `O(n)`) and **lower-order terms drop** (`n² + n` is `O(n²)`), because as `n → ∞` only the fastest-growing term decides the outcome. That is the point and the limitation at once — Big O tells you which algorithm wins at scale, and tells you nothing about which wins at `n = 20`, where the discarded constants dominate.

The same notation measures two resources. **Time complexity** counts operations as a function of input size; **space complexity** counts extra memory, including the recursion stack, which is where an otherwise-fine algorithm quietly overflows.

**Core idea:** cost as a function of `n`, keep only the dominant term, drop constants → a hardware-independent growth class that predicts behaviour at scale but not at small `n`.

# The growth classes, side by side

The complexity class is the shape of the curve. Every line begins at the visual origin, then the logarithmic vertical scale covers 1 to 10k operations over the bounded `n = 2…10` domain. Factorial is evaluated only through `10!`; once a curve exceeds 10k it leaves the plot, which makes the exponential and factorial jumps visible instead of compressing every practical class against the baseline.

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
| `O(log n)` | Halves the remaining problem each step | Binary search |
| `O(n)` | Processes each element once | Linear scan |
| `O(n log n)` | Performs linear work across logarithmic levels | Merge sort or expected randomized quicksort |
| `O(n²)` | Repeats linear work for each element | Bubble sort or brute-force pair checking |
| `O(2ⁿ)` | Doubles the state space with each new element | Exhaustive subset search |
| `O(n!)` | Visits every permutation | Exhaustive permutation search |

At `n = 10`, `n²` is 100, `2ⁿ` is 1,024, and `n!` is 3,628,800. That is the practical boundary between "solvable for large inputs" (polynomial) and "solvable only for tiny inputs" (exponential and factorial); an `O(2ⁿ)` [[Home/Computer Science/Algorithms/Paradigms/Backtracking|brute-force]] search usually becomes impractical in the dozens and an `O(n!)` permutation search in the low teens. The exact cutoff depends on the hardware, latency budget, and work done per state.

# Why Big O Matters

| Benefit | Description |
| --- | --- |
| Predict Scalability | Understand how an algorithm will perform as the amount of data grows and prevent future bottlenecks. |
| Compare Algorithms | Make informed and objective decisions when choosing between multiple solutions to a problem. |
| Optimize Code | Identify inefficient parts of the codebase and focus optimization efforts where they matter most. |
| Improve Problem-Solving | Thinking in terms of complexity helps design more efficient algorithms from the beginning. |
| Prepare for Technical Interviews | Big O notation is a fundamental topic used to evaluate a candidate’s analytical and problem-solving skills. |
| Make Design Trade-offs | Evaluate time and space complexity when making implementation and system-design decisions. |

The chart's crossover understates the gap at real input sizes. Counting operations at a few scales makes it concrete:

| `n` | `log₂ n` | `n` | `n log₂ n` | `n²` | `2ⁿ` |
| --- | --- | --- | --- | --- | --- |
| 10 | ~3 | 10 | ~33 | 100 | ~1,000 |
| 100 | ~7 | 100 | ~664 | 10,000 | ~1.3 × 10³⁰ |
| 1,000 | ~10 | 1,000 | ~10⁴ | 10⁶ | ~10³⁰¹ |
| 1,000,000 | ~20 | 10⁶ | ~2 × 10⁷ | 10¹² | beyond astronomical |

At a million elements, the `log n` column is still 20 while `n²` is a trillion — the difference between a binary-search or balanced-tree lookup and a job that never finishes. This is the whole reason complexity class is the *first* thing to check: no amount of constant-factor tuning rescues an `n²` algorithm at `n = 10⁶`, but moving it to `n log n` does, by a factor of ~50,000. The `2ⁿ` column crossing 10³⁰ at `n = 100` is why exponential algorithms are a design signal to reach for [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|dynamic programming]], a [[Home/Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy]] rule, or an approximation, not a bigger machine.

# Common DSA pattern complexities

The table uses `n` for processed elements, `k` for a retained subset or window size, `m` for the number of disjoint-set operations, `R` for the number of candidate answer values, and `C` for the cost of one feasibility check. `α(n)` is the inverse Ackermann function, which grows so slowly that it is effectively constant at practical sizes.

| Pattern | Time | Auxiliary space | Condition that makes the bound true |
| --- | --- | --- | --- |
| [[Home/Computer Science/Algorithms/Patterns/Sliding Window|Sliding Window]] | `O(n)` | `O(1)` to `O(k)` | Each element enters and leaves the window at most once; stored window state determines the space bound. |
| [[Home/Computer Science/Algorithms/Patterns/Two Pointers|Two Pointers]] | `O(n)` after any preprocessing | `O(1)` | Coordinated pointers move monotonically; sorting first adds `O(n log n)` time and may add space. |
| [[Home/Computer Science/Algorithms/Patterns/Prefix Sum|Prefix Sum]] | `O(n)` build, `O(1)` range query | `O(n)` | Static range sums; updates invalidate the simple prefix array and require a different structure. |
| [[Home/Computer Science/Algorithms/Patterns/Top-K Elements|Top-K Elements]] | `O(n log k)` | `O(k)` | A size-`k` heap keeps only the current winners; returning sorted output adds `O(k log k)`. |
| [[Home/Computer Science/Algorithms/Patterns/Two Heaps|Two Heaps]] | `O(log n)` insert, `O(1)` median | `O(n)` | Both halves are retained and rebalanced; arbitrary deletion needs indexed heaps or lazy deletion. |
| [[Home/Computer Science/Algorithms/Patterns/Binary Search on Answer|Binary Search on Answer]] | `O(C log R)` | Predicate-dependent | Candidate answers are discrete and the feasibility predicate is monotonic. |
| [[Home/Computer Science/Data Structures/Graph Structures/Union-Find|Union-Find]] | `O(n + m α(n))` for initialization plus `m` operations | `O(n)` | Path compression and union by rank/size are both enabled; the bound is amortized over the sequence. |
| [[Home/Computer Science/Algorithms/Patterns/Monotonic Stack and Queue|Monotonic Stack or Queue]] | `O(n)` | `O(n)` worst case | Each element is pushed once and popped at most once, so individual pops amortize across the scan. |

# Common data-structure operations

`V` and `E` denote graph vertices and edges, `deg(v)` is the degree of vertex `v`, and `L` is key length for a trie. Average hash-table bounds assume a suitable hash function and controlled load factor. Amortized bounds describe a sequence of operations, not the worst cost of one call.

| Structure | Access / lookup | Insert | Remove | Explanation |
| --- | --- | --- | --- | --- |
| Static array | Index `O(1)`; value search `O(n)` | At position `O(n)` | At position `O(n)` | Contiguous indexing is constant; interior edits shift a suffix. |
| [[Home/Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic array]] | Index `O(1)`; value search `O(n)` | Append `O(1)` amortized, `O(n)` worst; interior `O(n)` | Last `O(1)`; interior `O(n)` | Occasional capacity growth copies all elements, producing the append worst case. |
| [[Home/Computer Science/Data Structures/Linear Structures/LinkedList|Linked list]] | `O(n)` by index or value | `O(1)` around a held node; otherwise `O(n)` to locate | `O(1)` with the required node/predecessor; otherwise `O(n)` | Pointer rewiring is constant only after the edit location is already known. |
| [[Home/Computer Science/Data Structures/Linear Structures/Stack|Stack]] / [[Home/Computer Science/Data Structures/Linear Structures/Queue|queue]] | Peek `O(1)` | Push/enqueue `O(1)` amortized | Pop/dequeue `O(1)` amortized | Array-backed forms have an occasional `O(n)` resize; linked forms allocate per node. |
| [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|Hash table or set]] | `O(1)` average, `O(n)` worst | `O(1)` average/amortized, `O(n)` worst | `O(1)` average, `O(n)` worst | Collisions and resize behavior create the worst cases; hashing the key itself may cost `O(L)`. |
| Balanced binary search tree | `O(log n)` | `O(log n)` | `O(log n)` | Rebalancing keeps tree height logarithmic; an unbalanced BST can degrade to `O(n)`. |
| [[Home/Computer Science/Data Structures/Trees/Heap-like/Heap|Binary heap]] | Root `O(1)`; arbitrary search `O(n)` | `O(log n)` | Root `O(log n)` | Heap order constrains parents, not a full search order; bottom-up build is `O(n)`. |
| [[Home/Computer Science/Data Structures/Trees/Trie|Trie]] | `O(L)` | `O(L)` | `O(L)` | Cost follows key length rather than key count; memory follows the total stored prefixes and branching representation. |
| [[Home/Computer Science/Data Structures/Graph Structures/Union-Find|Union-Find]] | Find `O(α(n))` amortized | Make-set `O(1)`; Union update/merge `O(α(n))` amortized | Unsupported | The inverse-Ackermann bound requires path compression and union by rank/size; a standard disjoint-set forest cannot split a set by removing an element. |
| Graph adjacency list | Edge lookup `O(deg(u))`; neighbor scan `O(deg(u))` | Edge `O(1)` amortized | Edge `O(deg(u))` | Space is `O(V + E)`; using a set per neighbor list changes expected edge lookup/update toward `O(1)` at extra overhead. |
| Graph adjacency matrix | Edge lookup `O(1)`; neighbor scan `O(V)` | Edge `O(1)` | Edge `O(1)` | Space is `O(V²)`, which pays for constant-time edge membership. |

# Space complexity and the cases

Space is measured the same way, and the term people forget is the **call stack**. A recursive traversal that looks `O(1)` in heap allocation is `O(h)` in stack frames, where `h` is the recursion depth — a chain-shaped input 100k deep can overflow the available thread stack even though it allocates nothing on the heap. Auxiliary space (extra memory beyond the input) is usually what's quoted: merge sort is `O(n)` auxiliary for its merge buffer, naive recursive quicksort is `O(log n)` expected and `O(n)` worst-case for its stack, and an in-place scan is `O(1)`.

A single algorithm has different bounds depending on the input, and the distinction is not pedantic:

- **Worst case** — the guarantee under adversarial or degenerate input. What an SLA or a security boundary is written against; a [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|hash-map]] lookup is `O(n)` worst case when every key collides.
- **Average case** — expected cost over a distribution of inputs. The [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|hash-map]] lookup is `O(1)` average, which is what you plan capacity around.
- **Best case** — the floor; usually uninteresting except to note it (a target found on the first probe is `O(1)`).
- **Amortised** — cost averaged over a *sequence* of operations, distinct from average case. [[Home/Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic-array]] append is `O(1)` amortised even though a single resize is `O(n)`, and [[Home/Computer Science/Data Structures/Graph Structures/Union-Find|union-find]] is `O(α(n))` amortised per operation — a guarantee over the whole sequence, not any one call.

Big O by default states an upper bound; **Big Θ** (theta) states a *tight* bound where the upper and lower bounds match — merge sort is `Θ(n log n)` because it is `n log n` in every case, whereas quicksort is `O(n²)` worst but `Θ(n log n)` on average. **Big Ω** (omega) is the lower bound. In casual use "O" often means the tight bound; the precise word for "grows exactly like" is Θ.

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
> `HasDuplicate` and `HasDuplicateFast` answer the same question; the second trades `O(n)` memory to drop time from `O(n²)` to `O(n)`. Reading a bound is mostly counting nested loops and multiplying by the per-iteration cost, then discarding constants and lower-order terms.

# Where Big O misleads

- **Constants matter at small `n`.** Big O drops them, so an `O(n log n)` algorithm with heavy setup can lose to an `O(n²)` one on small inputs. This is why `Array.Sort` switches to insertion sort for small subarrays inside its `O(n log n)` introsort — the quadratic algorithm's tiny constant wins below ~16 elements.
- **The hidden constant can be huge.** Two `O(n)` algorithms can differ 100× in wall-clock from cache behaviour, branch prediction, or allocation. Big O narrows the field; profiling on representative data picks the winner within a class.
- **"`n`" must be defined.** For string work, is `n` the number of strings or their total length? A [[Home/Computer Science/Data Structures/Trees/Trie|trie]] lookup is `O(L)` in key length, independent of the `n` keys stored — stating the bound without naming the variable is meaningless.
- **The base of a logarithm is irrelevant.** `log₂ n` and `log₁₀ n` differ by a constant factor, which Big O drops, so `O(log n)` needs no base. Inside an exponent the base is decisive: `2ⁿ` and `3ⁿ` are different classes.

# Questions

> [!QUESTION]- Why does Big O drop constant factors and lower-order terms?
> Because it describes growth as `n → ∞`, where the fastest-growing term dominates everything else and the machine-specific constants wash out. `n² + 100n + 500` is `O(n²)`: past some size the `n²` term buries the rest. This makes the notation a hardware-independent way to compare *scaling*, at the deliberate cost of saying nothing about behaviour at small `n`, where the dropped constants are exactly what decides the winner.

> [!QUESTION]- What is the difference between average-case and amortised complexity?
> Average case is the expected cost of one operation over a distribution of *inputs* — a hash lookup is `O(1)` average because random keys spread across buckets. Amortised is the cost of one operation averaged over a *sequence* of operations on the same structure — a dynamic-array append is `O(1)` amortised because the occasional `O(n)` resize is paid for by the many cheap appends around it. One averages over inputs, the other over a run of operations.

> [!QUESTION]- Why include the call stack in space complexity?
> Because recursion consumes memory per active frame, and that memory is bounded by the recursion depth. An algorithm can allocate no heap yet still be `O(n)` in space if it recurses `n` deep — and it fails by overflowing the stack, not by running slowly. A recursive DFS on a 100k-node chain is the canonical example; converting it to an explicit-stack loop moves the same `O(n)` to the heap where it won't overflow.

> [!QUESTION]- When is an algorithm with worse Big O the right choice?
> When inputs are small and bounded, so the dropped constants dominate — insertion sort inside a hybrid sort below ~16 elements, or a linear scan over 10 items instead of building a hash set. Big O is an asymptotic statement; below the crossover point a "worse" class with a smaller constant and better cache behaviour is genuinely faster. Narrow candidates by complexity class, then measure on representative data.

# References

- [Big O notation (Wikipedia)](https://en.wikipedia.org/wiki/Big_O_notation) — the formal `c`/`n₀` definition, the relationship between O, Θ, and Ω, and the algebra of dropping terms.
- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/) — a reference table of time and space complexity for common data structures and algorithms, with the same growth-class curves plotted.
- [Introduction to Algorithms (MIT 6.006)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — the asymptotic-analysis unit deriving worst/average/amortised bounds from first principles.
- [Cormen, Leiserson, Rivest, Stein — *Introduction to Algorithms*](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) — the "Growth of Functions" and "Divide-and-Conquer" chapters formalise asymptotic notation and the recurrence methods behind these bounds.
