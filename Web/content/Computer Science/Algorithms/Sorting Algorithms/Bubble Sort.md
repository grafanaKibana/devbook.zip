---
publish: true
created: 2026-07-12T14:27:20.412Z
modified: 2026-07-12T14:27:20.412Z
published: 2026-07-12T14:27:20.412Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Repeatedly swaps adjacent out-of-order elements; a slow teaching baseline for why better sorts exist.
level:
  - "4"
priority: Low
status: Ready to Repeat
---

# Intro

Sorting an array when the only permitted move is swapping two adjacent elements forces every value to walk to its place one position at a time. Bubble sort is what that constraint produces: a left-to-right pass compares each `a[i]` with `a[i+1]` and swaps on `a[i] > a[i+1]`, so a value larger than everything to its right keeps winning those comparisons and is carried to the end of the pass. One pass is therefore enough to seat the largest unsorted element in its final slot.

Adjacency is also the cost. An element that starts `k` positions from where it belongs needs at least `k` swaps to get there, and a left-to-right pass can move it toward the front by only one step. Random input therefore takes a quadratic number of comparisons. The one lever against that is a per-pass flag: a pass that performs no swap proves the array is already ordered and ends the sort.

**Core shape:** adjacent compare-and-swap → each pass settles one more tail element → a swap-free pass ends the sort → `O(n²)` comparisons, `O(1)` extra space, `O(n)` on already-sorted input.

## One sort

The trace sorts `[8, 3, 5, 1, 9, 2, 7, 4]` with left-to-right compare-and-swap passes.

```steptrace
{"algorithm":"bubble-sort","array":[8,3,5,1,9,2,7,4]}
```

`9` is the largest value in the first pass. Once a swap brings it into the traveling comparison window it beats every element to its right and slides to index 7, its permanent position. The next pass stops one element short because that tail slot is already correct, and each later pass shortens again as the sorted suffix grows leftward. The `swapped` flag watches for the moment this settling is complete: the first pass that finishes without a single swap means no adjacent pair is out of order, so the whole array is sorted and the loop exits.

## Why a pass settles the tail

The invariant is local: after comparing and swapping `a[i]` and `a[i+1]`, the larger of the two sits at `i+1`. Carried across a full pass, the running maximum is always held at the current index and pushed rightward, so it ends the pass at the far end. After pass `k`, the last `k` positions hold the `k` largest values in order and are never touched again — which is why the scanned range can shrink by one each pass.

The `swapped` flag turns "no work happened" into a stopping condition. On already-sorted input the first pass makes zero swaps and the sort ends after `n-1` comparisons — the `O(n)` best case. Removing the flag forfeits exactly that: the plain double loop always runs its full `Θ(n²)` comparisons regardless of order, so sorted input costs the same as random input.

Two properties fall out of the mechanism. The sort is **stable** because a swap happens only on a strict `a[i] > a[i+1]`; equal keys never cross, so their input order survives. It is **in-place** because the only extra storage is a couple of loop indices and the boolean flag — `O(1)` regardless of input size.

## Where adjacency hurts

A large value can travel any distance toward the end in one pass, but a small value moves toward the front by at most one index per pass. On `[2, 3, 4, 5, 1]` the `1` shifts left exactly one slot each pass — `[2, 3, 4, 1, 5]`, then `[2, 3, 1, 4, 5]` — and needs four passes to reach the front even though the array is otherwise sorted. These trailing small values are the classic "turtles": each one forces roughly one pass per position it must travel, and they, not the large values, set the pass count.

> [!NOTE]
> Cocktail-shaker sort is the bidirectional variant: it alternates a left-to-right pass that lifts the maximum with a right-to-left pass that drags the minimum down. The reverse pass lets a turtle descend many positions at once, cutting the pass count on inputs like the one above, but the total comparison work stays `Θ(n²)`.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(n)` | `O(1)` | Already sorted; the first pass makes no swap and the early-exit flag stops after one pass. |
| Average | `O(n²)` | `O(1)` | Random order; about `n²/4` swaps over `~n²/2` comparisons. |
| Worst | `O(n²)` | `O(1)` | Reverse-sorted; every adjacent pair is out of order, forcing `n(n-1)/2` swaps and comparisons. |

Auxiliary space is `O(1)` in every case: the array is sorted in place and only indices and the flag are added. The `O(n)` best case exists only with the early-exit flag; without it the best case degrades to `Θ(n²)`.

## Reference drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> graph TD
>   A[Start array A] --> B[Set swapped true]
>   B --> C{swapped}
>   C -->|No| Z[Done]
>   C -->|Yes| D[Set swapped false]
>   D --> E[Set i to 0]
>   E --> F{i less than n minus 1}
>   F -->|No| C
>   F -->|Yes| G{A at i greater than A at i plus 1}
>   G -->|Yes| H[Swap A at i and A at i plus 1 and set swapped true]
>   G -->|No| I[No op]
>   H --> J[Increment i]
>   I --> J
>   J --> F
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void BubbleSort(int[] a)
> {
>     int n = a.Length;
>     bool swapped;
>     do
>     {
>         swapped = false;
>         for (int i = 0; i < n - 1; i++)
>         {
>             if (a[i] > a[i + 1])
>             {
>                 (a[i], a[i + 1]) = (a[i + 1], a[i]);
>                 swapped = true;
>             }
>         }
>         n--; // last element is already in place
>     } while (swapped);
> }
> ```
>
> `n--` shrinks the scanned range because each pass leaves one more settled element at the tail; the `do/while` runs at least one pass and the `swapped` flag ends the sort after the first pass with no swap.

## Questions

> [!QUESTION]- What does the `swapped` flag detect, and what does omitting it cost?
> A pass that completes with no swap means no adjacent pair is out of order, so the array is sorted and the loop can stop. On already-sorted input this ends the sort after one `O(n)` pass. Without the flag the double loop always runs its full `Θ(n²)` comparisons, so sorted input costs as much as random input and the `O(n)` best case is gone.

> [!QUESTION]- Why can a large value reach its final slot in one pass while a small value at the tail takes many?
> A left-to-right pass carries the running maximum forward through consecutive swaps, so a large value can cross the whole array in a single pass. The same pass only ever compares a given element with its left neighbor once, so a small value ("turtle") near the end moves toward the front by at most one index per pass and needs about one pass per position it must travel.

> [!QUESTION]- Why is bubble sort stable?
> A swap happens only on a strict `a[i] > a[i+1]`. Equal keys never satisfy that test, so they are never exchanged and their original relative order is preserved through every pass.

## References

- [Bubble sort](https://en.wikipedia.org/wiki/Bubble_sort) — pass structure, the early-exit optimization, stability, and the cocktail-shaker variant.
- [`Array.Sort` method](https://learn.microsoft.com/en-us/dotnet/api/system.array.sort) — .NET's general-purpose sort; the remarks document the introsort scheme (insertion sort under 16 elements, heapsort past a recursion-depth limit, quicksort otherwise) and that it is not stable.
- [Bubble Sort: An Archaeological Algorithmic Analysis](https://users.cs.duke.edu/~ola/papers/bubble.pdf) — Owen Astrachan's SIGCSE analysis of bubble sort's history, performance, and why it persists in teaching.
