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

A Fibonacci heap is a lazy mergeable heap with excellent amortized bounds for `DecreaseKey`. Fill this note with the root list, consolidation, cascading cuts, and why the constant factors usually keep it out of everyday .NET code.

## Questions

> [!QUESTION]- Why are Fibonacci heaps famous in graph algorithms?
> Their amortized O(1) decrease-key operation improves theoretical bounds for algorithms such as Dijkstra on dense graphs.

## References

- [Dijkstra's algorithm](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm) - common algorithmic context where decrease-key cost changes the analysis.
