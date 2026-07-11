---
publish: true
created: 2026-07-11T18:23:37.333Z
modified: 2026-07-11T18:23:37.333Z
published: 2026-07-11T18:23:37.333Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A fixed-size contiguous block of same-typed elements — the substrate every other linear structure is built on.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

An array is a fixed-size contiguous block of same-typed elements — the substrate every other linear structure is built on. `List<T>` wraps one, `Stack<T>` and `Queue<T>` wrap one, `Dictionary<TKey,TValue>` keeps its entries in one. Two properties fall out of contiguity: O(1) random access by index arithmetic, and cache-friendly iteration because neighbors in the sequence are neighbors in RAM.

The price of contiguity is rigidity: the size is fixed at allocation, and "resizing" means allocating a new array and copying. Growth strategy and amortized append belong to [[Dynamic Array]]; zero-copy windows over an existing array belong to [[Span]] — this note is about the raw block itself.

## Index Arithmetic and Layout

Indexing is a multiply and an add, not a search:

```text
address(arr[i]) = base + headerOffset + i * sizeof(element)
```

That formula is why `arr[5_000_000]` costs the same as `arr[0]`, and why all elements must be the same size — otherwise the offset of element _i_ would depend on everything before it.

In .NET an array is a heap object: an object header, a method-table pointer, a length field, then the elements packed back-to-back. For a value type like `int` the values themselves sit in the block (a `new int[1000]` is one allocation holding 4,000 bytes of data); for a reference type the block holds references and the objects live elsewhere — so `string[]` iteration is contiguous over the _pointers_ but still chases them to reach the characters.

## Cache Locality

Contiguity is worth more than the big-O table shows. A modern CPU pulls memory in 64-byte cache lines — one miss brings in a line's worth of neighbors for free (16 elements for 4-byte ints) — and the hardware prefetcher recognizes a sequential scan and streams lines ahead of you. The latency gap it hides is roughly 1 ns for an L1 hit versus ~100 ns for main memory.

Pointer-chasing structures get none of this. Each `LinkedList<T>` node is a separate allocation at an unpredictable address, so every `node.Next` is a potential full-latency miss the prefetcher can't anticipate. Summing 10M `int`s is a few milliseconds in an array and an order of magnitude slower in a linked list — same n, same O(n), wildly different wall time. This is the physical reason .NET's default collections are array-backed and why "linked list for cheap inserts" so often loses in practice.

## .NET Specifics

**Three array shapes, one clear winner.** A single-dimensional zero-based `T[]` is an _SZ-array_, the shape the runtime privileges with dedicated IL instructions (`ldelem`/`stelem`) and the JIT optimizes hardest. Multidimensional `T[,]` is a different runtime type with slower generalized element access and much weaker JIT optimization. Jagged `T[][]` — an SZ-array of SZ-arrays — usually beats `[,]` for matrix-style work despite the extra indirection, because each row access is back on the fast SZ path. The cost is one allocation per row and no guarantee rows share a cache-friendly neighborhood; for genuinely hot 2D math, flatten to a 1D `T[]` and index with `row * width + col`.

**`Array.Resize` doesn't resize.** It allocates a new array, copies, and rebinds the `ref` variable you passed. Any other reference still points at the old array — two callers can silently diverge. If you're calling it in a loop, you've re-implemented [[Dynamic Array]] badly; use `List<T>`.

**Covariance is a loaded gun from 2002.** `string[]` converts implicitly to `object[]` — a pre-generics design choice — so this compiles and detonates at runtime:

```csharp
object[] objects = new string[2];   // legal: array covariance
objects[0] = 42;                    // ArrayTypeMismatchException at runtime
```

To keep that check sound, _every_ write into an array typed as a reference-type array pays a runtime type check. Value-type arrays (`int[]`) are exempt — one more reason numeric array code is fast.

**Bounds checks and their elimination.** Every access is range-checked (`IndexOutOfRangeException` instead of C's buffer overflow), but the JIT removes the check when it can prove safety — canonically `for (int i = 0; i < arr.Length; i++) sum += arr[i];` where `arr.Length` appears literally in the condition. Iterating backwards or indexing with arithmetic the JIT can't reason about reliably brings the per-access check back; hoisting the length into a local _may_, depending on the runtime — verify with a benchmark or disassembly if it matters.

**`ArrayPool<T>` for churn.** When a hot path repeatedly needs short-lived buffers (I/O, serialization), `ArrayPool<T>.Shared.Rent(size)` / `Return(array)` recycles arrays instead of allocating garbage. Two contract points bite people: the rented array may be _larger_ than requested (use your own length, not `array.Length`), and it comes back with previous contents unless you pass `clearArray: true` on return — a data-leak hazard for sensitive bytes.

## Questions

> [!QUESTION]- Why is array indexing O(1)?
> The runtime computes the element address directly as `base + i * elementSize` — a multiply and an add, independent of the index or the array length. This requires fixed-size elements and contiguous storage, which is exactly what an array guarantees.

> [!QUESTION]- Why does an array scan beat a linked-list traversal by 10× or more when both are O(n)?
> Contiguity. A cache line brings in many elements at once and the hardware prefetcher streams the next lines ahead of the scan, so most accesses hit L1 (~1 ns). Linked-list nodes are scattered allocations, so each `Next` can be a full main-memory miss (~100 ns) the prefetcher can't predict. Big-O counts operations; the constant factor here is memory latency.

> [!QUESTION]- Why does jagged `T[][]` usually outperform multidimensional `T[,]` in .NET?
> Each row of a jagged array is an SZ-array — the single-dimensional zero-based shape the runtime accesses via dedicated IL instructions and the JIT optimizes aggressively (including bounds-check elimination). `T[,]` uses slower generalized accessors with much weaker JIT support. The jagged layout pays an extra indirection and per-row allocations, which is why flattening to a 1D array is the next step for truly hot 2D code.

> [!QUESTION]- What is the array covariance trap?
> `string[]` implicitly converts to `object[]` (a pre-generics design decision), so the type system lets you assign an `int` through the `object[]` view — and the runtime throws `ArrayTypeMismatchException` at the write. Keeping that check sound costs a runtime type check on every store into a reference-type array. Generic variance (`IEnumerable<out T>`) later fixed this properly by allowing covariance only on read-only surfaces.

## References

- [System.Array class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.array) — API surface, plus remarks on SZ vs multidimensional arrays and covariance.
- [Arrays — C# reference](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/arrays) — single-dimensional, multidimensional, and jagged array syntax and semantics.
- [`ArrayPool<T>` class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.buffers.arraypool-1) — the Rent/Return contract, including the oversized-buffer and stale-contents caveats.
- [Latency numbers every programmer should know](https://gist.github.com/jboner/2841832) — the cache-vs-RAM latency figures behind the locality argument.
