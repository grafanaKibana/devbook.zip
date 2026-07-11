---
publish: true
created: 2026-07-11T16:49:43.033Z
modified: 2026-07-11T16:49:43.033Z
published: 2026-07-11T16:49:43.033Z
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

A greedy algorithm builds a solution by repeatedly making the choice that looks best **right now**, never reconsidering. It's the simplest and fastest design paradigm — usually a sort plus a single linear pass — but it's only _correct_ when local optimality provably leads to global optimality. That's the catch: greedy is fast when it works and silently wrong when it doesn't, so the real work is **proving** it applies. It powers Dijkstra, Huffman coding, Kruskal/Prim's MST, interval scheduling, and many scheduling/allocation problems.

## How It Works

The template is almost always:

1. Define a **greedy choice** — a local rule for picking the next element (earliest finish time, smallest weight, highest ratio…).
2. **Sort** or use a priority queue so the best local choice is cheap to find.
3. Iterate once, taking each choice that remains feasible, committing irrevocably.

It's correct only with two properties:

- **Greedy-choice property** — a globally optimal solution can be reached by making locally optimal choices (you never need to undo one). Proven by an **exchange argument**: show any optimal solution can be transformed, swap by swap, into the greedy one without getting worse.
- **Optimal substructure** — after making the greedy choice, what remains is the same problem on a smaller input.

## Example

Activity selection — the maximum number of non-overlapping intervals. The provably correct greedy rule is **"always pick the interval that finishes earliest"** (which leaves the most room for the rest):

```csharp
public static int MaxActivities((int start, int end)[] acts)
{
    Array.Sort(acts, (a, b) => a.end.CompareTo(b.end)); // earliest finish first
    int count = 0, lastEnd = int.MinValue;
    foreach (var (start, end) in acts)
        if (start >= lastEnd)        // compatible with the last chosen
        {
            count++;
            lastEnd = end;
        }
    return count;
}
```

Coin change with a **canonical** coin system (greedy is optimal for {1,5,10,25}):

```csharp
public static int CoinsGreedy(int[] coins, int amount) // coins sorted desc
{
    int count = 0;
    foreach (var c in coins)
    {
        count += amount / c;
        amount %= c;
    }
    return amount == 0 ? count : -1;
}
```

## Pitfalls

- **Greedy is often plausible but wrong** — coin change is the cautionary tale: greedy is optimal for standard currency but **fails** for coin sets like {1, 3, 4} making 6 (greedy → 4+1+1 = 3 coins; optimal → 3+3 = 2 coins). Always verify with a proof or counter-example; "it looks obviously optimal" is not a proof.
- **No proof, no greedy** — if you can't construct an exchange argument, assume greedy is unsafe and fall back to [[Dynamic Programming]] (which _does_ solve general coin change and 0/1 knapsack, where greedy fails).
- **Wrong greedy criterion** — many problems have several tempting local rules, only one of which is correct (activity selection needs _earliest finish_, not _shortest duration_ or _earliest start_). Picking the wrong key gives a confident wrong answer.
- **Ignoring ties / feasibility** — the local choice must remain _feasible_; forgetting the feasibility check (e.g. `start >= lastEnd`) produces invalid solutions.

## Tradeoffs

| Aspect | Greedy | Dynamic Programming |
|---|---|---|
| Speed | Fast — usually O(n log n) (a sort + pass) | Slower — fills a table, often O(n·W) etc. |
| Correctness scope | Narrow — needs greedy-choice proof | Broad — any problem with optimal substructure |
| Memory | O(1)–O(n) | Often O(states) |
| Risk | Silent wrong answers if misapplied | Reliable but heavier |

**Decision rule**: try greedy first _only if you can prove the greedy-choice property_ (exchange argument) — then enjoy its speed. If you can't prove it, or a small counter-example breaks it, use DP. The classic split: **interval scheduling, MST, Huffman, Dijkstra** ⇒ greedy is proven; **0/1 knapsack, general coin change, edit distance** ⇒ DP.

## Questions

> [!QUESTION]- Why does greedy fail for general coin change but succeed for standard currency?
> Standard coin systems are _canonical_ — each coin is large enough that taking as many of the biggest as possible is always optimal, provable by exchange argument. Arbitrary systems break that: for {1,3,4} making 6, greedy takes 4 then 1+1 (3 coins), but 3+3 (2 coins) is better. The greedy-choice property simply doesn't hold, so you need DP.

> [!QUESTION]- How do you prove a greedy algorithm is correct?
> Usually an **exchange argument**: assume an optimal solution differs from the greedy one, then show you can swap one of its choices for the greedy choice without making it worse — repeating until it becomes the greedy solution. This proves greedy is at least as good as any optimal solution. The "greedy stays ahead" technique (induct that greedy's partial solution is never behind) is a common variant.

> [!QUESTION]- For activity selection, why is "earliest finish time" the right greedy key?
> Choosing the activity that finishes earliest leaves the maximum remaining time for everything else, and an exchange argument shows any optimal schedule's first activity can be replaced by the earliest-finishing one without reducing the count. Other keys (shortest duration, earliest start) lack this property and can be beaten by counter-examples.

## References

- [Greedy algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Greedy_algorithm) — definition, matroid theory, and where greedy is provably optimal.
- [Greedy algorithms (cp-algorithms)](https://cp-algorithms.com/) — scheduling and exchange-argument proofs.
- [Greedy vs DP (Stanford CS161 notes)](https://web.stanford.edu/class/cs161/) — formal treatment of the greedy-choice property and exchange arguments.
