---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A bounded cache that evicts the least-recently-used item through a hash map plus doubly linked list."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

A cache holds a bounded number of entries and must answer two questions on every access: where is the value for key `k`, and if the cache is full, which entry should leave. Ordering the entries by recency in an array or list makes the victim obvious but turns lookup back into a scan.

An LRU (Least Recently Used) cache resolves the tension by storing the same entries in two structures at once. A doubly-[[Home/Computer Science/Data Structures/Linear Structures/LinkedList|linked list]] threads those same nodes in recency order: most-recently-used at the head, least-recently-used at the tail. A `get` finds the node through the map, unlinks it, and splices it to the head. A `put` over capacity removes the tail node and deletes its key from the map. What can no longer be recovered is insertion order or access frequency — the list records only "how recently," and only for entries still resident.

**Core shape:** key → map → list node → recency-ordered doubly-linked list → head is MRU, tail is the eviction victim

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"lru-cache"}
```

The cache below has capacity four. The map stores node addresses, while the linked chain orders the same nodes from MRU on the left to LRU on the right. `Get` promotes a hit; `Put` updates or inserts at MRU and evicts the tail when full.

#### Representation and Invariants

Two structures hold the same set of entries, indexed differently:

- It never scans the list.
- The doubly-linked list orders those nodes by recency. Each node stores `key`, `value`, and both `prev`/`next` pointers. The `key` is duplicated into the node deliberately: eviction starts from a node (the tail) and must delete the corresponding map entry, which requires recovering the key without a reverse lookup.
- Sentinel `head` and `tail` nodes bracket the list. Every real node always has a non-null neighbour on each side, so splicing and unlinking are branch-free pointer rewrites with no empty-list or single-element special cases.

Three invariants define a valid state:

1. The map and the list contain exactly the same set of keys. Every map value points at a live list node, and every non-sentinel node's key is present in the map.
2. A node's position encodes recency: the node just after `head` is the most-recently-used entry, the node just before `tail` is the eviction victim.
3. The number of resident entries never exceeds `capacity`. A `put` that would exceed it evicts first.

`get(k)` reads the map, unlinks the node from between its current neighbours, and splices it after `head`. Its value and key are unchanged; the move uses a fixed six pointer assignments. `put(k, v)` updates the same node in place and moves it to the head when `k` is resident; otherwise, if the cache is full, it first unlinks the node before `tail` and removes that node's key from the map, then creates the new node in both structures. The recency order is an internal artifact: two caches that received the same accesses in the same order hold identical contents, but the pointer layout is not a domain value.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "LRU Cache complexity",
  "variables": {
    "configuredCapacity": {
      "symbol": "capacity",
      "description": "maximum number of entries the cache may retain"
    },
    "inputSize": {
      "symbol": "n",
      "description": "number of resident cache entries"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "get(k) (hit)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Expected time",
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
          "operation": "get(k) (miss)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Expected time",
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
          "operation": "put(k, v) (resident)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Expected time",
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
          "operation": "put(k, v) (new, under capacity)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Expected time",
              "formula": "O(1) amortized",
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
          "operation": "put(k, v) (evicting)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Expected time",
              "formula": "O(1) expected",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst time",
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
          "operation": "get(k) (hit)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(capacity)",
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
          "operation": "get(k) (miss)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(capacity)",
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
          "operation": "put(k, v) (resident)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(capacity)",
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
          "operation": "put(k, v) (new, under capacity)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(capacity)",
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
          "operation": "put(k, v) (evicting)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(capacity)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# When the Composite Breaks

The failure modes all stem from the map and the list being two views that must agree.

That is only possible because the list is doubly linked: the node reached through the map exposes both neighbours, so `node.prev.next = node.next` and `node.next.prev = node.prev` splice it out directly. This is why a [[Home/Computer Science/Data Structures/Linear Structures/Circular Buffer|circular buffer]] or a plain queue does not suffice for LRU: neither can promote an arbitrary interior entry without first finding its predecessor.

The map and the list must be updated in lockstep, or they desynchronize. An eviction that unlinks the tail node but forgets to delete its key from the map leaves a stale key that resolves to a node no longer in the list: later `get`s return a value for an entry that was supposed to be gone (a false hit), and the node is unreachable for eviction (a leak). The inverse — deleting the map entry but leaving the node linked — leaves an orphan occupying a recency slot that can never be looked up or promoted, permanently shrinking the effective capacity by one.

Capacity is what forces an eviction *policy* to exist at all. An unbounded [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|hash map]] never evicts and needs neither the list nor a victim rule; the moment a size bound is imposed, some entry must be chosen to leave, and LRU's choice is "the tail." That choice has a known weakness: a single large scan touches many keys once, marching each to the head and pushing the genuinely hot working set toward the tail until it is evicted — cache pollution. LRU trades that vulnerability for its simplicity.

The composite is not atomic. A `get` performs a map read followed by several pointer writes; a concurrent `put` interleaving between them can splice against neighbours the `get` already moved, corrupting the list. LRU needs external locking (or a sharded/striped design) — neither the map nor the list provides safe concurrent mutation on its own.

# Reference Drawer

> [!ABSTRACT]- Map into a recency-ordered list
>
> ```mermaid
> flowchart LR
>   subgraph Map["HashMap: key -> node"]
>     K1["k=A"]
>     K2["k=B"]
>     K3["k=C"]
>   end
>   H["head (sentinel)"] --> A["A (MRU)"] --> B["B"] --> C["C (LRU / next evicted)"] --> T["tail (sentinel)"]
>   K1 -.-> A
>   K2 -.-> B
>   K3 -.-> C
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class LruCache<TKey, TValue> where TKey : notnull
> {
>     private readonly int _capacity;
>     private readonly Dictionary<TKey, LinkedListNode<(TKey Key, TValue Value)>> _map = new();
>     private readonly LinkedList<(TKey Key, TValue Value)> _order = new(); // head = MRU, tail = LRU
>
>     public LruCache(int capacity)
>     {
>         if (capacity <= 0)
>         {
>             throw new ArgumentOutOfRangeException(nameof(capacity));
>         }
>
>         _capacity = capacity;
>     }
>
>     public bool TryGet(TKey key, out TValue value)
>     {
>         if (_map.TryGetValue(key, out var node))
>         {
>             _order.Remove(node);        // unlink directly from the middle
>             _order.AddFirst(node);      // promote to most-recently-used
>             value = node.Value.Value;
>             return true;
>         }
>
>         value = default!;
>         return false;
>     }
>
>     public void Put(TKey key, TValue value)
>     {
>         if (_map.TryGetValue(key, out var existing))
>         {
>             existing.Value = (key, value);
>             _order.Remove(existing);
>             _order.AddFirst(existing);
>             return;
>         }
>
>         if (_map.Count >= _capacity)
>         {
>             var victim = _order.Last!;  // tail = least-recently-used
>             _order.RemoveLast();
>             _map.Remove(victim.Value.Key); // delete BOTH views together
>         }
>
>         var node = _order.AddFirst((key, value));
>         _map[key] = node;
>     }
> }
> ```
> The tuple carries the `Key` so eviction can delete the map entry starting from the tail node alone, with no reverse lookup.

# Comparison

| Cache | Eviction victim | Stronger case | Weaker case |
| --- | --- | --- | --- |
| LRU cache | Least recently *used* (tail) | Recent access predicts reuse (temporal locality) | A single large scan flushes the hot set |
| LFU cache | Least *frequently* used | Popularity is stable and frequency predicts reuse | Cold-start bias; slow to drop a once-popular key; more bookkeeping |
| FIFO / [[Home/Computer Science/Data Structures/Linear Structures/Circular Buffer | circular buffer]] cache | Insertion order only | Insertion order is an acceptable eviction proxy and reuse is irrelevant | Ignores reuse entirely; evicts hot entries that were inserted early |
| Plain [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap | hash map]] | None | The working set fits in memory with no bound | No eviction, so it grows without limit |
| .NET `MemoryCache` | Size / time / priority policies | Absolute size limits, expirations, and eviction callbacks are needed | Not strict LRU; recency is one signal among several |

An LFU cache becomes stronger when frequency predicts reuse better than recency — a stable set of popular keys that a one-off scan should not dislodge. A FIFO or [[Home/Computer Science/Data Structures/Linear Structures/Circular Buffer|circular buffer]] cache is simpler still but blind to reuse, fitting only insertion-order eviction. A plain [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|hash map]] is the right structure precisely when the working set is unbounded and no entry ever needs to leave.

# Questions

> [!QUESTION]- What corruption results from updating only one of the two structures on eviction?
> Removing the tail node but leaving its key in the map produces stale keys that resolve to evicted nodes — false hits and an unreachable node that leaks. Deleting the map entry but leaving the node linked produces an orphan that occupies a recency slot yet can never be looked up, permanently reducing effective capacity.

# References

- [Cache replacement policies](https://en.wikipedia.org/wiki/Cache_replacement_policies) — LRU, LFU, FIFO, and adaptive policies compared, including the scan-resistance weakness of plain LRU.
- [LRU Cache (LeetCode #146)](https://leetcode.com/problems/lru-cache/) — the canonical exercise whose direct `get`/`put` requirement forces the hash-map-plus-doubly-linked-list composition.
- [`MemoryCache` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/Microsoft.Extensions.Caching.Memory/src/MemoryCache.cs) — the runtime cache built on size, expiration, and priority policies rather than strict LRU.
- [Design of a modern cache (Caffeine)](https://github.com/ben-manes/caffeine/wiki/Efficiency) — why production caches favour W-TinyLFU admission over plain recency eviction to resist scan pollution.
