---
publish: true
created: 2026-07-29T14:28:24.648Z
modified: 2026-07-29T14:28:24.648Z
published: 2026-07-29T14:28:24.648Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A fixed-size contiguous block of same-typed elements, the substrate for many indexed collections.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A program holds an ordered collection of same-typed values and needs to reach the i-th one directly, not by walking from the front. An array stores those values as a contiguous block of equal-size slots, so the address of element `i` is `base + i * elementSize` — a single multiply-and-add that lands on the element regardless of how large `i` is. That same contiguity places neighbors in the sequence next to each other in RAM, which is what makes a scan cache-friendly.

The block backs many .NET collections: `List<T>`, `Stack<T>`, and `Queue<T>` wrap one, while `Dictionary<TKey,TValue>` stores entries in arrays. The cost of contiguity is rigidity — the size is fixed at allocation, so growth means allocating a new block and copying, and inserting in the middle shifts every later element to keep the slots packed. Growable capacity belongs to [[Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic Array]]; a zero-copy view over an existing block belongs to [[Computer Science/Data Structures/Linear Structures/Span|Span]].

**Core shape:** equal-size elements → one contiguous fixed block → address `base + i·elementSize` → `O(1)` index, cache-local scan → no cheap growth or middle insert.

The decisive behaviors are an index jump and an in-place write to one fixed slot.

The interactive view keeps the array state between actions. Reading jumps directly to one slot; writing to an occupied index replaces that slot's value without moving any neighbor. Inserting a _new element_ is a separate operation that requires shifting the tail or allocating another array.

```steptrace
{"algorithm":"arrays"}
```

# Representation and Layout

The elements sit back-to-back in one allocation. Because every slot is the same width, the offset of element `i` is purely arithmetic: `address(a[i]) = base + i * elementSize`. Nothing before element `i` needs to be inspected, so `a[5_000_000]` costs exactly what `a[0]` costs. Fixed-width slots are the precondition for direct address arithmetic; variable-width payloads need indirection or extra offset/length metadata.

Multi-dimensional arrays flatten the same way. A row-major `T[,]` stores row 0 in full, then row 1, and resolves `a[r, c]` as `base + (r * width + c) * elementSize`; the two-dimensional shape is an addressing convention over one contiguous block.

For a value type the values live in the block itself — `new int[1000]` is one allocation holding 4,000 bytes of data. For a reference type the block holds references and the objects live elsewhere, so `string[]` iteration is contiguous over the _pointers_ but still chases each one to reach the characters.

Contiguity is worth more than the complexity table shows. On representative x86-64 machines, cache lines are commonly 64 bytes, so one miss brings in a line of neighbors (16 elements for 4-byte ints), and the hardware prefetcher can stream later lines during a sequential scan. Representative orders of magnitude put an L1 hit near 1 ns and main-memory access near 100 ns, although both vary by processor and workload — the top rungs of the [[Data Persistence/Caching#Latency ladder|latency ladder]]. A [[Computer Science/Data Structures/Linear Structures/LinkedList|LinkedList]] node is a separate allocation at an unpredictable address, so every `Next` is a potential full-latency miss the prefetcher cannot anticipate — the same `n` and the same `O(n)` can run an order of magnitude slower. This is the physical reason .NET's default collections are array-backed.

# Complexity

| Operation                     | Time          | Aux space | Cause                                                                                                                                                   |
| ----------------------------- | ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access by index               | `O(1)`        | `O(1)`    | Address is `base + i·elementSize`; one multiply-and-add, independent of `i` or length.                                                                  |
| Search, unsorted              | `O(n)`        | `O(1)`    | No order to exploit, so every slot may need inspecting.                                                                                                 |
| Search, sorted                | `O(log n)`    | `O(1)`    | Random access lets [[Computer Science/Algorithms/Search Algorithms/Binary Search\|Binary Search]] discard half the range per probe.                 |
| Insert / delete at the middle | `O(n)`        | `O(1)`    | The tail shifts one slot to keep the block packed and contiguous.                                                                                       |
| Append / grow                 | not supported | —         | Capacity is fixed at allocation; growth needs a new block plus a copy — that is [[Computer Science/Data Structures/Linear Structures/Dynamic Array\|Dynamic Array]]. |
| Storage                       | —             | `O(n)`    | `n` equal-size slots occupy one contiguous allocation.                                                                                                  |

Every bound follows from the layout. `O(1)` access is the address formula; `O(n)` middle mutation is the shift that contiguity forces; the absence of a cheap append is the fixed size. The `O(1)` auxiliary space on access and mutation is real — an in-place shift needs no scratch buffer — but a resize is a separate `O(n)` allocate-and-copy, which is why it is not an array operation at all.

# Boundaries Tied to Contiguity

Fixed capacity is the hard one. The size is chosen at allocation, and there is no room to append. Growing means allocating a larger block, copying every element, and abandoning the old one; doing that on each insert is an accidental, quadratic re-implementation of [[Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic Array]], whose growth strategy makes append amortized `O(1)`.

Middle insertion and deletion pay for packing. Inserting at index `k` in an `n`-element array moves `n − k` elements up by one slot before the new value can occupy its place; deletion moves them down. The contiguous invariant — no gaps between slots — is exactly what forces the shift, and it is why a structure with cheap splices (a linked list) trades away the `O(1)` index to get them.

Out-of-bounds access has no natural floor or ceiling in the arithmetic itself. Managed runtimes range-check every access and throw `IndexOutOfRangeException`; in C, an out-of-bounds access is undefined behavior and may corrupt adjacent memory, crash, or behave unpredictably.

The cache-locality advantage is not a rounding error. For small `n`, a contiguous scan routinely beats an asymptotically better structure — a tree or hash table whose nodes are scattered — because the constant factor is memory latency, not operation count. The crossover where the better big-O wins can sit well past the sizes a given workload ever reaches.

# Reference Drawer

> [!ABSTRACT]- Contiguous block and index arithmetic
>
> ```mermaid
> flowchart LR
>   B["base"] --> S0["a[0]"]
>   S0 --> S1["a[1]"]
>   S1 --> S2["a[2]"]
>   S2 --> Si["a[i] @ base + i·elementSize"]
>   Si --> Sn["a[n-1]"]
> ```

> [!EXAMPLE]- C# reference: index and middle insert
>
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
>
> A true insert cannot grow the block; `InsertAt` overwrites the last element because the capacity was fixed at allocation. Preserving every element is a resize, which allocates a new array — the job of [[Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic Array]].

# Questions

> [!QUESTION]- Why is array indexing `O(1)` and independent of the index?
> The element address is computed directly as `base + i * elementSize` — a multiply and an add — so `a[i]` costs the same for any `i`. This works only because every element is the same width and the block is contiguous, which lets the offset be pure arithmetic instead of a walk.

> [!QUESTION]- Why does a middle insert cost `O(n)`?
> An array keeps its slots packed with no gaps. Inserting at index `k` in an `n`-element array shifts the `n − k` following elements up by one slot to open the position, so the work is proportional to the tail length. The contiguity that makes indexing cheap is the same property that forces the shift.

> [!QUESTION]- Why can an array not append, and what changes with a dynamic array?
> Capacity is fixed at allocation, so there is no free slot past the last element; adding one requires a new, larger block and a full copy. A dynamic array owns that resize policy — typically doubling — which spreads the copy cost so that append is amortized `O(1)` while keeping the same contiguous layout and `O(1)` index.

> [!QUESTION]- Why can an array scan beat an asymptotically better structure at small `n`?
> On representative x86-64 machines, contiguous neighbors share commonly 64-byte cache lines and the prefetcher can stream later lines during a sequential scan. L1 hits are roughly nanosecond-scale while main-memory accesses are roughly two orders of magnitude slower, though exact latency depends on the processor and workload. A scattered structure can pay a cache miss per node. Big-O counts operations; the array's constant factor is far smaller, so the crossover where a better bound wins can sit past the sizes a workload reaches.

# References

- [System.Array class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.array) — API surface, fixed-size semantics, and supported array shapes.
- [Arrays — C# reference](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/arrays) — element access, row-major multidimensional semantics, and jagged array syntax.
- [Array data structure (Wikipedia)](https://en.wikipedia.org/wiki/Array_\(data_structure\)) — the address formula, row-major addressing, and the contiguity assumptions behind `O(1)` access.
- [Latency numbers every programmer should know](https://gist.github.com/jboner/2841832) — the L1-versus-main-memory figures behind the cache-locality argument.
