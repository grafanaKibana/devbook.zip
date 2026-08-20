---
publish: true
created: 2026-08-20T20:41:15.595Z
modified: 2026-08-20T20:41:15.595Z
published: 2026-08-20T20:41:15.595Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: Resolves hash collisions by chaining entries outside the table or probing alternative in-array slots.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A hash table mixes a key into a hash, then reduces that hash to a **home bucket** or slot. Common reductions are `hash mod m` for `m` buckets and `hash & (m - 1)` when `m` is a power of two and the hash bits have already been mixed. Distinct keys can choose the same home bucket even while other buckets remain empty. Once there are more keys than home buckets, the pigeonhole principle guarantees a collision. The response, chaining or probing, determines deletion behavior and how sharply the table slows as it fills. The [[Computer Science/Data Structures/Hash-based Structures/HashMap|HashMap]] note follows these mechanics through .NET's `Dictionary`.

Two naming systems overlap here. Both use "open" and "closed," but for different boundaries:

| Common name | Also called | Where entries live | The address of a key is… |
| --- | --- | --- | --- |
| **Open hashing** | Separate chaining, **closed addressing** | Outside the array, in per-bucket lists | Fixed — one bucket, never moves |
| **Closed hashing** | **Open addressing** | Inside the array itself | Open — may end up in a slot other than its home |
| **Bucket/group layout** | Bucket addressing | Fixed-size blocks layered over chaining or probing | Depends on the overflow strategy |

Hashing names the storage boundary. Chaining can grow beyond the bucket array, so it is open hashing. Probing stays inside a fixed array, so it is closed hashing. Addressing names the placement boundary. Chaining fixes a key to one bucket, while open addressing allows it to move to another slot. But bucket size is independent of both names: either strategy may examine several adjacent slots as one bucket or group.

**Core split:** collisions land two keys in one home bucket → chain them outside the array or probe to another in-array slot. A bucket/group layout changes how many candidates one access examines, then delegates overflow to chaining or probing. The third StepTrace tab demonstrates bucketed probing.

````tabsdown
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

Each array slot holds a pointer to a secondary container — classically a linked list — of every entry that hashed there. A collision appends to that bucket's list; a lookup hashes to the bucket and scans its list with an equality check. The array slot is a fixed *address* for the key (hence "closed addressing"), but the storage behind it is open-ended (hence "open hashing").

- **Load factor** can exceed 1 because each bucket may hold a chain of entries. As a chain grows, lookup examines more candidates rather than hitting a full-table cliff. Java's `HashMap` may treeify when an insertion grows a bin past its threshold of 8 entries, but only when the table capacity is at least 64; below that it resizes instead. Equal-hash keys without a usable `Comparable` order may still require examining both tree branches.
- **Delete is direct** — unlink the node and update normal table metadata. No tombstone or probe-chain repair is required.
- **Cost is locality.** A classic linked chain is a pointer chase across the heap and can incur a cache miss per hop. .NET's `Dictionary` reduces this cost by chaining through indices into one contiguous `entries[]` array rather than heap nodes.

The price is a pointer or index per entry and, in the naive form, poor cache behaviour.

Every entry lives directly in the bucket array; there are no external lists. On a collision the table follows a deterministic **probe sequence** to the next candidate slot until it finds an empty one (for insert) or the key (for lookup). The storage is closed (a fixed array), but a key's final *address* is open — it may sit far from its home slot.

The probe sequence is the whole design:

- **Linear probing** — try `h, h+1, h+2, …`. It usually has the strongest spatial locality of these probe sequences, but collisions pile into contiguous runs (**primary clustering**) that lengthen every probe touching the run.
- **Quadratic probing** — try `h+1², h+2², h+3², …`. Breaks up primary clustering; keys with the *same* home slot still share a sequence (**secondary clustering**), and it can fail to find a free slot unless capacity and load are constrained.
- **Double hashing** — step by a second hash `h₂(key)`. The stride must be non-zero and coprime to the table capacity so the sequence can visit every slot. Key-specific strides mitigate primary and secondary clustering; they do not eliminate clustering caused by correlated or poor hashes. The cost is a second hash computation and worse locality than linear probing.

- **Load factor must stay below 1** — the array *is* the storage, so a terminating empty slot must remain reachable. As occupancy rises, probe clusters grow and a miss may inspect many occupied cells before finding that terminator. Real costs depend on hash quality, deletion history, and resize policy.
- **Deletion must preserve probe reachability.** Blindly clearing a slot can create a terminating empty before keys displaced past it. A tombstone is one strategy: lookups continue through it and inserts may reuse it, with periodic cleanup or rehashing to control accumulation. Linear probing can instead backward-shift entries or rebuild the affected local cluster; other probe schemes need a repair rule that preserves their sequence.

Open addressing often lowers pointer and cache overhead when the hash is good and the load factor is controlled. It is not overhead-free: the table reserves empty slack and needs control metadata or sentinel states to distinguish empty, occupied, and sometimes deleted slots.

The array can group `B` adjacent slots into a fixed-size **bucket**. The home reduction selects a bucket, but the full-bucket rule still comes from a collision-resolution strategy: follow an overflow chain/page, or probe another bucket. The StepTrace example uses the latter, so it is bucketed open addressing rather than a third family.

- **The bucket is the unit of locality.** A cache-line group or disk-page bucket brings several candidates into one access. SwissTable is open addressing: it scans one group of control bytes for matching 7-bit hash fragments, checks only those candidate keys, and continues its probe sequence with another group when no key or true empty control byte was found. A deleted control byte does not terminate that search; an empty one does.
- **Global load factor and local occupancy answer different questions.** Global occupancy controls overall free space; a particular bucket's occupied-slot ratio measures a local hot spot. A full home bucket can overflow while the table still has plenty of free slots elsewhere.
- **Overflow and deletion inherit the underlying strategy.** Chained overflow unlinks an entry from its chain or page. Probed overflow cannot blindly clear a slot that earlier probes depend on; it uses tombstones, backward shifting, or a local/full rebuild as its probe scheme permits.

Use bucket/group layout when memory or disk locality dominates; its tail behaviour remains the behaviour of the chosen chain or probe scheme.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Collision Resolution complexity",
  "variables": {
    "blockSize": {
      "symbol": "b",
      "description": "block or page capacity"
    },
    "inputSize": {
      "symbol": "n",
      "description": "number of entries stored in the hash table"
    },
    "keyRange": {
      "symbol": "k",
      "description": "entries in the relevant chain or treeified bin"
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
              "formula": "Resolution-dependent; scans b slots/metadata together"
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
````

# Chaining and Open-Addressing Layouts

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
>
> Keys A and B share home slot 1. Chaining links B to that slot's list. Linear probing moves B to slot 2, while bucketed probing checks the rest of bucket 1 before advancing to another bucket.

# Comparison

Chaining and probing decide where a colliding key goes. Bucket/group layout decides how many candidates one access examines. A grouped table still needs one of those overflow rules.

| Pick | When | Because |
| --- | --- | --- |
| Open hashing (chaining) | Load factor is hard to bound, hash quality is uncertain, deletes are frequent | Survives `α > 1`, degrades gracefully, delete is a pointer unlink |
| Closed hashing (open addressing) | Load factor is controlled, the hash is good, memory and speed matter | Often lowers link overhead and improves locality under moderate load |
| Bucket/group layout plus a resolution strategy | Locality dominates — on-disk pages or cache-line SIMD scans | One access covers `B` candidates. Overflow still follows a chain or probe sequence |

Chaining is the forgiving default when load is uncertain or deletes are frequent. Open addressing cuts per-entry overhead when hash distribution is good and spare capacity is acceptable. Its delete rule must preserve probe reachability. Bucket/group layout helps when the expensive access unit is a disk page or a SIMD-sized control group.

# References

- [Swiss Tables design notes (Abseil)](https://abseil.io/about/design/swisstables)
- [OpenJDK `HashMap` source](https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/HashMap.java)
