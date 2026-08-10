---
publish: true
created: 2026-08-10T07:56:54.821Z
modified: 2026-08-10T08:02:31.944Z
published: 2026-08-10T08:02:31.944Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Walks forward across ordered neighbors and steps backward after each adjacent swap.
level:
  - "4"
priority: Low
status: Not-Started
---

Gnome sort maintains a sorted prefix with one index. If `a[i-1] <= a[i]`, the index advances. If the pair is inverted, the values swap and the index steps back so the displaced value can continue moving toward its insertion point. Reaching index `0` immediately resumes at `1`.

The mechanism is [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] expressed through adjacent swaps rather than shifting a saved value. Each swap removes one inversion, so the process terminates. Strict comparison keeps equal values from crossing, making the sort stable.

````tabsdown
tab: Visualization

```steptrace
{ "algorithm": "gnome-sort", "array": [7, 3, 5, 2, 8, 1, 6, 4] }
```

Forward steps confirm the current prefix remains ordered. A swap steps back by one position; repeated swaps walk the smaller value left until its predecessor is no greater, after which the scan moves forward again.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Gnome Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the array"
    }
  },
  "resources": {
    "time": {
      "mode": "cases",
      "entries": [
        { "kind": "case", "role": "Best", "formula": "O(n)", "curveId": "linear" },
        { "kind": "case", "role": "Average", "formula": "O(n²)", "curveId": "quadratic" },
        { "kind": "case", "role": "Worst", "formula": "O(n²)", "curveId": "quadratic" }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        { "kind": "case", "role": "Best", "formula": "O(1)", "curveId": "constant" },
        { "kind": "case", "role": "Average", "formula": "O(1)", "curveId": "constant" },
        { "kind": "case", "role": "Worst", "formula": "O(1)", "curveId": "constant" }
      ]
    }
  }
}
```
````

# Boundary and implementation

Ordered input needs one forward scan, but reverse-ordered input contains `n(n-1)/2` inversions and forces that many adjacent swaps. Insertion Sort reaches the same asymptotic bound with fewer writes because it shifts a block and writes the inserted value once; Gnome Sort is mainly useful for seeing inversion removal in a single loop.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void GnomeSort(int[] values)
> {
>     var i = 1;
>     while (i < values.Length)
>     {
>         if (values[i - 1] <= values[i])
>         {
>             i++;
>         }
>         else
>         {
>             (values[i - 1], values[i]) = (values[i], values[i - 1]);
>             i = Math.Max(1, i - 1);
>         }
>     }
> }
> ```
>
> Clamping the index to `1` avoids reading `values[-1]` after a swap at the front.

# Questions

> [!QUESTION]- What guarantees termination?
> Every swap removes one adjacent inversion, and a forward step eventually passes an ordered pair. The finite inversion count cannot decrease forever.

> [!QUESTION]- Why can Insertion Sort perform fewer writes with the same asymptotic time?
> Gnome Sort swaps through every crossed neighbor. Insertion Sort can save the moving value, shift the larger block, and write the saved value once.

# References

- [Dick Grune, “Gnome Sort — The Simplest Sort Algorithm”](https://dickgrune.com/Programs/gnomesort.html) — the algorithm author's primary description and compact implementation.
- [NIST Dictionary of Algorithms and Data Structures: gnome sort](https://www.nist.gov/dads/HTML/gnomeSort.html) — authoritative definition, classification, and historical notes.
