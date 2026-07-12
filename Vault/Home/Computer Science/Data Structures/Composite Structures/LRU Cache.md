---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A bounded cache evicting the least-recently-used item in O(1) via a hash map plus doubly linked list."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

A cache holds a bounded number of entries and must answer two questions on every access: where is the value for key `k`, and if the cache is full, which entry should leave. A plain [[HashMap]] answers the first in `O(1)` but has no notion of which entry is stalest, so choosing a victim means scanning every entry. Ordering the entries by recency in an array or list makes the victim obvious but turns lookup back into a scan.

An LRU (Least Recently Used) cache resolves the tension by storing the same entries in two structures at once. A [[HashMap]] maps `key → the list node holding that key`, giving `O(1)` lookup. A doubly-[[LinkedList|linked list]] threads those same nodes in recency order: most-recently-used at the head, least-recently-used at the tail. A `get` finds the node through the map, unlinks it, and splices it to the head. A `put` over capacity removes the tail node and deletes its key from the map. What can no longer be recovered is insertion order or access frequency — the list records only "how recently," and only for entries still resident.

**Core shape:** key → map → list node → recency-ordered doubly-linked list → head is MRU, tail is the eviction victim → `O(capacity)` storage.

> [!NOTE] Visualization pending
> Planned StepTrace: a hash-map-plus-recency-list card showing a `get` locating a node through the map and splicing it to the head, then a `put` over capacity evicting the tail node and deleting its map entry in the same step. No matching renderer exists in `engine.js` yet.

## Representation and invariants

Two structures hold the same set of entries, indexed differently:

- The map, a `Dictionary<TKey, Node>`, resolves a key to the exact node in `O(1)`. It never scans the list.
- The doubly-linked list orders those nodes by recency. Each node stores `key`, `value`, and both `prev`/`next` pointers. The `key` is duplicated into the node deliberately: eviction starts from a node (the tail) and must delete the corresponding map entry, which requires recovering the key without a reverse lookup.
- Sentinel `head` and `tail` nodes bracket the list. Every real node always has a non-null neighbour on each side, so splicing and unlinking are branch-free pointer rewrites with no empty-list or single-element special cases.

Three invariants define a valid state:

1. The map and the list contain exactly the same set of keys. Every map value points at a live list node, and every non-sentinel node's key is present in the map.
2. A node's position encodes recency: the node just after `head` is the most-recently-used entry, the node just before `tail` is the eviction victim.
3. The number of resident entries never exceeds `capacity`. A `put` that would exceed it evicts first.

`get(k)` reads the map, unlinks the node from between its current neighbours, and splices it after `head`. Its value and key are unchanged; only four pointers move. `put(k, v)` updates the node in place and moves it to the head when `k` is resident; otherwise it creates a node, adds it to the map, splices it after `head`, and — if invariant 3 would break — unlinks the node before `tail` and removes that node's key from the map. The recency order is an internal artifact: two caches that received the same accesses in the same order hold identical contents, but the pointer layout is not a domain value.

## Complexity

| Operation | Best time | Worst time | Structure space | Aux space per op | Cause |
| --- | --- | --- | --- | --- | --- |
| `get(k)` (hit) | `O(1)` | `O(1)` | `O(capacity)` | `O(1)` | One map lookup plus a fixed number of pointer rewrites to move the node to the head. |
| `get(k)` (miss) | `O(1)` | `O(1)` | `O(capacity)` | `O(1)` | A single failed map lookup; the list is untouched. |
| `put(k, v)` (resident or under capacity) | `O(1)` | `O(1)` | `O(capacity)` | `O(1)` | Map insert/update plus a constant splice to the head. |
| `put(k, v)` (evicting) | `O(1)` | `O(1)` | `O(capacity)` | `O(1)` | The victim is already at the tail, so eviction is one unlink plus one map delete — no search. |

Every bound is genuine worst-case constant time, not amortized: no operation ever traverses the list, because the map turns "find this node" into a hash lookup and the tail turns "find the victim" into a pointer read. The worst-case constant assumes the map's own lookup is `O(1)`, which degrades to `O(n)` under adversarial hash collisions — the same caveat that applies to the underlying [[HashMap]]. Structure space is `O(capacity)`: the map holds one entry per resident key and the list holds one node per resident key, so the two structures together are a constant factor over the entries themselves.

## When the composite breaks

The failure modes all stem from the map and the list being two views that must agree.

A `get`-to-front move requires unlinking a node from the *middle* of the list in `O(1)`. That is only possible because the list is doubly linked: the node reached through the map exposes both neighbours, so `node.prev.next = node.next` and `node.next.prev = node.prev` splice it out directly. A singly-linked list would expose only the successor, forcing an `O(n)` scan from the head to find the predecessor before the node could move — which collapses the entire `O(1)` guarantee. This is why a [[Circular Buffer]] or a plain queue does not suffice for LRU: they cannot promote an arbitrary interior entry in constant time.

The map and the list must be updated in lockstep, or they desynchronize. An eviction that unlinks the tail node but forgets to delete its key from the map leaves a stale key that resolves to a node no longer in the list: later `get`s return a value for an entry that was supposed to be gone (a false hit), and the node is unreachable for eviction (a leak). The inverse — deleting the map entry but leaving the node linked — leaves an orphan occupying a recency slot that can never be looked up or promoted, permanently shrinking the effective capacity by one.

Capacity is what forces an eviction *policy* to exist at all. An unbounded [[HashMap]] never evicts and needs neither the list nor a victim rule; the moment a size bound is imposed, some entry must be chosen to leave, and LRU's choice is "the tail." That choice has a known weakness: a single large scan touches many keys once, marching each to the head and pushing the genuinely hot working set toward the tail until it is evicted — cache pollution. LRU trades that vulnerability for its simplicity.

The composite is not atomic. A `get` performs a map read followed by several pointer writes; a concurrent `put` interleaving between them can splice against neighbours the `get` already moved, corrupting the list. LRU needs external locking (or a sharded/striped design) — neither the map nor the list provides safe concurrent mutation on its own.

## Reference drawer

> [!ABSTRACT]- Map into a recency-ordered list
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
> ```csharp
> public sealed class LruCache<TKey, TValue> where TKey : notnull
> {
>     private readonly int _capacity;
>     private readonly Dictionary<TKey, LinkedListNode<(TKey Key, TValue Value)>> _map = new();
>     private readonly LinkedList<(TKey Key, TValue Value)> _order = new(); // head = MRU, tail = LRU
>
>     public LruCache(int capacity) => _capacity = capacity;
>
>     public bool TryGet(TKey key, out TValue value)
>     {
>         if (_map.TryGetValue(key, out var node))
>         {
>             _order.Remove(node);        // unlink from the middle in O(1)
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
>             _order.Remove(existing);    // will be re-added at the head below
>         }
>         else if (_map.Count >= _capacity)
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
> `LinkedList<T>` is doubly linked, so `Remove(node)` is `O(1)` given the node. The tuple carries the `Key` so eviction can delete the map entry starting from the tail node alone, with no reverse lookup.

## Comparison

| Cache | Eviction victim | Lookup | Ordering kept | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| LRU cache | Least recently *used* (tail) | `O(1)` | Recency of access | Recent access predicts reuse (temporal locality) | A single large scan flushes the hot set |
| LFU cache | Least *frequently* used | `O(1)` with frequency buckets | Access counts | Popularity is stable and frequency predicts reuse | Cold-start bias; slow to drop a once-popular key; more bookkeeping |
| FIFO / [[Circular Buffer]] cache | Oldest *inserted* | `O(1)` | Insertion order only | Entries expire by age and reuse is irrelevant | Ignores reuse entirely; evicts hot entries that were inserted early |
| Plain [[HashMap]] | None (unbounded) | `O(1)` | None | The working set fits in memory with no bound | No eviction, so it grows without limit |
| .NET `MemoryCache` | Size / time / priority policies | `O(1)` | Metadata-driven | Absolute size limits, expirations, and eviction callbacks are needed | Not strict LRU; recency is one signal among several |

An LRU cache is the `O(1)` recency-eviction cache: it pays for two synchronized structures and gives constant-time lookup, promotion, and eviction in return, and it fits workloads where recent access is the best available predictor of reuse. An LFU cache becomes stronger when frequency predicts reuse better than recency — a stable set of popular keys that a one-off scan should not dislodge. A FIFO or [[Circular Buffer]] cache is simpler still but blind to reuse, fitting only age-based expiry. A plain [[HashMap]] is the right structure precisely when the working set is unbounded and no entry ever needs to leave.

## Questions

> [!QUESTION]- Why must the recency list be doubly linked rather than singly linked?
> A `get` promotes a node from the middle of the list to the head, which means unlinking it in `O(1)`. Splicing a node out needs its predecessor. A doubly-linked node exposes `prev` directly, so the rewrite is constant time. A singly-linked list would scan from the head to find the predecessor — `O(n)` — collapsing the cache's constant-time guarantee.

> [!QUESTION]- How do the map and the list divide the work, and why store the key inside the node?
> The map answers "where is key `k`" in `O(1)`; the list answers "what is the recency order" and supports `O(1)` move-to-head and remove-from-tail. Eviction starts from the tail *node* and must delete the matching map entry, so the node carries its own key to recover it without a reverse lookup from node to key.

> [!QUESTION]- What corruption results from updating only one of the two structures on eviction?
> Removing the tail node but leaving its key in the map produces stale keys that resolve to evicted nodes — false hits and an unreachable node that leaks. Deleting the map entry but leaving the node linked produces an orphan that occupies a recency slot yet can never be looked up, permanently reducing effective capacity.

> [!QUESTION]- Why is every LRU operation worst-case `O(1)` rather than amortized, and where does that break down?
> No operation traverses the list: the map turns lookup into a hash probe and the tail sentinel makes the victim a pointer read, so each op is a fixed number of rewrites. The one dependency is the map's own lookup, which degrades to `O(n)` under adversarial hash collisions — the same caveat as the underlying hash map.

## References

- [Cache replacement policies](https://en.wikipedia.org/wiki/Cache_replacement_policies) — LRU, LFU, FIFO, and adaptive policies compared, including the scan-resistance weakness of plain LRU.
- [LRU Cache (LeetCode #146)](https://leetcode.com/problems/lru-cache/) — the canonical exercise requiring `O(1)` `get`/`put`, which forces the hash-map-plus-doubly-linked-list composition.
- [`MemoryCache` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/Microsoft.Extensions.Caching.Memory/src/MemoryCache.cs) — the runtime cache built on size, expiration, and priority policies rather than strict LRU.
- [Design of a modern cache (Caffeine)](https://github.com/ben-manes/caffeine/wiki/Efficiency) — why production caches favour W-TinyLFU admission over plain recency eviction to resist scan pollution.
