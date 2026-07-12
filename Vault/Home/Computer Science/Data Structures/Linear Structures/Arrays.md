---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A fixed-size contiguous block of same-typed elements, the substrate every other linear structure builds on."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

A program holds an ordered collection of same-typed values and needs to reach the i-th one directly, not by walking from the front. An array stores those values as a contiguous block of equal-size slots, so the address of element `i` is `base + i * elementSize` — a single multiply-and-add that lands on the element regardless of how large `i` is. That same contiguity places neighbors in the sequence next to each other in RAM, which is what makes a scan cache-friendly.

The block is what other linear structures are built on: `List<T>` wraps one, `Stack<T>` and `Queue<T>` wrap one, `Dictionary<TKey,TValue>` keeps its entries in one. The cost of contiguity is rigidity — the size is fixed at allocation, so growth means allocating a new block and copying, and inserting in the middle shifts every later element to keep the slots packed. Growable capacity belongs to [[Dynamic Array]]; a zero-copy view over an existing block belongs to [[Span]].

**Core shape:** equal-size elements → one contiguous fixed block → address `base + i·elementSize` → `O(1)` index, cache-local scan → no cheap growth or middle insert.

The decisive behaviors are an index jump and a middle-insert shift.

> [!NOTE] Visualization pending
> Planned StepTrace: a contiguous-memory card showing an index resolve to `base + i·stride` in a single jump to element `i`, then a middle insert shifting the tail one slot to the right to keep the block packed. No matching renderer exists in `engine.js` yet.

## Representation and layout

The elements sit back-to-back in one allocation. Because every slot is the same width, the offset of element `i` is purely arithmetic: `address(a[i]) = base + i * elementSize`. Nothing before element `i` needs to be inspected, so `a[5_000_000]` costs exactly what `a[0]` costs. Equal element size is the precondition — variable-width elements would make the offset depend on everything preceding the target, which is the linked, pointer-chasing model instead.

Multi-dimensional arrays flatten the same way. A row-major `T[,]` stores row 0 in full, then row 1, and resolves `a[r, c]` as `base + (r * width + c) * elementSize`; the two-dimensional shape is an addressing convention over one contiguous block.

For a value type the values live in the block itself — `new int[1000]` is one allocation holding 4,000 bytes of data. For a reference type the block holds references and the objects live elsewhere, so `string[]` iteration is contiguous over the *pointers* but still chases each one to reach the characters.

Contiguity is worth more than the complexity table shows. A CPU pulls memory in 64-byte cache lines, so one miss brings in a line of neighbors for free (16 elements for 4-byte ints), and the hardware prefetcher recognizes a sequential scan and streams the next lines ahead. That hides the gap between an L1 hit (~1 ns) and main memory (~100 ns). A [[LinkedList]] node is a separate allocation at an unpredictable address, so every `Next` is a potential full-latency miss the prefetcher cannot anticipate — the same `n` and the same `O(n)` can run an order of magnitude slower. This is the physical reason .NET's default collections are array-backed.

## Complexity

| Operation | Time | Aux space | Cause |
| --- | --- | --- | --- |
| Access by index | `O(1)` | `O(1)` | Address is `base + i·elementSize`; one multiply-and-add, independent of `i` or length. |
| Search, unsorted | `O(n)` | `O(1)` | No order to exploit, so every slot may need inspecting. |
| Search, sorted | `O(log n)` | `O(1)` | Random access lets [[Binary Search]] discard half the range per probe. |
| Insert / delete at the middle | `O(n)` | `O(1)` | The tail shifts one slot to keep the block packed and contiguous. |
| Append / grow | not supported | — | Capacity is fixed at allocation; growth needs a new block plus a copy — that is [[Dynamic Array]]. |
| Storage | — | `O(n)` | `n` equal-size slots occupy one contiguous allocation. |

Every bound follows from the layout. `O(1)` access is the address formula; `O(n)` middle mutation is the shift that contiguity forces; the absence of a cheap append is the fixed size. The `O(1)` auxiliary space on access and mutation is real — an in-place shift needs no scratch buffer — but a resize is a separate `O(n)` allocate-and-copy, which is why it is not an array operation at all.

## Boundaries tied to contiguity

Fixed capacity is the hard one. The size is chosen at allocation, and there is no room to append. Growing means allocating a larger block, copying every element, and abandoning the old one; doing that on each insert is an accidental, quadratic re-implementation of [[Dynamic Array]], whose growth strategy makes append amortized `O(1)`.

Middle insertion and deletion pay for packing. Inserting at index `k` in an `n`-element array moves `n − k` elements up by one slot before the new value can occupy its place; deletion moves them down. The contiguous invariant — no gaps between slots — is exactly what forces the shift, and it is why a structure with cheap splices (a linked list) trades away the `O(1)` index to get them.

Out-of-bounds access has no natural floor or ceiling in the arithmetic itself: `base + i * elementSize` is a valid computation for any `i`. Managed runtimes range-check every access and throw `IndexOutOfRangeException`; the unchecked equivalent in C is a buffer overflow reading or writing neighboring memory.

The cache-locality advantage is not a rounding error. For small `n`, a contiguous scan routinely beats an asymptotically better structure — a tree or hash table whose nodes are scattered — because the constant factor is memory latency, not operation count. The crossover where the better big-O wins can sit well past the sizes a given workload ever reaches.

## Reference drawer

> [!ABSTRACT]- Contiguous block and index arithmetic
> ```mermaid
> flowchart LR
>   B["base"] --> S0["a[0]"]
>   S0 --> S1["a[1]"]
>   S1 --> S2["a[2]"]
>   S2 --> Si["a[i] @ base + i·elementSize"]
>   Si --> Sn["a[n-1]"]
> ```

> [!EXAMPLE]- C# reference: index and middle insert
> ```csharp
> // O(1): address is computed, not searched.
> static int Get(int[] a, int i) => a[i];
>
> // O(n): shift the tail right by one to keep the block packed,
> // then drop the value into the freed slot. Capacity is fixed,
> // so the caller must provide room (last element is overwritten).
> static void InsertAt(int[] a, int index, int value)
> {
>     for (var i = a.Length - 1; i > index; i--)
>     {
>         a[i] = a[i - 1];
>     }
>
>     a[index] = value;
> }
> ```
> A true insert cannot grow the block; `InsertAt` overwrites the last element because the capacity was fixed at allocation. Preserving every element is a resize, which allocates a new array — the job of [[Dynamic Array]].

## Comparison

| Structure | Index access | Middle insert / delete | Append | Order retained | Stronger case |
| --- | --- | --- | --- | --- | --- |
| Fixed array | `O(1)` | `O(n)` shift | Not supported | Positional | Size is known and stable, index and scan dominate |
| [[Dynamic Array]] | `O(1)` | `O(n)` shift | Amortized `O(1)` | Positional | Size varies but index and locality still matter |
| [[LinkedList]] | `O(n)` walk | `O(1)` with a node reference | `O(1)` | Sequential, no positional index | Splices at held positions dominate and indexing is not needed |
| [[HashMap]] | `O(1)` avg by key, none by position | `O(1)` avg by key | `O(1)` avg | None (keyed, unordered) | Repeated exact-match lookups where position and order are irrelevant |

A fixed array is the `O(1)`-index, cache-optimal contiguous default when the number of elements is known and stable. It pays for that with a capacity chosen up front and an `O(n)` cost on any middle mutation. A dynamic array keeps the same layout and access while absorbing a varying size behind amortized append. A linked list gives up the positional index and locality to make splices at a held node constant time. A hash map abandons positional order entirely, which is the right trade only when access is by key rather than by index.

## Questions

> [!QUESTION]- Why is array indexing `O(1)` and independent of the index?
> The element address is computed directly as `base + i * elementSize` — a multiply and an add — so `a[i]` costs the same for any `i`. This works only because every element is the same width and the block is contiguous, which lets the offset be pure arithmetic instead of a walk.

> [!QUESTION]- Why does a middle insert cost `O(n)`?
> An array keeps its slots packed with no gaps. Inserting at index `k` in an `n`-element array shifts the `n − k` following elements up by one slot to open the position, so the work is proportional to the tail length. The contiguity that makes indexing cheap is the same property that forces the shift.

> [!QUESTION]- Why can an array not append, and what changes with a dynamic array?
> Capacity is fixed at allocation, so there is no free slot past the last element; adding one requires a new, larger block and a full copy. A dynamic array owns that resize policy — typically doubling — which spreads the copy cost so that append is amortized `O(1)` while keeping the same contiguous layout and `O(1)` index.

> [!QUESTION]- Why can an array scan beat an asymptotically better structure at small `n`?
> Contiguity keeps neighbors in the same cache lines, and the prefetcher streams the next lines ahead of a sequential scan, so most accesses hit L1 (~1 ns) rather than main memory (~100 ns). A scattered structure pays a near-full miss per node. Big-O counts operations; the array's constant factor is far smaller, so the crossover where a better bound wins can sit past the sizes a workload reaches.

## References

- [System.Array class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.array) — API surface plus remarks on single-dimensional, multidimensional, and jagged array layout.
- [Arrays — C# reference](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/arrays) — element access, row-major multidimensional semantics, and jagged array syntax.
- [Array data structure (Wikipedia)](https://en.wikipedia.org/wiki/Array_(data_structure)) — the address formula, row-major addressing, and the contiguity assumptions behind `O(1)` access.
- [Latency numbers every programmer should know](https://gist.github.com/jboner/2841832) — the L1-versus-main-memory figures behind the cache-locality argument.
