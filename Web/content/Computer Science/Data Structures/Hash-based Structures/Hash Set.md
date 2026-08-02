---
publish: true
created: 2026-07-29T20:22:59.987Z
modified: 2026-08-01T18:31:33.354Z
published: 2026-08-01T18:31:33.354Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A hash-table-backed collection of unique values with O(1) average membership, inserts, and removals.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A pipeline emits 500K event IDs and needs to drop the ones it has already seen. Rescanning a list for each incoming ID is `O(n)` per check and turns the pass quadratic. A hash set keeps only the question "is this element present?" answerable directly: `IEqualityComparer<T>.GetHashCode` selects a home bucket or cell, the collision strategy follows its bucket chain or probe sequence, and `IEqualityComparer<T>.Equals` checks each candidate.

The structure stores elements that are **unique according to its comparer**. It is effectively a [[Computer Science/Data Structures/Hash-based Structures/HashMap|hash map]] that keeps only keys and discards the associated value — the same bucket array, hash function, collision resolution, load factor, and resize behavior. A second `Add` is rejected when the comparer considers the new value equal to an existing member, so a `HashSet<string>(StringComparer.OrdinalIgnoreCase)` treats `"dotnet"` and `"DOTNET"` as the same member. What it retains is exactly which comparer-distinct elements are present; what it discards is insertion order, per-element counts, and any value a map would have carried.

**Core shape:** element → `comparer.GetHashCode` → home bucket/cell → bucket chain or probe sequence → `comparer.Equals` candidate already there? reject : store → exact membership in `O(1)` average, `O(n)` storage.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"hash-set"}
```

## Representation and the Uniqueness Contract

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
      "description": "number of input elements or states"
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
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized/average time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst time",
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
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized/average time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst time",
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
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized/average time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst time",
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
              "role": "Amortized/average time",
              "formula": "O(1) amortized per insert",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst time",
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

## Complexity

| Operation | Best time | Amortized/average time | Worst time | Structure space | Aux space per op |
| --- | --- | --- | --- | --- | --- |
| `Add(x)` | `O(1)` | `O(1)` | `O(n)` | `O(n)` | `O(1)` |
| `Contains(x)` | `O(1)` | `O(1)` | `O(n)` | `O(n)` | `O(1)` |
| `Remove(x)` | `O(1)` | `O(1)` | `O(n)` | `O(n)` | `O(1)` |
| Resize / rehash | — | `O(1)` amortized per insert | `O(n)` single event | `O(n)` | `O(n)` transient |

The `O(1)` average bounds assume two things: the comparer's `GetHashCode` distributes home positions roughly uniformly, and the load factor is capped so the expected collision path stays a small constant. Under those assumptions an operation checks a constant number of candidates regardless of set size. Both can fail. Many elements sharing a home position produce a long bucket chain under separate chaining or a long probe cluster under open addressing, degrading `Add`/`Contains`/`Remove` to `O(n)`. A resize is `O(n)` for the single insert that triggers it, but growth is geometric, so the cost amortizes to `O(1)` per insert across a sequence.

# When the Structure Stops Fitting

Three boundaries follow directly from "hash to a home position, follow the collision path, compare candidates":

- **Ordered and range queries.** A member's bucket index carries no information about its rank among the others, so nothing answers "the smallest element ≥ k" or "all elements in `[a, b]`" without scanning every bucket. Ordered iteration and range access need a sorted structure such as a [[Computer Science/Data Structures/Trees/Red-Black Tree|red-black tree]]-backed set, trading `O(1)` membership for `O(log n)` ordered operations.
- **Adversarial or poorly distributed keys.** Because the average bound rests on short collision paths, many keys sharing a home position create a long bucket chain or probe cluster and collapse operations to `O(n)`. For its built-in string comparers, modern .NET `HashSet<string>` starts with a non-randomized internal comparer and switches to randomized hashing when an excessive collision chain triggers the fallback. Custom types and custom comparers still own their hash distribution.
- **The comparer contract.** Membership depends on both starting from the same home position and matching by equality. Values for which `comparer.Equals(x, y)` is `true` must return the same `comparer.GetHashCode` value; violating this starts a different collision path, letting a duplicate enter or hiding an existing member. Mutating state observed by the comparer after insertion strands the member on its old collision path, so exact membership requires both the comparer and comparer-observed member state to remain stable while stored.

A resize also produces a latency spike: one unlucky `Add` pays the full `O(n)` rehash while every other add is constant-time. Pre-sizing the set to the expected count avoids the intermediate resizes.

# Reference Drawer

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
> `HashSet<T>` stores keys only. With average `O(1)` probes, `UnionWith` and `ExceptWith` take `O(m)` for the `m` elements in `other`; `IntersectWith` takes `O(n)` for another `HashSet<T>` using the same comparer, otherwise `O(n + m)`. Passing an explicit `capacity` pre-sizes the bucket array to avoid intermediate rehashes.

# Questions

> [!QUESTION]- Why is the `O(1)` membership bound an average rather than a guarantee?
> It assumes the set's comparer distributes home positions roughly uniformly and the load factor keeps collision paths short. Many collisions produce a long bucket chain under separate chaining or a long probe cluster under open addressing, degrading `Contains`/`Add`/`Remove` to `O(n)`.

> [!QUESTION]- Why can a member become unreachable after insertion?
> Membership uses `comparer.GetHashCode` to select a home position, follows its collision path, then confirms candidates with `comparer.Equals`. If the comparer is invalid, or a member's comparer-observed state changes after insertion, a lookup can follow a different path and return `false` even though the member is still stored. Exact membership requires comparer-equal values to share a hash code and comparer-observed state to stay stable.

# References

- [`HashSet<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.hashset-1) — .NET set API, including the `UnionWith`/`IntersectWith`/`ExceptWith` set-algebra methods and capacity constructor.
- [`HashSet<T>` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/HashSet.cs) — source for the bucket-and-slot layout, load-factor threshold, and rehash-on-resize path shared with `Dictionary<TKey,TValue>`.
- [`IEqualityComparer<T>.GetHashCode`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.iequalitycomparer-1.gethashcode) — the comparer contract requiring equal values to return the same hash code.
- [Denial of Service via Algorithmic Complexity Attacks](https://www.usenix.org/legacy/event/sec03/tech/full_papers/crosby/crosby.pdf) — Crosby and Wallach on collision flooding against hash tables and the resulting `O(n)` degradation.
