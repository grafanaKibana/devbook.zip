---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A stack-only view over contiguous memory that owns nothing, enabling high-performance zero-copy slicing and parsing."
level:
  - "4"
priority: Medium
status: Done
publish: true
---

# Intro

Parsing a 4 KB network buffer routinely needs to hand a middle section to another method. Passing `buffer[100..200]` as a `byte[]` allocates a fresh array and copies 100 bytes; doing that per packet turns parsing into a stream of short-lived allocations the garbage collector must later reclaim. A `Span<T>` describes that same section as a (reference, length) pair over the original buffer, so the sub-view costs nothing to create and shares the bytes it points at.

A span owns nothing. It is a small value type — a managed reference to the first element in view plus an `int` length — laid over memory that lives elsewhere: a managed array, a `stackalloc` block, or native memory. Slicing returns another span over the same backing store with a shifted reference and a new length; no element is copied, which is why a write through a slice is visible in the original buffer. Being a `ref struct` confines it to the stack, so it can never outlive the memory it describes.

**Core shape:** existing contiguous buffer → (ref-to-first, length) window → `Slice` adjusts ref+length with no copy → shared memory across views → `O(1)` span storage regardless of window size.

> [!NOTE] Visualization pending
> Planned StepTrace: a (pointer, length) window card laid over part of an existing array, where slicing produces a narrower window over the same memory — no copy — and a write through the slice mutates the shared backing element. No matching renderer exists in `engine.js` yet.

## Representation and non-ownership

A `Span<T>` holds two fields: a managed reference (`ref T`) to the first element in view and an `int` length. It stores none of the elements itself, so its footprint is constant whether the window covers 2 elements or 2 million. Indexing `span[i]` dereferences `first + i` after checking `0 <= i < length`, giving array-style access with a bounds check and no hop through an owner object.

`Slice(start, length)` builds a new span whose reference is `first + start` and whose length is the requested count. Nothing is allocated and nothing is copied — the result is a narrower view of the same elements. A store through either view writes the shared backing element, so a span deliberately aliases its source rather than isolating a copy.

Three properties follow from the design:

- **Non-owning.** The backing store — a managed array, a `stackalloc` block, or a native pointer — is allocated and freed elsewhere. The span is a window and never frees anything. A `List<T>` ([[Dynamic Array|dynamic array]]) can expose its contiguous backing array as a span through `CollectionsMarshal.AsSpan`, and an [[Arrays|array]] converts directly with `AsSpan()`.
- **Stack-only.** `Span<T>` is a `ref struct`. The runtime keeps it on the stack and forbids every move to the heap, which is what stops a window from outliving the buffer beneath it.
- **Read-only variant.** `ReadOnlySpan<T>` is the same window with writes removed, so it can wrap immutable data such as a `string` (as `ReadOnlySpan<char>`). `Span<T>` converts implicitly to it; the reverse is disallowed.

## Complexity

| Operation | Time | Heap allocation | Aux space |
| --- | --- | --- | --- |
| Construct a span over a buffer | `O(1)` | none | `O(1)` |
| Element access `span[i]` | `O(1)`, bounds-checked | none | `O(1)` |
| `Slice(start, length)` | `O(1)` | none — same memory | `O(1)` |

The defining column is allocation: every operation is constant time and copies nothing. A span is two fields, so its own footprint is `O(1)` independent of the window length; the elements live in memory it does not own. Producing the same sub-view as a distinct array — `array[100..200]` typed as `byte[]` — instead costs `O(n)` time and an `O(n)` allocation for the copied elements.

## Where the stack-only window breaks down

The restrictions all follow from one rule: a non-owning window must never outlive its buffer, so the runtime pins it to the stack and refuses every path to the heap.

Storage and capture are blocked at compile time. A `Span<T>` cannot be boxed, assigned to a class field, captured in a lambda or closure, used as an ordinary generic type argument (absent an `allows ref struct` constraint, added in C# 13 / .NET 9), or held across an `await` or `yield` boundary — each of those would place the window on the heap, where the buffer's lifetime no longer constrains it. Code that must keep a view in a field or carry it across async suspension uses `Memory<T>` instead: a heap-storable handle whose `.Span` yields a `Span<T>` at the synchronous point of use.

Lifetime still binds even inside the stack. A span over a `stackalloc` buffer is valid only within the method that allocated it; the escape rules block returning it, because the stack frame — and the buffer — vanish on return. A span over native memory that has since been freed is worse: nothing in the type system records the free, so indexing the span reads whatever now occupies the reclaimed address rather than the original elements.

`ReadOnlySpan<T>` narrows these rules rather than lifting them: it still cannot escape to the heap, and it additionally rejects writes, so an attempt to mutate through a `ReadOnlySpan<char>` obtained from a `string` fails to compile rather than corrupting an interned literal.

## Reference drawer

> [!ABSTRACT]- Window over a backing array
> ```mermaid
> flowchart LR
>   subgraph buf[Backing array — length 4]
>     A0[10] --- A1[20] --- A2[30] --- A3[40]
>   end
>   S["Slice(2): ref = &amp;elem2, length = 2"] --> A2
>   S --> A3
> ```

> [!EXAMPLE]- C# usage
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
> `tail` and `values` alias the same buffer, so the write through `tail` is observable through `values`. `AsSpan` produces a `ReadOnlySpan<char>` over the string's characters without copying them.

## Comparison

| Type | Sub-view cost | Heap-storable | Crosses `await` / lives in a field | Backing store | Stronger case |
| --- | --- | --- | --- | --- | --- |
| `Span<T>` | `O(1)`, no copy | No (`ref struct`) | No | Array, `stackalloc`, or native memory | Zero-copy slicing on synchronous hot paths |
| `ArraySegment<T>` | `O(1)` view | Yes | Yes | Managed array only | A heap-storable array window from before `Span<T>` existed |
| `Memory<T>` | `O(1)` slice | Yes | Yes | Array or other owned buffer | A view must live on the heap or cross an async boundary |

`Span<T>` is the zero-copy, zero-allocation view for synchronous code that touches contiguous memory — parsing, formatting, buffer manipulation — and it pays for that speed by being unable to leave the stack. `Memory<T>` accepts one level of indirection to become heap-storable and async-safe, which is the deciding factor whenever a view must sit in a field or survive an `await`. `ArraySegment<T>` fills the same heap-storable niche for managed arrays only and predates both. A real copy — a fresh array — is warranted just once: when the data must outlive the buffer it came from.

## Questions

> [!QUESTION]- How is a `Span<T>` represented, and why is its size independent of the window length?
> It is a value type holding two fields — a managed reference to the first element in view and an integer length. The elements stay in the memory it points at, so the span itself is two machine words whether it covers 2 elements or 2 million.

> [!QUESTION]- What makes `Slice` zero-copy, and what is the observable consequence?
> `Slice` returns a new span with the reference advanced to `start` and a new length; no memory is allocated and no element is copied. Because the result aliases the same backing store, a write through the slice changes the element seen through the original span.

> [!QUESTION]- Why can a `Span<T>` not cross an `await` boundary, and what replaces it there?
> As a `ref struct` it is confined to the stack; crossing `await` (or `yield`) would move it to the heap-allocated state machine, where the buffer's lifetime no longer guards it, so the compiler rejects it. `Memory<T>` is the heap-storable handle for those cases, yielding a `Span<T>` through `.Span` at the synchronous point of use.

> [!QUESTION]- When is a copy into a fresh array required instead of a span or `Memory<T>`?
> When the data must outlive the buffer it came from. A span or `Memory<T>` only references existing memory; once that backing store is freed or reused, the view is invalid, so surviving data has to be copied into an owned array.

## References

- [`Span<T>` struct](https://learn.microsoft.com/en-us/dotnet/api/system.span-1) — API reference for the constructors, `Slice`, and the `ref struct` constraints that keep it on the stack.
- [Memory and spans](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/) — Microsoft's ownership, lifetime, and consumption rules covering when a view should be `Span<T>` versus `Memory<T>`.
- [All About Span: Exploring a New .NET Mainstay](https://learn.microsoft.com/en-us/archive/msdn-magazine/2018/january/csharp-all-about-span-exploring-a-new-net-mainstay) — Stephen Toub's design walkthrough of the two-field layout, slicing, and the `ref struct` motivation.
