---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A forest of binomial trees mirroring the item count's binary form, giving O(log n) meld."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A priority queue must sometimes absorb another whole priority queue — merge two work sets, join two event streams — and keep answering "smallest first". An array-backed [[Heap|binary heap]] cannot do this cheaply: its elements sit in one contiguous block, so combining two of them means concatenating and re-heapifying in `O(n)`. The contiguous layout that makes a binary heap fast to index is exactly what makes it slow to union.

A binomial queue (binomial heap) trades that single array for a **forest of heap-ordered binomial trees, at most one tree of each order**. A binomial tree `Bₖ` holds exactly `2ᵏ` nodes and is built by **linking** two `Bₖ₋₁` trees — the root with the larger key becomes a child of the other. Because each order appears at most once, the set of orders present is the **binary representation of `n`**: a queue of 13 items (`1101₂`) holds trees of orders 3, 2, and 0, sized 8 + 4 + 1. Merging two such forests then runs like adding two binary numbers, and the whole union costs `O(log n)`.

What the forest gives up is compactness and locality. Nodes are separate allocations wired by child and sibling pointers, so every traversal chases references instead of striding an array, and the minimum is no longer at a fixed slot.

**Core shape:** items → forest of heap-ordered binomial trees, one per order → orders present = binary digits of `n` → meld = binary addition of orders → `O(log n)` union, `O(n)` pointered storage.

> [!NOTE] Visualization pending
> Planned StepTrace: a forest-merge card showing two binomial forests melded like binary addition — equal-order trees link into the next order and the carry propagates up until each order is present at most once. No matching renderer exists in `engine.js` yet.

# Meld = binary addition

Insert, extract-min, and union all reduce to one primitive: **meld**. Walk both forests from the lowest order upward. When two trees share an order `k`, they **link** in `O(1)` — the root with the larger key becomes the leftmost child of the smaller-keyed root, producing one tree of order `k + 1`. That new tree is a **carry** into the next order, propagated exactly as when adding two binary numbers. At most `⌊log₂ n⌋ + 1` orders exist, so the walk — and therefore meld — is `O(log n)` worst case.

```text
13 items: orders {3,2,0}   +   6 items: orders {2,1}
order 0: 1 + 0 = 1                 → keep the order-0 tree
order 1: 0 + 1 = 1                 → keep the order-1 tree
order 2: 1 + 1 = 0 carry 1         → link the two order-2 trees
order 3: 1 + 0 + carry = 0 carry 1 → link again
order 4: carry = 1                 → one order-4 tree
19 items: orders {4,1,0} ✓   (13 + 6 = 19 = 10011₂)
```

The decisive transition is the carry at order 2: two separate 4-node trees stop being roots and become a single 8-node tree, which then collides with the order-3 tree and carries again. Heap order survives every link because linking only ever puts a larger root under a smaller one, so the smaller stays on top.

The other operations are corollaries:

- **Insert** melds the queue with a single-node `B₀` — a binary increment. A carry chain that links at every order is possible but rare, which is what makes insert amortized `O(1)` (below).
- **Extract-min** removes the winning root; its `k` children have orders `k−1 … 0` and are already a valid binomial forest, so reversing them into a root list and melding them back restores the invariant in `O(log n)`.
- **Find-min** scans the `≤ log n` roots, or reads a cached min-pointer for `O(1)`.
- **Decrease-key** lowers a key and sifts it up its own tree, whose height is `≤ log n`.

# Representation and invariants

Each item is a heap node holding a key, a `degree` (the order of the tree it roots or the subtree it heads), a `child` pointer to its leftmost child, and a `sibling` pointer. Roots form a singly linked list kept in **strictly increasing order**; a node's children are likewise linked by `sibling` in decreasing order, which is the shape reversing produces during extract-min.

Four invariants define a valid state:

1. **Heap order** — every node's key is `≤` each of its children's keys, so a tree's minimum is its root.
2. **Binomial shape** — a root of degree `k` has exactly `k` children, of degrees `k−1 … 0`, and its subtree holds `2ᵏ` nodes.
3. **At most one tree per order** — the multiset of root degrees has no repeats; it equals the binary digits of `n`.
4. **Sorted root list** — root degrees strictly increase along the sibling chain, which lets meld merge two lists in one linear pass before combining carries.

Linking is the only operation that changes parentage, and it only ever attaches one root beneath another root. No interior node is ever re-parented in isolation, so heap order and binomial shape are preserved by construction rather than repaired afterward.

# Complexity

| Operation | Best time | Amortized time | Worst time | Space | Cause |
| --- | --- | --- | --- | --- | --- |
| Storage (`n` items) | — | — | — | `O(n)` nodes + child/sibling/parent pointers | One node per item; `≤ log n` roots; the binary shape of `n` fixes which orders exist |
| Meld | `O(log n)` | `O(log n)` | `O(log n)` | `O(1)` aux | Merge two sorted root lists, then combine equal-order carries — one pass over `≤ log n` orders |
| Insert | `O(1)` | `O(1)` | `O(log n)` | `O(1)` aux | Meld with a single `B₀`; a full carry chain is rare, so the binary-counter increment argument gives `O(1)` amortized |
| Find-min | `O(1)` | — | `O(log n)` | `O(1)` aux | `O(1)` from a cached min-pointer, otherwise scan the `≤ log n` roots |
| Extract-min | `O(log n)` | `O(log n)` | `O(log n)` | `O(1)` aux | Find the min root, reverse its `≤ log n` children into a forest, and meld that back |
| Decrease-key | `O(log n)` | — | `O(log n)` | `O(1)` aux | Sift the lowered key up its own binomial tree, whose height is `≤ log n` |

The amortized `O(1)` for insert and the worst-case `O(log n)` describe the same operation. A single insert can trigger a carry at every filled order — that is the `O(log n)` worst case — but each carry only fires because earlier cheap inserts left those orders occupied. The potential argument that bounds a binary counter's increment at amortized `O(1)` applies unchanged: across a run of `m` inserts, total linking work is `O(m)`.

Find-min is `O(log n)` unless a min-pointer is maintained across meld and extract-min; the pointer is cheap to keep current since both operations already touch every root. Space is dominated by per-node pointers — three references per item on top of the key — which is the concrete cost of choosing a forest over an array.

# When the structure stops fitting

The pointered forest is what buys `O(log n)` meld, and it is also where the structure loses to a plain binary heap on every non-melding workload. A binary heap keeps `n` keys in one array with implicit `2i+1 / 2i+2` child indices: no per-node pointers, no allocation per insert, and sequential memory that the cache prefetches. A binomial queue pays a pointer chase per level and an allocation per node. For a priority queue that never unions, that overhead is pure loss — the binary heap is flatly faster with the same `O(log n)` bounds.

Find-min degrades the moment the min-pointer is dropped. Without it, the minimum is not at a known slot the way it is in a binary heap's `a[0]`; it is one of up to `log n` roots and must be found by a scan. Any code that peeks far more often than it melds either maintains the pointer or accepts `O(log n)` peeks.

Decrease-key is `O(log n)`, not the `O(1)` amortized a [[Fibonacci Heaps|Fibonacci heap]] reaches, because a lowered key must sift all the way up its binomial tree rather than being cut out and reinserted lazily. A shortest-path relaxation that calls decrease-key on the order of `E` times therefore pays `O(E log n)` here — the workload where the binomial heap's structure is the wrong bet.

# Reference drawer

> [!ABSTRACT]- Forest shape for `n = 13` (`1101₂`)
> ```mermaid
> graph TD
>   subgraph B3 ["order 3 · 8 nodes"]
>     R3((root)) --> A3((·))
>     R3 --> B3b((·))
>     R3 --> C3((·))
>   end
>   subgraph B2 ["order 2 · 4 nodes"]
>     R2((root)) --> A2((·))
>     R2 --> B2b((·))
>   end
>   subgraph B0 ["order 0 · 1 node"]
>     R0((root))
>   end
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> public sealed class BinomialHeap
> {
>     private sealed class Node(int key)
>     {
>         public int Key = key;
>         public int Degree;
>         public Node? Child, Sibling, Parent;
>     }
>
>     private Node? _head; // roots in strictly increasing degree order
>
>     // Attach the larger-keyed root as leftmost child of the smaller-keyed one.
>     private static void Link(Node child, Node root)
>     {
>         child.Parent = root;
>         child.Sibling = root.Child;
>         root.Child = child;
>         root.Degree++;
>     }
>
>     // Merge two sorted root lists by ascending degree.
>     private static Node? MergeRoots(Node? a, Node? b)
>     {
>         var dummy = new Node(0);
>         var tail = dummy;
>         while (a != null && b != null)
>         {
>             if (a.Degree <= b.Degree) { tail.Sibling = a; a = a.Sibling; }
>             else { tail.Sibling = b; b = b.Sibling; }
>             tail = tail.Sibling;
>         }
>         tail.Sibling = a ?? b;
>         return dummy.Sibling;
>     }
>
>     // Meld = merge root lists, then resolve equal-degree carries in one pass.
>     private static Node? Meld(Node? a, Node? b)
>     {
>         var head = MergeRoots(a, b);
>         if (head == null) return null;
>
>         Node? prev = null;
>         var curr = head;
>         var next = curr.Sibling;
>         while (next != null)
>         {
>             var deferred = curr.Degree != next.Degree
>                 || (next.Sibling != null && next.Sibling.Degree == curr.Degree);
>             if (deferred)
>             {
>                 prev = curr;
>                 curr = next;                 // different degrees, or three-in-a-row: defer
>             }
>             else if (curr.Key <= next.Key)
>             {
>                 curr.Sibling = next.Sibling;
>                 Link(next, curr);            // next carries under curr
>             }
>             else
>             {
>                 if (prev == null) head = next; else prev.Sibling = next;
>                 Link(curr, next);            // curr carries under next
>                 curr = next;
>             }
>             next = curr.Sibling;
>         }
>         return head;
>     }
>
>     public void Insert(int key) => _head = Meld(_head, new Node(key));
>
>     public int Min()
>     {
>         if (_head == null) throw new InvalidOperationException("empty heap");
>         var min = _head.Key;
>         for (var r = _head.Sibling; r != null; r = r.Sibling)
>             if (r.Key < min) min = r.Key;
>         return min; // O(1) if a min-pointer is cached across meld/extract
>     }
>
>     public int ExtractMin()
>     {
>         if (_head == null) throw new InvalidOperationException("empty heap");
>
>         Node? minPrev = null, min = _head, prev = _head;
>         for (var curr = _head.Sibling; curr != null; prev = curr, curr = curr.Sibling)
>             if (curr.Key < min.Key) { min = curr; minPrev = prev; }
>
>         if (minPrev == null) _head = min.Sibling; else minPrev.Sibling = min.Sibling;
>
>         Node? reversed = null;               // children come out in decreasing degree
>         for (var c = min.Child; c != null;)
>         {
>             var nextChild = c.Sibling;
>             c.Parent = null;
>             c.Sibling = reversed;
>             reversed = c;
>             c = nextChild;
>         }
>
>         _head = Meld(_head, reversed);
>         return min.Key;
>     }
> }
> ```
> `Meld` defers a link when three consecutive roots share a degree, letting the trailing pair carry on the next iteration — this is the case a naive equal-degree link would corrupt.

# Questions

> [!QUESTION]- How does extract-min stay `O(log n)` when the heap is a forest rather than one tree?
> The minimum is a root (heap order holds within each tree), so it is found by scanning the `≤ log n` roots. Removing a root of order `k` exposes its `k` children, which already have orders `k−1 … 0` — a valid binomial forest. Reversing them into a root list and melding that back costs another `O(log n)`.

> [!QUESTION]- Why is insert amortized `O(1)` when its worst case is `O(log n)`?
> Insert melds in a single `B₀`, which is a binary increment. A long carry chain that links at every order is the `O(log n)` worst case, but it can only happen because earlier cheap inserts left those orders filled. The potential argument that bounds a binary counter's increment at amortized `O(1)` per operation applies directly, so `m` inserts cost `O(m)` total.

# References

- [Vuillemin, "A data structure for manipulating priority queues" (CACM 1978)](https://dl.acm.org/doi/10.1145/359460.359478) — the original binomial queue paper defining tree orders, linking, and the binary-addition meld.
- [Binomial heap (Wikipedia)](https://en.wikipedia.org/wiki/Binomial_heap) — order definitions, the meld walkthrough, and the amortized-insert analysis via the binary counter.
- [Vuillemin, "A data structure for manipulating priority queues" (CACM, 1978)](https://doi.org/10.1145/359460.359478) — the original binomial-queue paper: the forest-as-binary-counter representation and the meld-by-carry union.
