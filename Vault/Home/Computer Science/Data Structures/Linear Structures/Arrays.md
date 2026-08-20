---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A fixed-size contiguous block of same-typed elements, the substrate for many indexed collections."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A program often needs the i-th value in a sequence without walking through everything before it. An array makes that possible by packing equal-size slots into one contiguous block. The runtime computes `base + i * elementSize` and lands directly on the requested slot. Neighbors in the sequence are neighbors in memory too, which makes sequential scans friendly to CPU caches.

This block is the storage underneath `List<T>`, `Stack<T>`, and `Queue<T>`. `Dictionary<TKey,TValue>` also keeps its entries in arrays. Contiguity is rigid. The length is fixed at allocation, growth needs a new block and a copy, and a middle insert shifts the tail to keep every slot packed. [[Home/Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic Array]] adds growable capacity by reallocating geometrically. [[Home/Computer Science/Data Structures/Linear Structures/Span|Span]] provides a zero-copy view over an existing block.

**Core shape:** equal-size elements → one contiguous fixed block → address `base + i·elementSize` → no cheap growth or middle insert.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"arrays"}
```

The decisive behaviors are an index jump and an in-place write to one fixed slot.

The interactive view keeps the array state between actions. Reading jumps directly to one slot; writing to an occupied index replaces that slot's value without moving any neighbor. Inserting a _new element_ is a separate operation that requires shifting the tail or allocating another array.

The elements sit back-to-back in one allocation. Because every slot is the same width, the offset of element `i` is purely arithmetic: `address(a[i]) = base + i * elementSize`. Nothing before element `i` needs to be inspected, so `a[5_000_000]` costs exactly what `a[0]` costs. Fixed-width slots are the precondition for direct address arithmetic; variable-width payloads need indirection or extra offset/length metadata.

Multi-dimensional arrays flatten the same way. A row-major `T[,]` stores row 0 in full, then row 1, and resolves `a[r, c]` as `base + (r * width + c) * elementSize`; the two-dimensional shape is an addressing convention over one contiguous block.

For a value type the values live in the block itself — `new int[1000]` is one allocation holding 4,000 bytes of data. For a reference type the block holds references and the objects live elsewhere, so `string[]` iteration is contiguous over the _pointers_ but still chases each one to reach the characters.

Contiguity is worth more than the complexity table shows. On representative x86-64 machines, cache lines are commonly 64 bytes, so one miss brings in a line of neighbors (16 elements for 4-byte ints), and the hardware prefetcher can stream later lines during a sequential scan. Representative orders of magnitude put an L1 hit near 1 ns and main-memory access near 100 ns, although both vary by processor and workload — the [[Home/Data Persistence/Caching#Measure the Actual Path|measurement boundary]] matters when applying those ratios. This is the physical reason .NET's default collections are array-backed.

#### Boundaries Tied to Contiguity

Fixed capacity is the hard one. The size is chosen at allocation, and there is no room to append.

Middle insertion and deletion pay for packing. Inserting at index `k` in an `n`-element array moves `n − k` elements up by one slot before the new value can occupy its place; deletion moves them down.

Out-of-bounds access has no natural floor or ceiling in the arithmetic itself. Managed runtimes range-check every access and throw `IndexOutOfRangeException`; in C, an out-of-bounds access is undefined behavior and may corrupt adjacent memory, crash, or behave unpredictably.

The cache-locality advantage is not a rounding error. For small `n`, a contiguous scan routinely beats an asymptotically better structure — a tree or hash table whose nodes are scattered — because the constant factor is memory latency, not operation count. The crossover where the better big-O wins can sit well past the sizes a given workload ever reaches.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Arrays complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the fixed-length array"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Access by index",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search, unsorted",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search, sorted",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert / delete at the middle",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Append / grow",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "not supported"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Access by index",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search, unsorted",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search, sorted",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert / delete at the middle",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Storage",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent structure",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# Diagram and C# Implementation

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
> // The address is computed, not searched.
> static int Get(int[] a, int i) => a[i];
>
> // Shift the tail right by one to keep the block packed,
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
> A true insert cannot grow the block. `InsertAt` overwrites the last element because capacity was fixed at allocation. Preserving every element requires a resize and a new array, the job of [[Home/Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic Array]].

# References

- [Arrays — C# reference](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/arrays)
