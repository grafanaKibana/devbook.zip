---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Not-Started
publish: false
---

# Intro

A deque, or double-ended queue, supports adding and removing from both ends. Fill this note with circular-array implementation, linked-node implementation, and when a deque is clearer than misusing both a stack and a queue.

## Questions

> [!QUESTION]- What extra operation does a deque add over `Queue<T>`?
> It lets callers push and pop at both the front and the back instead of only enqueueing at the back and dequeueing from the front.

## References

- [Queue<T> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.queue-1) - .NET FIFO queue baseline to contrast with a deque.
