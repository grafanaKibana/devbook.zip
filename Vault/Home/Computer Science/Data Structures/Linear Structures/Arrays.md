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

An array is a fixed-size contiguous block of elements. Fill this note with index arithmetic, O(1) random access, allocation size, and the cost of resizing by copying into a larger array.

## Questions

> [!QUESTION]- Why is array indexing O(1)?
> The runtime computes the element address from the base address plus `index * elementSize`; it does not scan preceding elements.

## References

- [System.Array class](https://learn.microsoft.com/en-us/dotnet/api/system.array) - .NET API surface for fixed-size array storage.
