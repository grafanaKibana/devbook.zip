---
topic:
  - Computer Science
subtopic:
  - Data Structures
tags:
  - FolderNote
level:
  - "4"
priority: Medium
status: Not-Started
publish: false
---

# Intro

Linear structures store elements in a sequence. The academic category is about access order and position, not one concrete memory layout: arrays give index arithmetic and locality; linked lists trade locality for node-local edits; stacks, queues, deques, and circular buffers restrict which end can be read or written.

.NET's everyday defaults lean array-backed: `T[]`, `List<T>`, `Stack<T>`, and `Queue<T>` all use contiguous storage internally. `LinkedList<T>` lives here as the contrast case. It answers the same "ordered sequence" question, but pays pointer overhead and poor cache locality to avoid shifting elements during node-local edits.

## Links

- [[Arrays]]
- [[Dynamic Array]]
- [[Stack]]
- [[Queue]]
- [[LinkedList]]
- [[Circular Buffer]]
- [[Span]]
- [[Deque]]

## References

- [Collections and data structures](https://learn.microsoft.com/en-us/dotnet/standard/collections/) - Microsoft overview of collection families in .NET.
- [System.Array class](https://learn.microsoft.com/en-us/dotnet/api/system.array) - base API for fixed-size array storage in .NET.
