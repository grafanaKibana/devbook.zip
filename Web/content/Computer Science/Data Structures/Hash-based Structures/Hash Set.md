---
publish: true
created: 2026-08-20T20:41:15.595Z
modified: 2026-08-20T20:41:15.596Z
published: 2026-08-20T20:41:15.596Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A hash-table-backed collection that stores one comparer-distinct copy of each value.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A pipeline emits 500K event IDs and must drop repeats. A hash set answers one question directly: is this element already present? `IEqualityComparer<T>.GetHashCode` selects a home bucket or cell. The collision strategy finds the candidates, and `IEqualityComparer<T>.Equals` identifies the matching member.

Elements are unique according to the set's comparer. The structure is effectively a [[Computer Science/Data Structures/Hash-based Structures/HashMap|hash map]] without value slots, using the same hashing and collision mechanics. A second `Add` is rejected when it compares equal to an existing member. For example, `HashSet<string>(StringComparer.OrdinalIgnoreCase)` treats `"dotnet"` and `"DOTNET"` as one member. The set retains comparer-distinct values and discards insertion order, occurrence counts, and associated data.

**Core shape:** element → `comparer.GetHashCode` → home bucket/cell → bucket chain or probe sequence → `comparer.Equals` candidate already there? reject : store

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"hash-set"}
```

#### Representation and the Uniqueness Contract

The physical layout is a hash table, identical to a [[Computer Science/Data Structures/Hash-based Structures/HashMap|hash map]] with the value slot removed: a bucket or cell array whose length is a prime (or a power of two, depending on the runtime), a comparer whose `GetHashCode` maps each element to a home position, and a collision-resolution scheme — separate chaining (a linked list or slot chain per bucket) or open addressing (probing to the next free slot). A **load factor** (elements ÷ buckets or cells) helps keep the expected collision path short; crossing its threshold triggers a **resize**, allocating a larger array and rehashing every element into new home positions.

Those hashing mechanics live in [[Computer Science/Data Structures/Hash-based Structures/HashMap|HashMap]] and are not re-derived here. What is specific to a set is a single decision made on every `Add`: after `comparer.GetHashCode` selects a home bucket or cell, the operation follows the bucket chain or probe sequence and calls `comparer.Equals` on each candidate. If a comparer-equal element is found, the add is a no-op and the collection is unchanged; only a collision-path miss inserts. This is the whole uniqueness invariant — no two members compare equal under the set's comparer.

The membership contract is **exact while the comparer contract holds and comparer-observed state stays stable**. `Contains(x)` uses `comparer.GetHashCode(x)` to choose a home bucket or cell, follows its bucket chain or probe sequence, and returns `true` only if `comparer.Equals(member, x)` succeeds for a candidate. Comparer-equal values must produce the same hash code; otherwise they can start different collision paths, letting duplicates enter and lookups miss stored members. Under that contract there are no false positives or false negatives, unlike a probabilistic [[Computer Science/Data Structures/Hash-based Structures/Bloom Filter|Bloom filter]], which can report a member that was never added.

Two properties are deliberately not retained. Iteration order reflects bucket layout and rehash history, not insertion sequence, and can change after any `Add`/`Remove` or across runtime versions. And because the set stores presence rather than occurrence, it cannot answer "how many times" — an element is either in or out.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Hash Set complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements currently stored in the set"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Add(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized/average",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Contains(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized/average",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Remove(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized/average",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Resize / rehash",
          "bounds": [
            {
              "kind": "curve",
              "role": "Amortized/average",
              "formula": "O(1) amortized per insert",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(n) single event",
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
          "operation": "Add(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Contains(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Remove(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Resize / rehash",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(n) transient",
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

# When the Structure Stops Fitting

The lookup path exposes the main limits.

- **Ordered and range queries.** A bucket index says nothing about rank, so finding the smallest element above k or every element in `[a, b]` requires a full scan.
- Current .NET implementations can switch built-in `HashSet<string>` hashing to a randomized comparer after detecting excessive collisions. Custom types and comparers remain responsible for their own distribution.
- **The comparer contract.** Values for which `comparer.Equals(x, y)` is `true` must return the same `comparer.GetHashCode`. Breaking that rule starts lookups from different positions and can admit a duplicate or hide an existing member. Mutating state used by the comparer after insertion has the same effect because the member remains on its old collision path.

Pre-sizing the set to the expected count avoids the intermediate resizes.

# Diagram and C# Implementation

> [!ABSTRACT]- Bucket layout
>
> ```mermaid
> graph TD
>   H["hash('dotnet') % B"] --> B0["bucket 0"]
>   H2["hash('csharp') % B"] --> B1["bucket 1"]
>   B0 --> V1(["dotnet"])
>   B1 --> V2(["csharp"])
>   B1 -.-> X["Add('csharp'): equal member found -> rejected"]
> ```

> [!EXAMPLE]- C# usage
>
> ```csharp
> var tags = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
> {
>     "dotnet",
>     "csharp",
> };
>
> bool added = tags.Add("DOTNET"); // false: equal by comparer, rejected
> bool present = tags.Contains("CSharp"); // true: exact membership
>
> // UnionWith and ExceptWith each inspect the other collection once.
> var seen = new HashSet<int>(capacity: expectedCount);
> seen.UnionWith(processedIds);
> batch.ExceptWith(seen); // batch now holds only unprocessed ids
> ```
>
> `HashSet<T>` stores keys only. Passing an explicit `capacity` pre-sizes the bucket array to avoid intermediate rehashes.

# References

- [`HashSet<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.hashset-1)
