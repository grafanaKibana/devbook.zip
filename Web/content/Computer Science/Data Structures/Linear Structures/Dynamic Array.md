---
publish: true
created: 2026-08-20T20:41:15.600Z
modified: 2026-08-20T20:41:15.600Z
published: 2026-08-20T20:41:15.600Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A contiguous, index-addressable buffer that grows automatically by reserving spare capacity.
level:
  - "4"
priority: Medium
status: Done
---

A dynamic array keeps array-style indexing while making append practical. It reserves more contiguous slots than it currently uses, so most appends write into spare capacity. Only the append that fills the buffer pays for growth.

The representation is a backing array plus `count` and `capacity`. Compared with a raw array, it gives up a stable buffer address because growth moves every element to a new allocation. Front and middle edits remain expensive: contiguity forces the tail to shift.

**Core shape:** backing array + `count` + `capacity` → append writes at `count` while `count < capacity` → overflow doubles the buffer and copies

The interactive view keeps the dynamic-array state between operations. Fill its spare slots, then append once more to expose the allocate-copy-grow step.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"dynamic-array"}
```

Three fields define the state. The backing array holds the elements in index order; `count` is the logical size the caller sees; `capacity` is the physical length of the backing array. The two counters are distinct on purpose: `capacity - count` is the reserved slack that lets an append skip allocation.

`Append(x)` has two paths:

- `count < capacity`: write `buffer[count] = x`, increment `count`. One store, no allocation.
- `count == capacity`: allocate a new buffer of size `capacity * FACTOR` (a geometric growth factor, typically `2`), copy all `count` elements into it, drop the old buffer, then perform the write.

Geometric growth is the whole reason append stays cheap on average. Doubling makes resizes exponentially rarer as the array grows. Consider the copy work across `n` appends that trigger resizes at sizes `1, 2, 4, …, n`: the total elements copied is `1 + 2 + 4 + … + n < 2n`.

In .NET this structure is `List<T>`; other ecosystems call it a *vector* or *array list*. `List<T>` doubles the capacity on overflow and exposes `Count` and `Capacity` directly, so `new List<T>(capacity)` pre-reserves the buffer and skips the intermediate resizes when the final size is known.

#### Boundaries Tied to the Backing Array

Pre-sizing with a known capacity removes those spikes entirely.

Growth also has a transient memory peak. During a resize the old and new buffers are both live until the copy finishes, so a doubling from `n` to `2n` needs `n + 2n ≈ 3×` the element memory momentarily. Large arrays can therefore fail to grow even when steady-state usage would fit.

The growth `FACTOR` is a direct memory-versus-copy trade. A factor of `2` wastes up to half the buffer but copies rarely; a factor of `1.5` wastes less slack but resizes more often and copies more total elements over the array's life. The choice is fixed at the mechanism level, not per call.

`Insert(0, x)` shifts every existing element one slot right; `RemoveAt(0)` shifts every element left. A resize separately invalidates references, spans, and pointers into the old backing array because growth replaces that array. A versioned enumerator such as `List<T>.Enumerator` is invalidated whenever a mutation changes the collection version, even when no resize occurs, and detects the mismatch on `MoveNext` or `Reset`.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Dynamic Array complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements currently stored in the dynamic array"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Index a[i] (read/write)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best/Amortized",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Append(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best/Amortized",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(n) on a resize",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert(i, x) / RemoveAt(i) mid or front",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best/Amortized",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(n) shift",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Construct n elements",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best/Amortized",
              "formula": "Θ(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "Θ(n)",
              "curveId": "linear"
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
          "operation": "Append(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n) with up to ~2× slack",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert(i, x) / RemoveAt(i) mid or front",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Construct n elements",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "Θ(n)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
````

# Diagram and C# Implementation

> [!ABSTRACT]- Append with overflow
>
> ```mermaid
> flowchart TD
>   A[Append x] --> B{count < capacity}
>   B -->|Yes| C[buffer at count = x]
>   B -->|No| D[Allocate buffer of capacity * FACTOR]
>   D --> E[Copy all count elements]
>   E --> F[Drop old buffer]
>   F --> C
>   C --> G[count = count + 1]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class DynamicArray<T>
> {
>     private const int Factor = 2;
>     private T[] _buffer = new T[4];
>
>     public int Count { get; private set; }
>     public int Capacity => _buffer.Length;
>
>     public T this[int index]
>     {
>         get
>         {
>             if ((uint)index >= (uint)Count)
>                 throw new ArgumentOutOfRangeException(nameof(index));
>
>             return _buffer[index];
>         }
>         set
>         {
>             if ((uint)index >= (uint)Count)
>                 throw new ArgumentOutOfRangeException(nameof(index));
>
>             _buffer[index] = value;
>         }
>     }
>
>     public void Append(T value)
>     {
>         if (Count == _buffer.Length)
>         {
>             var grown = new T[_buffer.Length * Factor];
>             Array.Copy(_buffer, grown, Count);
>             _buffer = grown;
>         }
>
>         _buffer[Count++] = value;
>     }
>
>     public void Insert(int index, T value)
>     {
>         if ((uint)index > (uint)Count)
>             throw new ArgumentOutOfRangeException(nameof(index));
>
>         if (Count == _buffer.Length)
>         {
>             var grown = new T[_buffer.Length * Factor];
>             Array.Copy(_buffer, grown, Count);
>             _buffer = grown;
>         }
>
>         Array.Copy(_buffer, index, _buffer, index + 1, Count - index);
>         _buffer[index] = value;
>         Count++;
>     }
> }
> ```
>
> The `Append` fast path is a single store. The grow branch runs only when `Count == Capacity`.

# References

- [`List<T>` source in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/List.cs)
