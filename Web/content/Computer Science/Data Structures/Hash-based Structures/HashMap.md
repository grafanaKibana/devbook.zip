---
publish: true
created: 2026-08-20T20:41:15.598Z
modified: 2026-08-27T16:38:55.301Z
published: 2026-08-27T16:38:55.301Z
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

A cache holds 50K active sessions and repeatedly looks up one session by ID. In a list, each lookup scans until it reaches the matching pair. A hash map derives a bucket index from the key and jumps directly to the small set of entries that could match.

The structure retains key-to-value associations. Order is outside its contract, whether insertion order, sort order, or the accidental order left by resizing. Two keys may share a bucket. Equality selects the matching entry.

**Core shape:** key → `hash(key) % capacity` → bucket → chain or probe resolves collisions → resize when the load factor crosses its threshold.

The three tabs keep the same 12-cell table while changing only collision policy. **Closed Addressing** uses separate chaining (also called open hashing): each bucket points to its own external key/value chain. **Open Addressing** uses linear probing (also called closed hashing) and leaves tombstones after removal. **Bucket Hashing** groups the array into four contiguous 3-cell buckets, then advances bucket by bucket with wraparound when the home group is full. This prototype fixes capacity at 12 to compare collision policies. Production maps usually resize or rebuild after crossing a load threshold.

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
              "role": "Average",
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
              "role": "Amortized / Average",
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
              "role": "Average",
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
          "operation": "Whole map",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent structure space",
              "formula": "Θ(n) buckets + entries",
              "curveId": "linear"
            }
          ]
        },
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

Every failure mode traces back to the bucket-and-hash mechanism.

**A weak or adversarial hash collapses a bucket.** A `GetHashCode` that returns a constant puts every entry in one chain, turning each operation into a scan. With untrusted keys such as HTTP query names, predictable hashes let an attacker force those collisions deliberately. This is hash-flooding denial of service. Current .NET `Dictionary` can switch string keys from its fast non-randomized comparer to randomized hashing after excessive collisions. A custom key type with a weak hash remains exposed.

**A mutated key may become unreachable.** The entry keeps its insertion-time hash while still referencing the mutable key object. If a field used by `GetHashCode` or `Equals` changes, lookup works from different state than insertion did. Even when the new full hash reduces to the same bucket, it no longer matches the stored hash. Immutable key types avoid this problem. A mutable key must keep all hash- and equality-participating state fixed after insertion.

**Iteration order is unspecified.** Current .NET `Dictionary` enumerates its entries array and often looks insertion-ordered. The API makes no such promise. Removal, slot reuse, or a runtime change may alter the observed order, so depending on it binds code to an implementation accident.

**A resize is a latency spike.** The insert that crosses the load threshold allocates a new array and rehashes every existing entry before returning. That one stall matters on a latency-sensitive path. Pre-sizing can move it out of the hot path. Workloads that cannot tolerate any rebuild need a different structure.

**Open addressing adds clustering and deletion state.** Probe sequences can pile entries into runs that lengthen later probes. Deletion cannot blindly clear a slot because lookup might stop before reaching displaced keys. Tombstones keep the path open. Later inserts can reuse them, and a rebuild clears the remainder.

# Diagram and C# Implementation

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
> `Dictionary<TKey, TValue>` is the default map in modern .NET. Concurrent writes are unsupported and may throw or corrupt its state. Synchronize access or use `ConcurrentDictionary`. `FrozenDictionary` optimizes build-once/read-many hot paths, while `SortedDictionary` keeps keys ordered. Passing an initial `capacity` pre-sizes the array and skips the grow-and-rehash cycles.

# References

- [`Dictionary.cs` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Dictionary.cs)
- [Denial of Service via Algorithmic Complexity Attacks](https://www.usenix.org/legacy/event/sec03/tech/full_papers/crosby/crosby.pdf)
