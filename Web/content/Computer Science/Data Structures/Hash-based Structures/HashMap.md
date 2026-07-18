---
publish: true
created: 2026-07-12T14:27:20.419Z
modified: 2026-07-18T11:30:05.151Z
published: 2026-07-18T11:30:05.151Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: Key-value pairs located by hashing in O(1) average, O(n) worst-case time.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A cache holds 50K active sessions and repeatedly looks up one session by its ID. Storing the pairs in a list forces an `O(n)` scan on every lookup, inspecting 25K entries on average. A hash map derives a bucket index directly from the key, so the lookup jumps to the one bucket that could hold it and compares only the entries there. Insert, lookup, and delete become `O(1)` on average.

The structure remembers a mapping from key to value and nothing else. It does not retain insertion order, sort order, or the sequence in which resizes moved entries around. Two keys that hash to the same bucket coexist there, distinguished only by an equality check.

**Core shape:** key → `hash(key) mod capacity` → bucket → chain or probe resolves collisions → resize when the load factor crosses its threshold → `O(1)` average, `O(n)` worst, `O(n)` storage.

> [!NOTE] Visualization pending
> Planned StepTrace: a hash-table card showing a bucket array with keys hashed to slots, a collision landing two keys in one bucket (chained), and a resize rehashing every entry into a larger array. No matching renderer exists in `engine.js` yet.

# Representation and invariants

Two things define the structure: a backing array of buckets and a hash function that maps a key to an index into it, usually `hash(key) mod capacity`. When several keys map to the same index, a collision-resolution strategy keeps them apart:

- **Chaining** — each bucket holds a secondary container of the entries that landed there, typically a linked list (Java's `HashMap` converts a bucket to a balanced tree once it grows large; .NET's `Dictionary` never does). .NET's `Dictionary<TKey, TValue>` chains, but stores all entries in one contiguous `entries[]` array linked by a `next` **index**, with a parallel `buckets[]` array mapping each hash to its chain head — no per-collision heap allocation, cache-friendly traversal.
- **Open addressing** — every entry lives directly in the bucket array. A collision follows a probe sequence (linear, quadratic, or double hashing) to the next candidate slot. The legacy `Hashtable` probes this way.

The **load factor** `α = count / capacity` tracks how full the array is. Crossing a threshold triggers a **resize**: the map allocates a larger array and **rehashes every entry**, recomputing each bucket index for the new capacity. .NET grows to the next prime above roughly double the current size, because a prime modulus scatters keys better than a power of two.

What the structure retains is the key-to-value association. What it discards is order — insertion order is not guaranteed, sort order is never present, and both can shift the moment a resize re-derives every index.

Three invariants define a valid state:

1. Every entry resides in the bucket its key currently hashes to. A key whose hash changes after insertion violates this and becomes unreachable.
2. Keys that compare equal must hash equal — the `GetHashCode`/`Equals` contract. If it breaks, equal keys can land in different buckets and both survive as separate entries.
3. A lookup recomputes the bucket, then resolves the collision by equality within it. Correctness depends on both the hash (which bucket) and equality (which entry).

# Complexity

Bounds are per operation. The average column assumes a hash function that distributes keys close to uniformly and a load factor kept bounded by resizing; the worst column is what happens when that assumption fails.

| Operation | Best time | Amortized / average time | Worst single op | Structure space | Aux space per op |
| --- | --- | --- | --- | --- | --- |
| Lookup | `O(1)` | `O(1)` | `O(n)` | `O(n)` | `O(1)` |
| Insert | `O(1)` | `O(1)` amortized | `O(n)` | `O(n)` | `O(1)` |
| Delete | `O(1)` | `O(1)` | `O(n)` | `O(n)` | `O(1)` |
| Resize (rehash all) | — | `O(1)` per insert amortized | `O(n)` | `O(n)` | `O(n)` |

The `O(1)` average bounds rest on two assumptions stated together: a good hash keeps buckets short, and a bounded load factor keeps them from filling. Drop either and every operation walks a long bucket toward `O(n)`.

Insert is amortized, not strictly `O(1)`. Any single insert can trip the load-factor threshold and rehash the whole array in `O(n)`. Spread across the inserts that grew the map to that size, the rehash cost averages to `O(1)` each — an amortized-sequence guarantee, distinct from the single-op worst case sitting in the next column. Filling a 1M-entry map from default capacity rehashes roughly 20 times along the way; pre-sizing with `new Dictionary<TKey,TValue>(expectedCount)` skips that churn.

# Where the representation breaks

Each boundary traces back to the bucket-and-hash mechanism.

**A weak or adversarial hash collapses a bucket.** A `GetHashCode` that returns a constant puts every entry in one bucket, and the map degrades into a linked list at `O(n)` per operation. When keys come from untrusted input (HTTP query keys, JSON property names), an attacker who can predict the hash forces mass collisions on purpose — algorithmic-complexity denial of service, "hash flooding." .NET randomizes the `string` hash seed per process to defend against it; a custom key type with a weak hash stays exposed.

**A mutated key is lost.** Insert a key, then mutate a field that participates in its hash, and invariant 1 breaks — the entry still sits in the old bucket while lookups compute the new one. The entry becomes orphaned: present in memory, unreachable by any lookup. Immutable key types (`string`, `int`, records with `init` properties) avoid this; a mutable key must never change after insertion.

**Iteration order is unspecified and unstable.** Insert `3, 1, 2` and enumeration may return any permutation, because order follows bucket layout, not insertion. A resize re-derives every bucket index and can reorder the whole enumeration. Code that depends on iteration order is relying on an implementation artifact.

**A resize is a latency spike.** The amortized `O(1)` insert hides an occasional `O(n)` rehash of the entire array. For a real-time or low-latency path, that single stall matters even though the average is fine; pre-sizing or a resize-free structure avoids it.

**Open addressing adds clustering and tombstones.** Probe sequences pile entries into runs (primary clustering) that lengthen every probe, and a delete cannot simply empty a slot — that would truncate a probe chain — so it leaves a tombstone that later lookups must skip and that only a rebuild reclaims.

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
>   K1["hash(1001) mod 4 = 1"] --> B1
>   K2["hash(1005) mod 4 = 1"] --> B1
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
> `Dictionary<TKey, TValue>` is the default map in modern .NET. `ConcurrentDictionary` covers concurrent writes (a plain map corrupts its bucket array under a data race), `FrozenDictionary` optimizes build-once/read-many hot paths, and `SortedDictionary` trades `O(1)` for ordered iteration. Passing an initial `capacity` pre-sizes the array and skips the grow-and-rehash cycles.

# Questions

> [!QUESTION]- What assumptions make hash-map operations `O(1)` on average?
> A hash function that distributes keys close to uniformly, so buckets stay short, and a load factor bounded by resizing, so buckets do not fill up. Both must hold. Without them, keys concentrate in a few buckets and each operation walks a long chain toward `O(n)`.

> [!QUESTION]- Why is insert amortized `O(1)` rather than strictly `O(1)`?
> A single insert can push the load factor past its threshold and rehash every existing entry into a larger array, an `O(n)` step. Averaged over the inserts that grew the map to that size, the rehash cost is `O(1)` per insert. The guarantee is over a sequence; any individual insert can still cost `O(n)`.

> [!QUESTION]- What happens to an entry whose key is mutated after insertion?
> The entry stays in the bucket the key hashed to at insertion time, but a lookup recomputes the bucket from the key's new hash and searches a different one. The entry is present in memory yet unreachable — orphaned. Keys must be immutable, or at least never change a hash-participating field after insertion.

> [!QUESTION]- When is a balanced tree preferable to a hash map?
> When the workload needs ordered iteration, range queries, or nearest-key lookups. A hash map scatters keys across buckets and cannot answer those without a full scan and sort; a balanced tree keeps keys sorted at `O(log n)` per operation, which is the price for that ordering.

# References

- [`Dictionary<TKey, TValue>` class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2) — API reference for the primary .NET hash map, with the hash-contract requirements and capacity semantics.
- [`Dictionary.cs` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Dictionary.cs) — runtime source showing the `buckets[]`/`entries[]` chaining layout, prime-based resize, and per-entry `next` indices.
- [Selecting a collection class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/collections/selecting-a-collection-class) — decision guidance between hash-based and sorted collections.
- [Anatomy of the .NET Dictionary](https://dunnhq.com/posts/2024/anatomy-of-the-dotnet-dictionary/) — bucket layout, collision handling, and resize behavior walked through the source.
- [Denial of Service via Algorithmic Complexity Attacks](https://www.usenix.org/legacy/event/sec03/tech/full_papers/crosby/crosby.pdf) — Crosby and Wallach's paper establishing hash-flooding as a practical DoS vector and the motivation for randomized seeds.
