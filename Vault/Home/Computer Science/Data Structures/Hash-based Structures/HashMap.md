---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "Key-value pairs located by hashing in O(1) average, O(n) worst-case time."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

A cache holds 50K active sessions and repeatedly looks up one session by its ID. Storing the pairs in a list forces an `O(n)` scan on every lookup, inspecting 25K entries on average. A hash map derives a bucket index directly from the key, so the lookup jumps to the one bucket that could hold it and compares only the entries there. Insert, lookup, and delete become `O(1)` on average.

The structure remembers a mapping from key to value and nothing else. It does not retain insertion order, sort order, or the sequence in which resizes moved entries around. Two keys that hash to the same bucket coexist there, distinguished only by an equality check.

**Core shape:** key → `hash(key) mod capacity` → bucket → chain or probe resolves collisions → resize when the load factor crosses its threshold → `O(1)` average, `O(n)` worst, `O(n)` storage.

## Representation and invariants

Two things define the structure: a backing array of buckets and a hash function that maps a key to an index into it, usually `hash(key) mod capacity`. When several keys map to the same index, a collision-resolution strategy keeps them apart:

- **Chaining** — each bucket holds a secondary container of the entries that landed there, typically a linked list (Java's `HashMap` converts a bucket to a balanced tree once it grows large; .NET's `Dictionary` never does). .NET's `Dictionary<TKey, TValue>` chains, but stores all entries in one contiguous `entries[]` array linked by a `next` **index**, with a parallel `buckets[]` array mapping each hash to its chain head — no per-collision heap allocation, cache-friendly traversal.
- **Open addressing** — every entry lives directly in the bucket array. A collision follows a probe sequence (linear, quadratic, or double hashing) to the next candidate slot. The legacy `Hashtable` probes this way.

The **load factor** `α = count / capacity` tracks how full the array is. Crossing a threshold triggers a **resize**: the map allocates a larger array and **rehashes every entry**, recomputing each bucket index for the new capacity. .NET approximately doubles the capacity and chooses a prime, which reduces sensitivity to regular patterns in weak hash codes.

What the structure retains is the key-to-value association. What it does not promise is order: the API exposes neither insertion order nor sort order, even when a particular runtime version happens to enumerate entries predictably.

Three invariants define a valid state:

1. Every entry resides in the bucket its key currently hashes to. A key whose hash changes after insertion violates this and becomes unreachable.
2. Keys that compare equal must hash equal — the `GetHashCode`/`Equals` contract. If it breaks, equal keys can land in different buckets and both survive as separate entries.
3. A lookup recomputes the bucket, then resolves the collision by equality within it. Correctness depends on both the hash (which bucket) and equality (which entry).

## Complexity

Bounds are per operation. The average column assumes a hash function that distributes keys close to uniformly and a load factor kept bounded by resizing; the worst column is what happens when that assumption fails.

```complexity
{
  "version": 1,
  "mode": "operations",
  "title": "HashMap operation complexity",
  "variables": {
    "n": "number of stored entries"
  },
  "entries": [
    {
      "kind": "operation",
      "operation": "Lookup",
      "bounds": [
        {
          "kind": "catalogue",
          "curveId": "constant",
          "role": "Best"
        },
        {
          "kind": "catalogue",
          "curveId": "constant",
          "role": "Average"
        },
        {
          "kind": "catalogue",
          "curveId": "linear",
          "role": "Worst single op",
          "qualifiers": [
            "Collisions form a chain containing every entry."
          ]
        }
      ],
      "details": {
        "structureSpace": "O(n)",
        "auxiliarySpace": "O(1)",
        "cause": "The hash selects one bucket; equality resolves collisions within that bucket.",
        "assumptions": [
          "The hash function distributes keys close to uniformly.",
          "The load factor stays bounded by resizing."
        ]
      }
    },
    {
      "kind": "operation",
      "operation": "Insert",
      "bounds": [
        {
          "kind": "catalogue",
          "curveId": "constant",
          "role": "Best"
        },
        {
          "kind": "catalogue",
          "curveId": "constant",
          "role": "Amortized / average",
          "qualifiers": [
            "Amortized over a sequence of inserts, not guaranteed for one insert."
          ]
        },
        {
          "kind": "catalogue",
          "curveId": "linear",
          "role": "Worst single op",
          "qualifiers": [
            "A single insert may cross the load-factor threshold and rehash every entry, or collisions may form a linear chain."
          ],
          "details": {
            "auxiliarySpace": "O(n)"
          }
        }
      ],
      "details": {
        "structureSpace": "O(n)",
        "auxiliarySpace": "O(1)",
        "cause": "Hashing selects a bucket; occasional growth spreads an O(n) rehash across the inserts that filled the old table.",
        "assumptions": [
          "The hash function distributes keys close to uniformly.",
          "The load factor stays bounded by resizing."
        ]
      }
    },
    {
      "kind": "operation",
      "operation": "Delete",
      "bounds": [
        {
          "kind": "catalogue",
          "curveId": "constant",
          "role": "Best"
        },
        {
          "kind": "catalogue",
          "curveId": "constant",
          "role": "Average"
        },
        {
          "kind": "catalogue",
          "curveId": "linear",
          "role": "Worst single op",
          "qualifiers": [
            "Collisions form a chain containing every entry."
          ]
        }
      ],
      "details": {
        "structureSpace": "O(n)",
        "auxiliarySpace": "O(1)",
        "cause": "The hash selects one bucket; deletion searches that bucket before removing the matching key.",
        "assumptions": [
          "The hash function distributes keys close to uniformly.",
          "The load factor stays bounded by resizing."
        ]
      }
    },
    {
      "kind": "operation",
      "operation": "Resize (rehash all)",
      "bounds": [
        {
          "kind": "text",
          "formula": "—",
          "role": "Best"
        },
        {
          "kind": "catalogue",
          "curveId": "constant",
          "role": "Amortized per insert",
          "qualifiers": [
            "The O(n) rehash cost is spread across the sequence of inserts that grew the map."
          ]
        },
        {
          "kind": "catalogue",
          "curveId": "linear",
          "role": "Worst single op",
          "qualifiers": [
            "One resize is an O(n) latency spike."
          ]
        }
      ],
      "details": {
        "structureSpace": "O(n)",
        "auxiliarySpace": "O(n)",
        "cause": "Crossing the load-factor threshold allocates a larger array and rehashes every entry.",
        "assumptions": [
          "Capacity grows geometrically, so repeated resize cost amortizes to O(1) per insert."
        ]
      }
    }
  ]
}
```

### Operation details

| Operation | Best | Typical | Worst single operation | Auxiliary space | Cause |
| --- | --- | --- | --- | --- | --- |
| Lookup | `O(1)` | `O(1)` average | `O(n)` | `O(1)` | The hash selects one bucket; equality resolves collisions inside it. |
| Insert | `O(1)` | `O(1)` amortized / average | `O(n)` | `O(1)` normally; `O(n)` during resize | Hashing selects a bucket, while geometric growth spreads each occasional full rehash across the inserts that filled the old table. |
| Delete | `O(1)` | `O(1)` average | `O(n)` | `O(1)` | The hash selects one bucket; deletion searches that bucket before removing the matching key. |
| Resize (rehash all) | — | `O(1)` amortized per insert | `O(n)` | `O(n)` | Crossing the load-factor threshold allocates a larger array and rehashes every entry. |

The `O(1)` average bounds rest on two assumptions stated together: a good hash keeps buckets short, and a bounded load factor keeps them from filling. Drop either and every operation walks a long bucket toward `O(n)`.

Insert is amortized, not strictly `O(1)`. Any single insert can trip the load-factor threshold and rehash the whole array in `O(n)`. Spread across the inserts that grew the map to that size, the rehash cost averages to `O(1)` each — an amortized-sequence guarantee, distinct from the single-op worst case sitting in the next column. Filling a 1M-entry map from default capacity rehashes roughly 20 times along the way; pre-sizing with `new Dictionary<TKey,TValue>(expectedCount)` skips that churn.

## Where the representation breaks

Each boundary traces back to the bucket-and-hash mechanism.

**A weak or adversarial hash collapses a bucket.** A `GetHashCode` that returns a constant puts every entry in one bucket, and the map degrades into a linked list at `O(n)` per operation. When keys come from untrusted input (HTTP query keys, JSON property names), an attacker who can predict the hash forces mass collisions on purpose — algorithmic-complexity denial of service, "hash flooding." For string keys, current .NET `Dictionary` can switch from its fast non-randomized comparer to randomized hashing after excessive collisions; a custom key type with a weak hash stays exposed.

**A mutated key is lost.** Insert a key, then mutate a field that participates in its hash, and invariant 1 breaks — the entry still sits in the old bucket while lookups compute the new one. The entry becomes orphaned: present in memory, unreachable by any lookup. Immutable key types (`string`, `int`, records with `init` properties) avoid this; a mutable key must never change after insertion.

**Iteration order is unspecified.** Current .NET `Dictionary` enumerates its entries array and often appears insertion-ordered, but the API contract does not guarantee that behavior. Removal, slot reuse, or a runtime implementation change can alter the observed order, so code that depends on it is relying on an implementation artifact.

**A resize is a latency spike.** The amortized `O(1)` insert hides an occasional `O(n)` rehash of the entire array. For a real-time or low-latency path, that single stall matters even though the average is fine; pre-sizing or a resize-free structure avoids it.

**Open addressing adds clustering and tombstones.** Probe sequences pile entries into runs (primary clustering) that lengthen every probe, and a delete cannot simply empty a slot — that would truncate a probe chain — so it leaves a tombstone that later lookups must skip until an insertion reuses it. A rebuild restores short probe paths when tombstones accumulate faster than they are reused.

## Reference drawer

> [!ABSTRACT]- Bucket array with chaining
> ```mermaid
> flowchart LR
>   subgraph Buckets
>     B0[bucket 0]
>     B1[bucket 1]
>     B2[bucket 2]
>     B3[bucket 3]
>   end
>   K1["hash(1001) mod 4 = 1"] --> B1
>   K2["hash(1005) mod 4 = 1"] --> B1
>   B1 --> E1[1001 → Ann] --> E2[1005 → Cid]
>   B3 --> E3[1002 → Bob]
> ```

> [!EXAMPLE]- C# usage
> ```csharp
> var usersById = new Dictionary<int, string>(capacity: 1000)
> {
>     [1001] = "Ann",
>     [1002] = "Bob"
> };
>
> if (usersById.TryGetValue(1002, out var name))
> {
>     Console.WriteLine(name);
> }
> ```
> `Dictionary<TKey, TValue>` is the default map in modern .NET. `ConcurrentDictionary` covers concurrent writes (a plain map corrupts its bucket array under a data race), `FrozenDictionary` optimizes build-once/read-many hot paths, and `SortedDictionary` trades `O(1)` for ordered iteration. Passing an initial `capacity` pre-sizes the array and skips the grow-and-rehash cycles.

## Questions

> [!QUESTION]- What assumptions make hash-map operations `O(1)` on average?
> A hash function that distributes keys close to uniformly, so buckets stay short, and a load factor bounded by resizing, so buckets do not fill up. Both must hold. Without them, keys concentrate in a few buckets and each operation walks a long chain toward `O(n)`.

> [!QUESTION]- Why is insert amortized `O(1)` rather than strictly `O(1)`?
> A single insert can push the load factor past its threshold and rehash every existing entry into a larger array, an `O(n)` step. Averaged over the inserts that grew the map to that size, the rehash cost is `O(1)` per insert. The guarantee is over a sequence; any individual insert can still cost `O(n)`.

> [!QUESTION]- What happens to an entry whose key is mutated after insertion?
> The entry stays in the bucket the key hashed to at insertion time, but a lookup recomputes the bucket from the key's new hash and searches a different one. The entry is present in memory yet unreachable — orphaned. Keys must be immutable, or at least never change a hash-participating field after insertion.

> [!QUESTION]- When is a balanced tree preferable to a hash map?
> When the workload needs ordered iteration, range queries, or nearest-key lookups. A hash map scatters keys across buckets and cannot answer those without a full scan and sort; a balanced tree keeps keys sorted at `O(log n)` per operation, which is the price for that ordering.

## References

- [`Dictionary<TKey, TValue>` class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2) — API reference for the primary .NET hash map, with the hash-contract requirements and capacity semantics.
- [`Dictionary.cs` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Dictionary.cs) — runtime source showing the `buckets[]`/`entries[]` chaining layout, prime-based resize, and per-entry `next` indices.
- [Selecting a collection class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/collections/selecting-a-collection-class) — decision guidance between hash-based and sorted collections.
- [Anatomy of the .NET Dictionary](https://dunnhq.com/posts/2024/anatomy-of-the-dotnet-dictionary/) — bucket layout, collision handling, and resize behavior walked through the source.
- [Denial of Service via Algorithmic Complexity Attacks](https://www.usenix.org/legacy/event/sec03/tech/full_papers/crosby/crosby.pdf) — Crosby and Wallach's paper establishing hash-flooding as a practical DoS vector and the motivation for randomized seeds.
