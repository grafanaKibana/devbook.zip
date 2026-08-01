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

A hash table mixes a key into a hash, then derives a **home bucket** or slot. Common reductions are `hash mod m` for `m` buckets and `hash & (m - 1)` when `m` is a power of two and the hash bits have been mixed. A collision occurs when distinct keys derive the same home bucket. The pigeonhole principle guarantees one only after more distinct keys are mapped than there are home buckets; before that, collisions are possible but not inevitable. What the table does next — chain or probe — sets its delete semantics and how it degrades under load. The [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|HashMap]] note covers .NET's `Dictionary` as one concrete table.

The naming is genuinely confusing because two independent axes both use the words "open" and "closed", meaning opposite things:

| Common name | Also called | Where entries live | The address of a key is… |
| --- | --- | --- | --- |
| **Open hashing** | Separate chaining, **closed addressing** | Outside the array, in per-bucket lists | Fixed — one bucket, never moves |
| **Closed hashing** | **Open addressing** | Inside the array itself | Open — may end up in a slot other than its home |
| **Bucket/group layout** | Bucket addressing | Fixed-size blocks layered over chaining or probing | Depends on the overflow strategy |

Read it as two questions. *Is the storage open-ended or closed?* Chaining's lists grow beyond the bucket array (open hashing); open addressing lives in a closed array (closed hashing). *Is a key's final address fixed or open?* Chaining pins each key to one bucket (closed addressing); open addressing lets a key drift to another slot. Bucket size is a separate layout choice: either strategy can process several adjacent slots as one bucket or group.

**Core split:** collisions land two keys in one home bucket → chain them outside the array or probe to another in-array slot. A bucket/group layout changes how many candidates one access examines, then delegates overflow to chaining or probing. The third StepTrace tab demonstrates bucketed probing.

~~~~~tabsdown
tab: Visualization

~~~~tabsdown
tab: Closed Addressing


```steptrace
{"algorithm":"hash-map","variant":"closed-addressing"}
```

Separate chaining (open hashing): each bucket points to its own external key/value chain.

tab: Open Addressing


```steptrace
{"algorithm":"hash-map","variant":"open-addressing"}
```

Linear probing scans the fixed table and preserves tombstones after removal.

tab: Bucket Hashing


```steptrace
{"algorithm":"hash-map","variant":"buckets"}
```

Four three-cell buckets use bucket-by-bucket linear overflow with wraparound.

~~~~

# Open Hashing — Separate Chaining (Closed Addressing)

Each array slot holds a pointer to a secondary container — classically a linked list — of every entry that hashed there. A collision appends to that bucket's list; a lookup hashes to the bucket and scans its list with an equality check. The array slot is a fixed *address* for the key (hence "closed addressing"), but the storage behind it is open-ended (hence "open hashing").

- **Load factor** `α = count / bucketCount` can exceed 1. Under simple uniform hashing, a successful lookup in an unordered chain examines about `1 + α/2` entries, so cost rises linearly rather than approaching a full-table cliff. Java's `HashMap` may treeify when an insertion grows a bin past its threshold of 8 entries, but only when the table capacity is at least 64; below that it resizes instead. Its tree gives logarithmic lookup when equal-hash keys have a usable `Comparable` order, while non-comparable equal-hash keys may still require examining both subtrees.
- **Delete is direct** — unlink the node and update normal table metadata. No tombstone or probe-chain repair is required.
- **Cost is locality.** A classic linked chain is a pointer chase across the heap and can incur a cache miss per hop. .NET's `Dictionary` reduces this cost by chaining through indices into one contiguous `entries[]` array rather than heap nodes.

Chaining tolerates moderate hash skew and a load factor above 1 without reserving empty slots; a pathological hash can still collapse one bin to `O(n)`. The price is a pointer or index per entry and, in the naive form, poor cache behaviour.

# Closed Hashing — Open Addressing (Probing)

Every entry lives directly in the bucket array; there are no external lists. On a collision the table follows a deterministic **probe sequence** to the next candidate slot until it finds an empty one (for insert) or the key (for lookup). The storage is closed (a fixed array), but a key's final *address* is open — it may sit far from its home slot.

The probe sequence is the whole design:

- **Linear probing** — try `h, h+1, h+2, …`. It usually has the strongest spatial locality of these probe sequences, but collisions pile into contiguous runs (**primary clustering**) that lengthen every probe touching the run.
- **Quadratic probing** — try `h+1², h+2², h+3², …`. Breaks up primary clustering; keys with the *same* home slot still share a sequence (**secondary clustering**), and it can fail to find a free slot unless capacity and load are constrained.
- **Double hashing** — step by a second hash `h₂(key)`. The stride must be non-zero and coprime to the table capacity so the sequence can visit every slot. Key-specific strides mitigate primary and secondary clustering; they do not eliminate clustering caused by correlated or poor hashes. The cost is a second hash computation and worse locality than linear probing.

- **Load factor must stay below 1** — the array *is* the storage, so a terminating empty slot must remain reachable. For classic linear probing, assume a large table, uniformly distributed independent home slots, and no tombstones. Then an average successful lookup takes about `½(1 + 1/(1−α))` probes, while a miss or insertion takes about `½(1 + 1/(1−α)²)`. At `α = 0.9`, those are roughly 5.5 and 50.5 probes respectively. Real costs depend on hash quality, deletion history, and resize policy.
- **Deletion must preserve probe reachability.** Blindly clearing a slot can create a terminating empty before keys displaced past it. A tombstone is one strategy: lookups continue through it and inserts may reuse it, with periodic cleanup or rehashing to control accumulation. Linear probing can instead backward-shift entries or rebuild the affected local cluster; other probe schemes need a repair rule that preserves their sequence.

Open addressing often lowers pointer and cache overhead when the hash is good and the load factor is controlled. It is not overhead-free: the table reserves empty slack and needs control metadata or sentinel states to distinguish empty, occupied, and sometimes deleted slots.

# Bucket/Group Layout — Layered over Chaining or Probing

The array can group `B` adjacent slots into a fixed-size **bucket**. The home reduction selects a bucket, but the full-bucket rule still comes from a collision-resolution strategy: follow an overflow chain/page, or probe another bucket. The StepTrace example uses the latter, so it is bucketed open addressing rather than a third family.

- **The bucket is the unit of locality.** A cache-line group or disk-page bucket brings several candidates into one access. SwissTable is open addressing: it scans one group of control bytes for matching 7-bit hash fragments, checks only those candidate keys, and continues its probe sequence with another group when no key or true empty control byte was found. A deleted control byte does not terminate that search; an empty one does.
- **Global load factor and local occupancy answer different questions.** Global `α = count / (bucketCount × B)` controls overall free space. A particular bucket's `occupied / B` measures a local hot spot. A full home bucket can overflow while the table still has low global `α`.
- **Overflow and deletion inherit the underlying strategy.** Chained overflow unlinks an entry from its chain or page. Probed overflow cannot blindly clear a slot that earlier probes depend on; it uses tombstones, backward shifting, or a local/full rebuild as its probe scheme permits.

Use bucket/group layout when memory or disk locality dominates; its tail behaviour remains the behaviour of the chosen chain or probe scheme.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Collision Resolution complexity",
  "variables": {
    "blockSize": {
      "symbol": "B",
      "description": "block or page capacity"
    },
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    },
    "keyRange": {
      "symbol": "k",
      "description": "key range, digit count, or requested result count"
    },
    "loadFactor": {
      "symbol": "α",
      "description": "hash-table load factor"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Open hashing (chaining)",
          "bounds": [
            {
              "kind": "text",
              "role": "Avg lookup",
              "formula": "O(1 + α)"
            },
            {
              "kind": "text",
              "role": "Worst lookup",
              "formula": "O(n); treeified comparable-key bin O(log k)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Closed hashing (open addressing)",
          "bounds": [
            {
              "kind": "text",
              "role": "Avg lookup",
              "formula": "Linear probing: success O(1/(1−α)), miss/insert O(1/(1−α)²)"
            },
            {
              "kind": "curve",
              "role": "Worst lookup",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Bucket/group layout",
          "bounds": [
            {
              "kind": "text",
              "role": "Avg lookup",
              "formula": "Resolution-dependent; scans B slots/metadata together"
            },
            {
              "kind": "text",
              "role": "Worst lookup",
              "formula": "resolution-dependent"
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
          "operation": "Open hashing (chaining)",
          "bounds": [
            {
              "kind": "text",
              "role": "Extra memory",
              "formula": "pointer/index per entry"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Closed hashing (open addressing)",
          "bounds": [
            {
              "kind": "text",
              "role": "Extra memory",
              "formula": "empty slack plus control metadata or sentinels"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Bucket/group layout",
          "bounds": [
            {
              "kind": "text",
              "role": "Extra memory",
              "formula": "block slack plus metadata or overflow links"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# Complexity

Under the hashing assumptions stated above and a controlled global load factor, chaining and open addressing are `O(1)` on average. Either can degrade to `O(n)`; grouping changes the number of candidates examined per memory or I/O access, not that asymptotic bound.

| Strategy/layout | Avg lookup | Worst lookup | Load factor | Delete | Locality | Extra memory |
| --- | --- | --- | --- | --- | --- | --- |
| Open hashing (chaining) | `O(1 + α)` | `O(n)`; treeified comparable-key bin `O(log k)` | may exceed 1 | unlink node | poor (heap chase) / good (index chain) | pointer/index per entry |
| Closed hashing (open addressing) | Linear probing: success `O(1/(1−α))`, miss/insert `O(1/(1−α)²)` | `O(n)` | must be `< 1` | tombstone or probe-preserving repair | contiguous; strongest with linear probing | empty slack plus control metadata or sentinels |
| Bucket/group layout | Resolution-dependent; scans `B` slots/metadata together | resolution-dependent | global `α`; local occupancy per bucket | follows chain/probe strategy | cache line, SIMD group, or page | block slack plus metadata or overflow links |

The [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|HashMap]] hash-flooding pitfall applies to both resolution families. Chaining degrades roughly linearly in `α` and survives `α > 1`; probing must resize before the array fills, with misses and inserts deteriorating faster than successful lookups. Grouping improves locality but inherits whichever failure mode handles overflow.

# Reference Drawer

> [!ABSTRACT]- Two resolution strategies and one bucket layout at slot 1
>
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
>   subgraph bucketed["Bucketed probing — block of 3"]
>     B1["bucket 1 | A | B | _ |"]
>   end
> ```
> Keys A and B both derive home slot 1. Chaining links B off slot 1's list; probing advances B to slot 2; bucketed probing tests both positions in bucket 1 before it advances to another bucket.

# Comparison

Chaining and probing decide where a colliding key goes. Bucket/group layout decides how many candidates each access examines and still needs one of those overflow rules.

| Pick | When | Because |
| --- | --- | --- |
| Open hashing (chaining) | Load factor is hard to bound, hash quality is uncertain, deletes are frequent | Survives `α > 1`, degrades gracefully, delete is a pointer unlink |
| Closed hashing (open addressing) | Load factor is controlled, the hash is good, memory and speed matter | Often lowers link overhead and improves locality under moderate load |
| Bucket/group layout plus a resolution strategy | Locality dominates — on-disk pages or cache-line SIMD scans | One access covers `B` candidates; overflow still follows a chain or probe sequence |

Chaining is the forgiving default when load is uncertain or deletes are frequent. Open addressing often reduces per-entry overhead when a good hash, spare capacity, and a probe-preserving delete policy are acceptable. Add bucket/group layout when the access unit is the bottleneck: a disk page or SIMD-sized control group.

# Questions

> [!QUESTION]- Why do "open hashing" and "open addressing" mean opposite things?
> They name different axes. "Open hashing" describes the *storage*: chaining's per-bucket lists grow open-endedly outside the array. "Open addressing" describes the *key's address*: the key may land in a slot other than its home, so its address is open. Chaining is open hashing but *closed* addressing (the bucket is fixed); probing is closed hashing (fixed array) but *open* addressing (the slot drifts).

> [!QUESTION]- Why can a load factor exceed 1 with chaining but not with open addressing?
> Chaining stores entries in lists outside the array, so the array can hold more entries than it has slots — `α > 1` just means the average chain is longer than one. Open addressing stores every entry *in* the array, so it cannot hold more entries than slots; it needs empty slots to terminate probe sequences, and its cost blows up as `α → 1`.

> [!QUESTION]- Why can an open-addressed table not always clear a deleted slot, and when can it avoid tombstones?
> A true empty slot terminates lookup, so clearing a slot inside a probe chain can strand keys displaced past it. A tombstone preserves reachability by saying "deleted, keep probing", but it is only one strategy. Linear probing can backward-shift entries or rebuild the affected cluster; other schemes may repair or rehash if they can preserve every key's probe sequence.

> [!QUESTION]- What makes bucketed hashing fast for on-disk and SIMD tables?
> The bucket or group matches the expensive access unit, so one I/O or vector metadata scan examines `B` candidates. It is a layout optimisation, not a complete collision strategy: a full home bucket still overflows through chaining or probing.

# References

- [Hash table (Wikipedia)](https://en.wikipedia.org/wiki/Hash_table) — the separate-chaining vs open-addressing split, the open/closed terminology clash, and load-factor analysis for each.
- [Open addressing (Wikipedia)](https://en.wikipedia.org/wiki/Open_addressing) — linear, quadratic, and double-hashing probe sequences with their clustering behaviour and the tombstone deletion problem.
- [Swiss Tables design notes (Abseil)](https://abseil.io/about/design/swisstables) — a bucketed open-addressing table that scans control bytes with SIMD, showing how buckets and open addressing combine in a modern high-performance map.
- [OpenJDK `HashMap` source](https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/HashMap.java) — the treeification threshold, minimum table capacity, and comparable-key tree-search path.
- [The Art of Computer Programming, Vol. 3, §6.4](https://www-cs-faculty.stanford.edu/~knuth/taocp.html) — Knuth's original analysis of chaining, linear probing, and their expected probe counts as a function of load factor.
