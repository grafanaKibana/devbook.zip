---
publish: true
created: 2026-08-20T20:41:15.601Z
modified: 2026-08-20T20:41:15.602Z
published: 2026-08-20T20:41:15.602Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A stack-only value describing contiguous memory it does not own, enabling zero-copy slicing and parsing.
level:
  - "4"
priority: Medium
status: Done
---

Parsing a 4 KB network buffer often means passing a small middle section to another method. Treating `buffer[100..200]` as a new `byte[]` allocates an array and copies 100 bytes. Repeating that for every packet creates avoidable garbage. A `Span<T>` describes the same section as a reference and a length over the original buffer, so the view is created without copying its bytes.

A span owns nothing. It is a small value containing a managed reference to the first element in view and an `int` length. The memory lives elsewhere, perhaps in a managed array or a `stackalloc` block. Slicing shifts the reference and changes the length. It does not copy elements, so writes through a slice reach the original buffer. The `ref struct` restriction keeps a span out of ordinary heap objects, and C# escape analysis stops stack-backed spans from outliving their storage. Native memory still needs manual lifetime control because the type system cannot observe when it is freed.

**Core shape:** existing contiguous buffer → (ref-to-first, length) window → `Slice` adjusts ref+length with no copy → shared memory across views

The interactive view keeps the backing array and active window visible together. Slice narrows the `(start, length)` window without copying. A write through it mutates the same backing slot.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"span"}
```

#### Representation and Non-ownership

A `Span<T>` holds two fields: a managed reference (`ref T`) to the first element in view and an `int` length. It stores none of the elements itself, so its footprint is constant whether the window covers 2 elements or 2 million. Indexing `span[i]` dereferences `first + i` after checking `0 <= i < length`, giving array-style access with a bounds check and no hop through an owner object.

`Slice(start, length)` builds a new span whose reference is `first + start` and whose length is the requested count. Nothing is allocated and nothing is copied — the result is a narrower view of the same elements. A store through either view writes the shared backing element, so a span deliberately aliases its source rather than isolating a copy.

Three properties follow from the design:

- **Non-owning.** The backing store belongs elsewhere: it may be a GC-managed array, a `stackalloc` block, or a native allocation. The span is only a window and never frees that storage. A `List<T>` ([[Computer Science/Data Structures/Linear Structures/Dynamic Array|dynamic array]]) can expose its contiguous backing array as a span through `CollectionsMarshal.AsSpan`, and an [[Computer Science/Data Structures/Linear Structures/Arrays|array]] converts directly with `AsSpan()`.
- **Stack-only value.** `Span<T>` is a `ref struct`, so it cannot be boxed, captured, or stored in an ordinary heap field. Escape analysis additionally prevents a span over `stackalloc` memory from leaving the allocating frame; it does not track the lifetime of unmanaged allocations.
- **Read-only variant.** `ReadOnlySpan<T>` is the same window with writes removed, so it can wrap immutable data such as a `string` (as `ReadOnlySpan<char>`). `Span<T>` converts implicitly to it; the reverse is disallowed.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Span complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "length of the span in elements"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Construct a span over a buffer",
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
          "operation": "Element access span[i]",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(1), bounds-checked",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Slice(start, length)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(1)",
              "curveId": "constant"
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
          "operation": "Construct a span over a buffer",
          "bounds": [
            {
              "kind": "text",
              "role": "Heap allocation",
              "formula": "none"
            },
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
          "operation": "Element access span[i]",
          "bounds": [
            {
              "kind": "text",
              "role": "Heap allocation",
              "formula": "none"
            },
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
          "operation": "Slice(start, length)",
          "bounds": [
            {
              "kind": "text",
              "role": "Heap allocation",
              "formula": "none — same memory"
            },
            {
              "kind": "curve",
              "role": "Aux space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```
````

# Where the Stack-only Window Breaks down

The restrictions follow from ref safety. The compiler confines a span to contexts that do not store it in an ordinary heap object or state machine.

Storage and capture are blocked at compile time. A `Span<T>` cannot be boxed, assigned to a class field, captured by a closure, or held across an `await` or `yield` boundary. Ordinary generic use also needs an `allows ref struct` constraint, available from C# 13 and .NET 9. Those cases would otherwise place the ref-struct value in a heap object or state machine. Code that must retain a managed-memory view in a field or across async suspension uses `Memory<T>` instead. Its `.Span` property creates the synchronous view at the point of use.

Backing-store lifetime still matters. A span over `stackalloc` memory is valid only while its stack frame is alive, so escape rules block returning or capturing it. A managed-array span may be returned because its managed reference keeps the array reachable. A span over freed native memory is invalid, and the type system has no record of that free.

`ReadOnlySpan<T>` keeps the same lifetime rules and removes writes. A `ReadOnlySpan<char>` over a string therefore cannot mutate the string or an interned literal.

# Diagram and C# Implementation

> [!ABSTRACT]- Window over a backing array
>
> ```mermaid
> flowchart LR
>   subgraph buf[Backing array — length 4]
>     A0[10] --- A1[20] --- A2[30] --- A3[40]
>   end
>   S["Slice(2): ref = &amp;elem2, length = 2"] --> A2
>   S --> A3
> ```

> [!EXAMPLE]- C# usage
>
> ```csharp
> Span<int> values = stackalloc int[] { 10, 20, 30, 40 };
> Span<int> tail = values.Slice(2);   // ref shifted to index 2, length 2
>
> tail[0] = 300;                       // writes the shared backing element
> Console.WriteLine(values[2]);        // 300 — the original buffer changed
>
> // Read-only window over immutable memory, no allocation:
> ReadOnlySpan<char> id = "user-42".AsSpan(5);  // "42"
> ```
>
> `tail` and `values` alias the same buffer, so the write through `tail` is observable through `values`. `AsSpan` produces a `ReadOnlySpan<char>` over the string's characters without copying them.

# Comparison

| Type | Crosses `await` / lives in a field | Backing store | Stronger case |
| --- | --- | --- | --- |
| `Span<T>` | No | Array, `stackalloc`, or native memory | Zero-copy slicing on synchronous hot paths |
| `ArraySegment<T>` | Yes | Managed array only | A heap-storable array window from before `Span<T>` existed |
| `Memory<T>` | Yes | Array or other owned buffer | A view must live on the heap or cross an async boundary |

`Span<T>` is the zero-copy view for synchronous code over contiguous memory. Its stack-only lifetime is the price. `Memory<T>` adds enough indirection to live in fields and survive `await`, which decides the choice whenever a managed-memory view must cross an async boundary. `ArraySegment<T>` covers the older, array-only version of that heap-storable view. A fresh array is warranted when the data needs independent ownership instead of another alias to the same storage.

# References

- [Memory and spans](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/)
