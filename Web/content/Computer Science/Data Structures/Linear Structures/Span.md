---
publish: true
created: 2026-08-10T06:36:38.100Z
modified: 2026-08-10T06:36:38.101Z
published: 2026-08-10T06:36:38.101Z
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

Parsing a 4 KB network buffer routinely needs to hand a middle section to another method. Passing `buffer[100..200]` as a `byte[]` allocates a fresh array and copies 100 bytes; doing that per packet turns parsing into a stream of short-lived allocations the garbage collector must later reclaim. A `Span<T>` describes that same section as a (reference, length) pair over the original buffer, so the sub-view costs nothing to create and shares the bytes it points at.

A span owns nothing. It is a small value type — a managed reference to the first element in view plus an `int` length — laid over memory that lives elsewhere: a managed array, a `stackalloc` block, or native memory. Slicing returns another span over the same backing store with a shifted reference and a new length; no element is copied, which is why a write through a slice is visible in the original buffer. Being a `ref struct` prevents the span value from being stored in heap objects; C# escape analysis also stops a span over stack-local memory from escaping that memory's lifetime. Native memory remains the caller's responsibility because the type system cannot observe when it is freed.

**Core shape:** existing contiguous buffer → (ref-to-first, length) window → `Slice` adjusts ref+length with no copy → shared memory across views

The interactive view keeps the backing array and active window visible together. Slice narrows the `(start, length)` window without copying; a write through it mutates the same backing slot.

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

The restrictions follow from ref safety: the compiler confines the span value to contexts that do not require storing it in an ordinary heap object or state machine.

Storage and capture are blocked at compile time. A `Span<T>` cannot be boxed, assigned to a class field, captured in a lambda or closure, used as an ordinary generic type argument (absent an `allows ref struct` constraint, added in C# 13 / .NET 9), or held across an `await` or `yield` boundary — those operations would require storing the ref-struct value in a heap object or state machine. Code that must keep a managed-memory view in a field or carry it across async suspension uses `Memory<T>` instead: a heap-storable handle whose `.Span` yields a `Span<T>` at the synchronous point of use.

Backing-store lifetime still matters. A span over a `stackalloc` buffer is valid only while the allocating stack frame is alive; escape rules block returning or capturing it. A span over a managed array may be returned because its managed reference keeps the array reachable. A span over native memory that has been freed is invalid, and nothing in the type system records that free.

`ReadOnlySpan<T>` narrows these rules rather than lifting them: it still cannot escape to the heap, and it additionally rejects writes, so an attempt to mutate through a `ReadOnlySpan<char>` obtained from a `string` fails to compile rather than corrupting an interned literal.

# Reference Drawer

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

`Span<T>` is the zero-copy, zero-allocation view for synchronous code that touches contiguous memory — parsing, formatting, buffer manipulation — and it pays for that speed by being a stack-only value. `Memory<T>` accepts one level of indirection to become heap-storable and async-safe, which is the deciding factor whenever a managed-memory view must sit in a field or survive an `await`. `ArraySegment<T>` fills the same heap-storable niche for managed arrays only and predates both. A real copy — a fresh array — is warranted when the data needs independent ownership rather than another view of the same storage.

# Questions

> [!QUESTION]- How is a `Span<T>` represented, and why is its size independent of the window length?
> It is a value type holding two fields — a managed reference to the first element in view and an integer length. The elements stay in the memory it points at, so the span itself is two machine words whether it covers 2 elements or 2 million.

> [!QUESTION]- What makes `Slice` zero-copy, and what is the observable consequence?
> `Slice` returns a new span with the reference advanced to `start` and a new length; no memory is allocated and no element is copied. Because the result aliases the same backing store, a write through the slice changes the element seen through the original span.

> [!QUESTION]- Why can a `Span<T>` not cross an `await` boundary, and what replaces it there?
> A span that remains live across `await` or `yield` would have to be stored in the heap-allocated state machine, but a `ref struct` cannot be stored there. `Memory<T>` is the heap-storable handle for managed-memory cases, yielding a `Span<T>` through `.Span` at the synchronous point of use.

> [!QUESTION]- When is a copy into a fresh array required instead of a span or `Memory<T>`?
> When the data needs ownership independent of the source buffer — for example, the source is stack or native memory that will be released, or the caller cannot retain the managed owner. A copy creates a new lifetime and snapshot; a span remains only a view, while `Memory<T>` can safely retain supported managed backing storage.

# References

- [`Span<T>` struct](https://learn.microsoft.com/en-us/dotnet/api/system.span-1) — API reference for the constructors, `Slice`, and the `ref struct` constraints that govern where the value may be stored.
- [Memory and spans](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/) — Microsoft's ownership, lifetime, and consumption rules covering when a view should be `Span<T>` versus `Memory<T>`.
- [All About Span: Exploring a New .NET Mainstay](https://learn.microsoft.com/en-us/archive/msdn-magazine/2018/january/csharp-all-about-span-exploring-a-new-net-mainstay) — Stephen Toub's design walkthrough of the two-field layout, slicing, and the `ref struct` motivation.
