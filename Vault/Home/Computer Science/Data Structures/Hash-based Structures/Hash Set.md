---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A hash-table-backed collection of unique values with O(1) average membership, inserts, and removals."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

A pipeline emits 500K event IDs and needs to drop the ones it has already seen. Rescanning a list for each incoming ID is `O(n)` per check and turns the pass quadratic. A hash set keeps only the question "is this element present?" answerable directly: each ID is hashed to a bucket, and membership is decided by probing that one bucket instead of the whole collection.

The structure stores a set of **unique** elements backed by a hash table. It is effectively a [[HashMap]] that keeps only keys and discards the associated value — the same bucket array, hash function, collision resolution, load factor, and resize behavior. What a set adds on top is the uniqueness contract: a second `Add` of an equal element is rejected, so the collection can never hold two members that compare equal. What it retains is exactly which elements are present; what it discards is insertion order, per-element counts, and any value a map would have carried.

**Core shape:** element → `hashCode` → bucket → equal member already there? reject : store → exact membership in `O(1)` average, `O(n)` storage.

> [!NOTE] Visualization pending
> Planned StepTrace: a hash-table card showing an element hashed into a bucket, a membership probe hitting or missing that bucket, and a duplicate `Add` being rejected because an equal member already occupies the slot. No matching renderer exists in `engine.js` yet.

## Representation and the uniqueness contract

The physical layout is a hash table, identical to a [[HashMap]] with the value slot removed: a bucket array whose length is a prime (or a power of two, depending on the runtime), a hash function mapping each element to a bucket index, and a collision-resolution scheme — separate chaining (a linked list or slot chain per bucket) or open addressing (probing to the next free slot). A **load factor** (elements ÷ buckets) bounds the average chain length; crossing its threshold triggers a **resize**, allocating a larger array and rehashing every element into new buckets.

Those hashing mechanics live in [[HashMap]] and are not re-derived here. What is specific to a set is a single decision made on every `Add`: after hashing to a bucket, the operation walks that bucket comparing candidates with `Equals`. If an equal element is found, the add is a no-op and the collection is unchanged; only a bucket miss inserts. This is the whole uniqueness invariant — no two members of the set are ever `Equals`, and it holds because the equality check runs before, not after, insertion.

The membership contract is **exact**. `Contains(x)` hashes `x`, probes its bucket, and returns `true` only if some member satisfies `Equals(x)`. There are no false positives and no false negatives, in contrast to a probabilistic [[Bloom Filter]], which answers membership from a few hashed bits and can report a member that was never added.

Two properties are deliberately not retained. Iteration order reflects bucket layout and rehash history, not insertion sequence, and can change after any `Add`/`Remove` or across runtime versions. And because the set stores presence rather than occurrence, it cannot answer "how many times" — an element is either in or out.

## Complexity

| Operation | Best time | Amortized/average time | Worst time | Structure space | Aux space per op |
| --- | --- | --- | --- | --- | --- |
| `Add(x)` | `O(1)` | `O(1)` | `O(n)` | `O(n)` | `O(1)` |
| `Contains(x)` | `O(1)` | `O(1)` | `O(n)` | `O(n)` | `O(1)` |
| `Remove(x)` | `O(1)` | `O(1)` | `O(n)` | `O(n)` | `O(1)` |
| Resize / rehash | — | `O(1)` amortized per insert | `O(n)` single event | `O(n)` | `O(n)` transient |

The `O(1)` average bounds assume two things: the hash function distributes elements roughly uniformly across buckets, and the load factor is capped so the expected chain length is a small constant. Under those assumptions a probe touches a constant number of members regardless of set size. Both can fail. If many elements collide into one bucket — a weak `hashCode` or adversarially chosen keys — that bucket becomes a linear list and `Add`/`Contains`/`Remove` degrade to `O(n)`. A resize is `O(n)` for the single insert that triggers it, but growth is geometric, so the cost amortizes to `O(1)` per insert across a sequence.

## When the structure stops fitting

Three boundaries follow directly from "hash to a bucket, compare for equality":

- **Ordered and range queries.** A member's bucket index carries no information about its rank among the others, so nothing answers "the smallest element ≥ k" or "all elements in `[a, b]`" without scanning every bucket. Ordered iteration and range access need a sorted structure such as a [[Red-Black Tree]]-backed set, trading `O(1)` membership for `O(log n)` ordered operations.
- **Adversarial or poorly distributed keys.** Because the average bound rests on even bucket occupancy, an attacker who submits many keys hashing to one bucket collapses every operation to `O(n)` — an algorithmic-complexity denial of service. Runtimes randomize the string hash seed per process to blunt this, but a custom type with a hand-rolled `hashCode` reopens it.
- **The `hashCode`/`equals` contract.** Membership depends on both landing in the right bucket and matching by equality. Two elements that are `Equals` must return the same `hashCode`; violating this lets a duplicate slip in (probed in the wrong bucket) or hides an existing member. Mutating a field that feeds `hashCode` after insertion strands the element in its old bucket, so `Contains` returns `false` on a member that is still stored.

A resize also produces a latency spike: one unlucky `Add` pays the full `O(n)` rehash while every other add is constant-time. Pre-sizing the set to the expected count avoids the intermediate resizes.

## Reference drawer

> [!ABSTRACT]- Bucket layout
> ```mermaid
> graph TD
>   H["hash('dotnet') % B"] --> B0["bucket 0"]
>   H2["hash('csharp') % B"] --> B1["bucket 1"]
>   B0 --> V1(["dotnet"])
>   B1 --> V2(["csharp"])
>   B1 -.-> X["Add('csharp'): equal member found -> rejected"]
> ```

> [!EXAMPLE]- C# usage
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
> // Set algebra runs in O(n): dedup a batch against the seen set.
> var seen = new HashSet<int>(capacity: expectedCount);
> seen.UnionWith(processedIds);
> batch.ExceptWith(seen); // batch now holds only unprocessed ids
> ```
> `HashSet<T>` stores keys only; `UnionWith`/`IntersectWith`/`ExceptWith` are in-place `O(n)` mutations, and passing an explicit `capacity` pre-sizes the bucket array to avoid intermediate rehashes.

## Comparison

| Structure | Membership | Ordered / range | Space | Semantic property |
| --- | --- | --- | --- | --- |
| Hash set | `O(1)` avg, `O(n)` worst | Not supported | `O(n)`, one entry per element | Exact membership, dedup, key-only |
| [[HashMap]] | `O(1)` avg | Not supported | `O(n)`, key + value | Same hashing, but each key carries a value |
| Sorted set ([[Red-Black Tree]]) | `O(log n)` | `O(log n)` lookup, in-order iteration | `O(n)` + node pointers | Ordered iteration and range queries |
| [[Bloom Filter]] | `O(1)` bit probes | Not supported | `O(n)` bits, a few per element (sublinear vs storing the elements) | Probabilistic: false positives, **no** false negatives, cannot enumerate |
| Bit-set | `O(1)` | Iterates in integer order | `O(u)` bits over universe `u` | One bit per possible value; dense integer domain only |

A hash set is the default when the workload is exact membership or deduplication and order does not matter: `O(1)` average operations, one stored entry per element, and no false answers. It pays for that with lost ordering and a worst case that reappears under bad hashing. A [[Bloom Filter]] wins when space is the binding constraint and occasional false positives are tolerable — it drops per-element storage to a handful of bits but can never list its members or promise exactness. A sorted set becomes stronger the moment ordered iteration or range queries enter the requirement, accepting `O(log n)` to keep elements comparable by rank. A bit-set beats all of them for a small, dense integer universe, where a single bit per value is both the storage and the index.

## Questions

> [!QUESTION]- What does a hash set add over the hash table that backs it?
> The uniqueness contract. It reuses the same bucket array, hash function, collision resolution, and resize behavior as a [[HashMap]], but stores keys only and rejects any `Add` whose element is already `Equals` to a member. No two elements in the set ever compare equal.

> [!QUESTION]- Why is the `O(1)` membership bound an average rather than a guarantee?
> It assumes the hash spreads elements roughly uniformly and the load factor caps expected chain length at a constant. When many elements collide into one bucket — weak `hashCode` or adversarial keys — that bucket becomes a linear list and `Contains`/`Add`/`Remove` degrade to `O(n)`.

> [!QUESTION]- How does hash-set membership differ from a Bloom filter's?
> A hash set answers membership exactly by probing a bucket and comparing with `Equals`: no false positives, no false negatives, and it can enumerate its members. A [[Bloom Filter]] answers from hashed bits in `O(1)` space per element but can report a non-member as present, and it cannot list what it contains.

> [!QUESTION]- Why can a member become unreachable after insertion?
> Membership routes an element to a bucket via `hashCode`, then confirms with `Equals`. Mutating a field that participates in `hashCode` after adding leaves the element in its original bucket while lookups probe the new one, so `Contains` returns `false` on an element that is still stored.

## References

- [`HashSet<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.hashset-1) — .NET set API, including the `UnionWith`/`IntersectWith`/`ExceptWith` set-algebra methods and capacity constructor.
- [`HashSet<T>` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/HashSet.cs) — source for the bucket-and-slot layout, load-factor threshold, and rehash-on-resize path shared with `Dictionary<TKey,TValue>`.
- [`Object.GetHashCode` contract](https://learn.microsoft.com/en-us/dotnet/api/system.object.gethashcode) — the equality/hash consistency rule whose violation causes duplicate acceptance and missed lookups.
- [Denial of Service via Algorithmic Complexity Attacks](https://www.usenix.org/legacy/event/sec03/tech/full_papers/crosby/crosby.pdf) — Crosby and Wallach on collision flooding against hash tables and the resulting `O(n)` degradation.
