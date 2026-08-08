---
publish: true
created: 2026-08-03T07:22:13.840Z
modified: 2026-08-08T08:06:04.025Z
published: 2026-08-08T08:06:04.025Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: Key-value pairs located by hashing into buckets, with collisions resolved by chaining or probing.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A cache holds 50K active sessions and repeatedly looks up one session by its ID. Storing the pairs in a list forces each lookup to scan entries until it finds the matching ID. A hash map instead derives a bucket index directly from the key, so the lookup jumps to the one bucket that could hold it and compares only the entries there.

The structure remembers a mapping from key to value and nothing else. It does not retain insertion order, sort order, or the sequence in which resizes moved entries around. Two keys that hash to the same bucket coexist there, distinguished only by an equality check.

**Core shape:** key → `hash(key) % capacity` → bucket → chain or probe resolves collisions → resize when the load factor crosses its threshold.

The three tabs keep the same 12-cell table while changing only collision policy. **Closed Addressing** uses separate chaining (also called open hashing): each bucket points to its own external key/value chain. **Open Addressing** uses linear probing (also called closed hashing) and leaves tombstones after removal. **Bucket Hashing** groups the array into four contiguous 3-cell buckets, then advances bucket by bucket with wraparound when the home group is full. This prototype fixes capacity at 12 to compare collision policies; production maps usually resize or rebuild after crossing a load threshold.

````tabsdown
tab: Visualization

~~~~tabsdown
tab: Closed Addressing


```steptrace
{"algorithm":"hash-map","variant":"closed-addressing"}
```

tab: Open Addressing


```steptrace
{"algorithm":"hash-map","variant":"open-addressing"}
```

tab: Bucket Hashing


```steptrace
{"algorithm":"hash-map","variant":"buckets"}
```

~~~~

#### Representation and invariants

Two things define the structure: a backing array of buckets and a hash function that maps a key to an index into it, usually `hash(key) % capacity`. When several keys map to the same index, a collision-resolution strategy keeps them apart:

- **Chaining** — each bucket holds a secondary container of the entries that landed there, typically a linked list (Java's `HashMap` converts a bucket to a balanced tree once it grows large; .NET's `Dictionary` never does). .NET's `Dictionary<TKey, TValue>` chains, but stores all entries in one contiguous `entries[]` array linked by a `next` **index**, with a parallel `buckets[]` array mapping each hash to its chain head — no per-collision heap allocation, cache-friendly traversal.
- **Open addressing** — every entry lives directly in the bucket array. A collision follows a probe sequence (linear, quadratic, or double hashing) to the next candidate slot. The legacy `Hashtable` probes this way.

The **load factor** `α = count / capacity` tracks how full the array is. Crossing a threshold triggers a **resize**: the map allocates a larger array and **rehashes every entry**, recomputing each bucket index for the new capacity. .NET grows to the next prime above roughly double the current size; prime capacities reduce sensitivity to common periodic patterns in weak hash functions, but cannot make a poor hash distribute well.

What the structure retains is the key-to-value association. What it does not promise is order: the API exposes neither insertion order nor sort order, even when a particular runtime version happens to enumerate entries predictably.

Three invariants define a valid state:

1. Every entry retains the full hash computed when the map last inserted or rehashed it. A lookup requires that stored hash and equality to match the candidate key, so changing state used by either `GetHashCode` or `Equals` invalidates the key; a changed full hash can miss even when it maps to the same bucket.
2. Keys that compare equal must hash equal — the `GetHashCode`/`Equals` contract. If it breaks, equal keys can land in different buckets and both survive as separate entries.
3. A lookup recomputes the bucket, then resolves the collision by equality within it. Correctness depends on both the hash (which bucket) and equality (which entry).

tab: Complexity

```complexity
{
  "version": 2,
  "label": "HashMap complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of entries currently stored in the map"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Lookup",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Typical",
              "formula": "O(1) average",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Typical",
              "formula": "O(1) amortized / average",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Delete",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Typical",
              "formula": "O(1) average",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Resize (rehash all)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Typical",
              "formula": "O(1) amortized per insert",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(n)",
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
          "operation": "Lookup",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "curve",
              "role": "Normally",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Resize",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Delete",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Resize (rehash all)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```

Bounds are relative to the entry count and assume constant-cost hashing and equality, a hash function that distributes keys close to uniformly, and a load factor kept bounded by resizing. If hashing or equality scans a key of length `k`, each operation also pays that `O(k)` work; if distribution or load-factor control fails, collisions concentrate work in long buckets. Insert's typical bound is amortized because one threshold-crossing insert may rehash the entire map, while geometric growth spreads those occasional rebuilds across the inserts that filled each table. The space entries distinguish normal per-operation storage from the temporary allocation during a resize.
````

# Where the representation breaks

Each boundary traces back to the bucket-and-hash mechanism.

**A weak or adversarial hash collapses a bucket.** A `GetHashCode` that returns a constant puts every entry in one bucket, so each operation must walk the resulting chain. When keys come from untrusted input (HTTP query keys, JSON property names), an attacker who can predict the hash forces mass collisions on purpose — algorithmic-complexity denial of service, "hash flooding." For string keys, current .NET `Dictionary` can switch from its fast non-randomized comparer to randomized hashing after excessive collisions; a custom key type with a weak hash stays exposed.

**A mutated key may become unreachable.** Insert a key, then mutate a field used by `GetHashCode` or `Equals`, and invariant 1 breaks. The entry keeps its insertion-time hash but still references the mutated key object; lookup recomputes the candidate hash and equality from current state, so a changed full hash can miss even if it still maps to the same bucket. Immutable key types (`string`, `int`, records with `init` properties) avoid this; a mutable key must never change after insertion.

**Iteration order is unspecified.** Current .NET `Dictionary` enumerates its entries array and often appears insertion-ordered, but the API contract does not guarantee that behavior. Removal, slot reuse, or a runtime implementation change can alter the observed order, so code that depends on it is relying on an implementation artifact.

**A resize is a latency spike.** One threshold-crossing insert must allocate a new array and rehash every existing entry before it returns. For a real-time or low-latency path, that single stall matters; pre-sizing or a resize-free structure avoids it.

**Open addressing adds clustering and tombstones.** Probe sequences pile entries into runs (primary clustering) that lengthen every probe, and a delete cannot simply empty a slot — that would truncate a probe chain — so it leaves a tombstone. Lookups skip tombstones, later inserts may reuse them, and a rehash removes any that remain.

# Reference drawer

> [!ABSTRACT]- Bucket array with chaining
>
> ```mermaid
> flowchart LR
>   subgraph Buckets
>     B0[bucket 0]
>     B1[bucket 1]
>     B2[bucket 2]
>     B3[bucket 3]
>   end
>   K1["hash(1001) % 4 = 1"] --> B1
>   K2["hash(1005) % 4 = 1"] --> B1
>   B1 --> E1[1001 → Ann] --> E2[1005 → Cid]
>   B3 --> E3[1002 → Bob]
> ```

> [!EXAMPLE]- C# usage
>
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
>
> `Dictionary<TKey, TValue>` is the default map in modern .NET. Concurrent writes are unsupported and may throw or corrupt its state; synchronize access or use `ConcurrentDictionary`. `FrozenDictionary` optimizes build-once/read-many hot paths, while `SortedDictionary` keeps keys ordered. Passing an initial `capacity` pre-sizes the array and skips the grow-and-rehash cycles.

# Questions

> [!QUESTION]- What happens to an entry whose key is mutated after insertion?
> The entry retains its insertion-time hash but still references the mutated key object. If mutation changes anything used by `GetHashCode` or `Equals`, lookup can miss the still-resident entry; even a changed full hash that reduces to the same bucket no longer matches the stored hash. Keys must be immutable, or at least never change hash- or equality-participating state after insertion.

> [!QUESTION]- When is a balanced tree preferable to a hash map?
> When the workload needs ordered iteration, range queries, or nearest-key lookups. A hash map lacks ordered navigation, so these operations require at least a full scan, plus sorting when the result itself must be ordered; a balanced tree retains key order as part of its representation.

# References

- [`Dictionary<TKey, TValue>` class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2) — API reference for the primary .NET hash map, with the hash-contract requirements and capacity semantics.
- [`Dictionary.cs` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Dictionary.cs) — runtime source showing the `buckets[]`/`entries[]` chaining layout, prime-based resize, and per-entry `next` indices.
- [Selecting a collection class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/collections/selecting-a-collection-class) — decision guidance between hash-based and sorted collections.
- [Anatomy of the .NET Dictionary](https://dunnhq.com/posts/2024/anatomy-of-the-dotnet-dictionary/) — bucket layout, collision handling, and resize behavior walked through the source.
- [Denial of Service via Algorithmic Complexity Attacks](https://www.usenix.org/legacy/event/sec03/tech/full_papers/crosby/crosby.pdf) — Crosby and Wallach's paper establishing hash-flooding as a practical DoS vector and the motivation for randomized seeds.
