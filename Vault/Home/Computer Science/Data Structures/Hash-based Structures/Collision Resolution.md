---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

Every hash table maps a key to a bucket with `hash(key) mod capacity`, and the pigeonhole principle guarantees that two distinct keys eventually land in the same bucket. What a table does at that moment — the **collision-resolution strategy** — is the single decision that sets its memory layout, its delete semantics, its cache behaviour, and how it degrades under load. The [[HashMap]] note covers .NET's `Dictionary` as one concrete table; this note is about the three families it could have been built on and the terminology that makes them hard to talk about.

The naming is genuinely confusing because two independent axes both use the words "open" and "closed", meaning opposite things:

| Common name | Also called | Where entries live | The address of a key is… |
| --- | --- | --- | --- |
| **Open hashing** | Separate chaining, **closed addressing** | Outside the array, in per-bucket lists | Fixed — one bucket, never moves |
| **Closed hashing** | **Open addressing** | Inside the array itself | Open — may end up in a slot other than its home |
| **Bucketed hashing** | Bucket addressing | Inside fixed-size blocks in the array | Fixed to a bucket, open within it |

Read it as two questions. *Is the storage open-ended or closed?* Chaining's lists grow without bound (open hashing); open addressing lives in a closed, fixed array (closed hashing). *Is a key's final address fixed or open?* Chaining pins each key to one bucket (closed addressing); open addressing lets a key drift to another slot (open addressing). "Open hashing" and "open addressing" are opposite techniques — the word "open" refers to storage in one and to the address in the other.

**Core split:** collisions land two keys in one home bucket → chain them outside the array (open hashing), probe to another in-array slot (closed hashing), or fit them in a fixed-size in-array block (bucketed) → the choice sets load-factor limits, delete cost, and locality.

> [!NOTE] Visualization pending
> Planned StepTrace: a hash-table card inserting a run of colliding keys three ways side by side — a chain growing off one bucket, a probe sequence walking to the next free slot, and a fixed bucket filling then overflowing — with the load factor annotated as each fills. No matching renderer exists in `engine.js` yet.

# Open hashing — separate chaining (closed addressing)

Each array slot holds a pointer to a secondary container — classically a linked list — of every entry that hashed there. A collision appends to that bucket's list; a lookup hashes to the bucket and scans its list with an equality check. The array slot is a fixed *address* for the key (hence "closed addressing"), but the storage behind it is open-ended (hence "open hashing").

- **Load factor** `α = count / capacity` can exceed 1; the average successful lookup scans `1 + α/2` entries, so performance degrades linearly and gracefully rather than falling off a cliff. Java's `HashMap` upgrades a bucket from a list to a balanced tree once it passes 8 entries, capping a pathological bucket at `O(log k)` instead of `O(k)`.
- **Delete is trivial** — unlink the node from its bucket's list. No bookkeeping, no tombstones.
- **Cost is locality.** A classic linked chain is a pointer chase across the heap, one cache miss per hop. .NET's `Dictionary` avoids this by chaining through indices into one contiguous `entries[]` array rather than heap nodes — closed-addressing semantics with far better locality.

Chaining is the forgiving default: it tolerates a mediocre hash and a load factor above 1, and it never has to reserve empty slots. The price is a pointer (or index) per entry and, in the naive form, poor cache behaviour.

# Closed hashing — open addressing (probing)

Every entry lives directly in the bucket array; there are no external lists. On a collision the table follows a deterministic **probe sequence** to the next candidate slot until it finds an empty one (for insert) or the key (for lookup). The storage is closed (a fixed array), but a key's final *address* is open — it may sit far from its home slot.

The probe sequence is the whole design:

- **Linear probing** — try `h, h+1, h+2, …`. Best locality (sequential memory), but collisions pile into contiguous runs (**primary clustering**) that lengthen every probe touching the run.
- **Quadratic probing** — try `h+1², h+2², h+3², …`. Breaks up primary clustering; keys with the *same* home slot still share a sequence (**secondary clustering**), and it can fail to find a free slot unless capacity and load are constrained.
- **Double hashing** — step by a second hash `h₂(key)`. Different keys get different strides, eliminating both clustering types at the cost of a second hash computation and worse locality than linear.

- **Load factor must stay below 1** — the array *is* the storage, so it needs empty slots to terminate probes. Cost explodes as `α → 1`: linear probing's average successful search is `½(1 + 1/(1−α))`, which is ~1.5 probes at `α = 0.5` but ~5.5 at `α = 0.9`. Tables resize well before full — SwissTable at `α ≈ 0.875`, older tables at `0.7`.
- **Delete cannot just empty a slot** — that would truncate a probe chain and strand later entries. The slot gets a **tombstone** that lookups probe past and inserts may reuse; tombstones accumulate and only a rehash reclaims them. (Linear probing alone admits backward-shift deletion, which avoids tombstones by moving the trailing run back.)

Open addressing wins on speed when the load factor is controlled: one contiguous array, no per-entry pointer, and cache-friendly probing. It demands a good hash and a disciplined resize policy, and it pays for deletes.

# Bucketed hashing (closed addressing, fixed blocks)

A hybrid: the array holds fixed-size **buckets**, each a small block of `B` slots, and the home bucket is `hash(key) mod bucketCount`. A key fills the first free slot *within* its bucket; only when the bucket is full does an overflow strategy kick in — an overflow chain, or probing to the next bucket. It is closed addressing at bucket granularity with open placement inside the bucket.

- **The bucket is the unit of locality.** Sized to a cache line (in-memory) or a disk page (on-disk), one memory or I/O access brings in the whole bucket, so scanning its `B` slots is effectively free after the first access. This is why extendible and linear hashing in databases are bucket-based — a bucket is a page — and why modern SIMD tables (Google's SwissTable/`absl::flat_hash_map`, Facebook's F14) group slots and scan a bucket's metadata with one vector instruction.
- **Load factor is per bucket.** A bucket absorbs up to `B` collisions before overflowing, so a table of bucket size 8 tolerates local hot spots that would trigger long probe runs in a flat open-addressed table.
- **Delete** stays within the bucket (clear the slot, optionally compact); overflow handling reintroduces chaining or probing costs only for the buckets that actually overflowed.

Bucketing is the design when memory or disk locality dominates — you amortise one expensive access over `B` entries — and it degrades to whatever overflow strategy you picked once buckets fill.

# Complexity

All three are `O(1)` average and `O(n)` worst per operation; the differences that matter are the constants and the failure modes.

| Strategy | Avg lookup | Worst lookup | Load factor | Delete | Locality | Extra memory |
| --- | --- | --- | --- | --- | --- | --- |
| Open hashing (chaining) | `O(1 + α)` | `O(n)` (or `O(log n)` treeified) | can exceed 1 | unlink node | poor (heap chase) / good (index chain) | pointer/index per entry |
| Closed hashing (open addressing) | `O(1/(1−α))` | `O(n)` | must be `< 1` | tombstone or backshift | excellent (one array) | none per entry; tombstones transient |
| Bucketed | `O(1 + overflow)` | `O(n)` | per bucket, high tolerance | clear slot in bucket | best (bucket = cache line/page) | fixed block, some slack slots |

The worst case is `O(n)` for all three and fires the same way — a hash that collapses every key into one bucket — which is why the [[HashMap]] hash-flooding pitfall applies across the family regardless of resolution strategy. What differs is the *average* under load: chaining degrades linearly in `α` and survives `α > 1`; open addressing degrades hyperbolically and must resize before the array fills; bucketing pushes the cliff back by a factor of the bucket size and keeps the work in one cache line.

# Reference drawer

> [!ABSTRACT]- The three strategies on a collision at slot 1
> ```mermaid
> flowchart TD
>   subgraph chaining["Open hashing — chaining"]
>     C0[slot 0] 
>     C1[slot 1] --> N1[key A] --> N2[key B]
>   end
>   subgraph probing["Closed hashing — linear probing"]
>     P0[slot 0]
>     P1["slot 1: key A"]
>     P2["slot 2: key B (probed +1)"]
>   end
>   subgraph bucketed["Bucketed — block of 4"]
>     B1["bucket 1 | A | B | _ | _ |"]
>   end
> ```
> Keys A and B both hash to slot 1. Chaining links B off slot 1's list; probing bumps B to slot 2; bucketing drops both into bucket 1's block.

> [!EXAMPLE]- Open-addressed table with linear probing and tombstones (C#)
> ```csharp
> public sealed class LinearProbingMap<TKey, TValue> where TKey : notnull
> {
>     private readonly record struct Slot(TKey Key, TValue Value, bool Occupied, bool Tombstone);
>     private Slot[] _slots = new Slot[8];
>     private int _count;
>
>     public void Add(TKey key, TValue value)
>     {
>         if ((_count + 1) > _slots.Length * 0.7) Resize();      // stay well below full
>         var i = Index(key);
>         var firstTombstone = -1;
>         while (_slots[i].Occupied || _slots[i].Tombstone)      // stop only at a never-used slot
>         {
>             if (_slots[i].Occupied && _slots[i].Key.Equals(key))
>             {
>                 _slots[i] = _slots[i] with { Value = value };  // key present later in the cluster: update in place
>                 return;
>             }
>             if (_slots[i].Tombstone && firstTombstone < 0)
>                 firstTombstone = i;                            // remember the first reusable slot, but keep probing
>             i = (i + 1) & (_slots.Length - 1);                 // probe forward, wrap
>         }
>         _slots[firstTombstone < 0 ? i : firstTombstone] =      // key absent: fill the tombstone, else the empty slot
>             new Slot(key, value, Occupied: true, Tombstone: false);
>         _count++;
>     }
>
>     public bool TryGet(TKey key, out TValue value)
>     {
>         var i = Index(key);
>         while (_slots[i].Occupied || _slots[i].Tombstone)      // must skip tombstones
>         {
>             if (_slots[i].Occupied && _slots[i].Key.Equals(key))
>             {
>                 value = _slots[i].Value;
>                 return true;
>             }
>             i = (i + 1) & (_slots.Length - 1);
>         }
>         value = default!;
>         return false;
>     }
>
>     private int Index(TKey key) => key.GetHashCode() & (_slots.Length - 1);
>     private void Resize() { /* allocate 2×, re-insert live entries, drop tombstones */ }
> }
> ```
> A delete would set `Tombstone` (not clear the slot) so `TryGet`'s probe loop still crosses it; `Resize` is where tombstones are finally discarded. Clearing the slot outright would truncate the chain and hide any key that probed past it.

# Comparison

The strategies answer the same question — where does a colliding key go — with different trade-offs.

| Pick | When | Because |
| --- | --- | --- |
| Open hashing (chaining) | Load factor is hard to bound, hash quality is uncertain, deletes are frequent | Survives `α > 1`, degrades gracefully, delete is a pointer unlink |
| Closed hashing (open addressing) | Load factor is controlled, the hash is good, memory and speed matter | No per-entry pointer, contiguous array, best raw speed under moderate load |
| Bucketed | Locality dominates — on-disk pages or cache-line SIMD scans | One access covers `B` entries; buckets absorb local hot spots |

Chaining is the safe default and the one to teach first, which is why closed-addressing variants back most standard-library maps' conceptual model (.NET's `Dictionary` is index-based chaining). Open addressing is the performance choice once you can guarantee a good hash and a bounded load factor — the regime where its locality and pointer-free layout dominate, accepting tombstoned deletes. Bucketing is the specialisation for when a single memory or disk access is the expensive operation: database indexes make a bucket a page, and cache-optimised libraries make it a SIMD word. In practice the fastest modern in-memory tables combine them — bucketed open addressing — taking locality from buckets and pointer-free storage from open addressing.

# Questions

> [!QUESTION]- Why do "open hashing" and "open addressing" mean opposite things?
> They name different axes. "Open hashing" describes the *storage*: chaining's per-bucket lists grow open-endedly outside the array. "Open addressing" describes the *key's address*: the key may land in a slot other than its home, so its address is open. Chaining is open hashing but *closed* addressing (the bucket is fixed); probing is closed hashing (fixed array) but *open* addressing (the slot drifts).

> [!QUESTION]- Why can a load factor exceed 1 with chaining but not with open addressing?
> Chaining stores entries in lists outside the array, so the array can hold more entries than it has slots — `α > 1` just means the average chain is longer than one. Open addressing stores every entry *in* the array, so it cannot hold more entries than slots; it needs empty slots to terminate probe sequences, and its cost blows up as `α → 1`.

> [!QUESTION]- Why does deleting from an open-addressed table need a tombstone?
> A lookup follows a probe chain until it hits an empty slot, which it reads as "not present". If a delete simply emptied a slot in the middle of a chain, every key that had probed past it would become unreachable — the empty slot would end the search early. A tombstone marks the slot as "deleted, keep probing", preserving the chain; a later rehash clears the accumulated tombstones.

> [!QUESTION]- What makes bucketed hashing fast for on-disk and SIMD tables?
> The bucket is sized to the expensive access unit — a disk page or a cache line — so one I/O or memory fetch brings in `B` slots at once and scanning them is nearly free. A bucket also absorbs up to `B` collisions before any overflow logic runs, so local hot spots that would cause long probe runs in a flat table stay contained in one block.

# References

- [Hash table (Wikipedia)](https://en.wikipedia.org/wiki/Hash_table) — the separate-chaining vs open-addressing split, the open/closed terminology clash, and load-factor analysis for each.
- [Open addressing (Wikipedia)](https://en.wikipedia.org/wiki/Open_addressing) — linear, quadratic, and double-hashing probe sequences with their clustering behaviour and the tombstone deletion problem.
- [Swiss Tables design notes (Abseil)](https://abseil.io/about/design/swisstables) — a bucketed open-addressing table that scans control bytes with SIMD, showing how buckets and open addressing combine in a modern high-performance map.
- [The Art of Computer Programming, Vol. 3, §6.4](https://www-cs-faculty.stanford.edu/~knuth/taocp.html) — Knuth's original analysis of chaining, linear probing, and their expected probe counts as a function of load factor.
