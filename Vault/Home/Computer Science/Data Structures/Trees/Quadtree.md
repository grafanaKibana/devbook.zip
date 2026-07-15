---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A tree that recursively subdivides a 2D region into four quadrants for spatial queries — fast on uniform data, unbalanced by nature."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A quadtree is a tree in which every internal node has exactly **four** children, each owning one quadrant — **NW, NE, SW, SE** — of its parent's rectangular region. Building one recursively subdivides 2D space: a region holding too much (too many points, or a non-uniform block of pixels) splits into four equal sub-regions, each of which may split again, until every leaf is "simple enough" — holds at most a small bucket of points, or is a uniform block. A point at `(x, y)` is placed by repeatedly asking which quadrant it falls in and descending, so spatial neighbors end up in the same or adjacent leaves.

Be honest about what it is not: a quadtree is a **spatial-partitioning tree, not a balanced `O(log n)` search tree**. It has no rotation or fill invariant like an [[AVL Tree]] or a [[B-tree]]; its depth is driven entirely by how the data clusters in space. Uniformly spread points give a shallow tree (~`log₄ n`); tightly clustered points force long degenerate branches and drag operations toward `O(n)`. What it buys in return is spatial pruning: a range or nearest-neighbor query discards whole quadrants that cannot intersect the query region, instead of scanning every point.

**Core shape:** rectangular region → split into 4 equal quadrants (NW/NE/SW/SE) when overfull → recurse until leaves are simple → point routed by quadrant containment → depth follows data distribution, not a balance invariant, `O(n)` storage.

## Variants

The name covers a family that differs in *what triggers a split* and *what a leaf stores*:

- **Point quadtree** (Finkel & Bentley, 1974). Each inserted point *becomes* an internal node and splits the plane at its own coordinates into four (generally unequal) quadrants — a direct 2D generalization of a [[Binary Search Tree]]. Simple, but the shape depends on insertion order, so a bad order degrades it.
- **Point-region (PR) quadtree.** Decouples splitting from the data. Space is cut into four **equal** quadrants regardless of point coordinates; a leaf bucket splits only when it exceeds capacity (often one point). Internal nodes are pure spatial subdivisions; leaves hold the points. The shape depends only on *where* the points are, not the order they arrived.
- **Region quadtree** (image/raster). The domain is a `2ⁿ × 2ⁿ` grid and each node covers a square block. A uniform block (all one color/value) is a leaf; a mixed block splits into four equal sub-blocks. Used for image compression and spatial occupancy — large empty or solid areas collapse to a single node.

## Operations and use cases

Insert, search, and delete all follow the quadrant containing the target down to a leaf. The queries that make the structure worthwhile prune subtrees:

- **2D range query** — descend, skipping any quadrant whose rectangle does not intersect the query window; report points in the surviving leaves.
- **Nearest-neighbor** — best-first / branch-and-bound over quadrants, pruning a quadrant once its bounding box is farther than the current best.
- **Collision detection (broad phase)** — objects sharing a cell (or an adjacent one) are collision candidates, replacing an `O(n²)` all-pairs check with a handful of local comparisons.
- **Image compression** — a region quadtree merges uniform blocks into single leaves.
- **Geospatial and simulation** — subdividing a map into cells for level-of-detail, terrain, or particle systems; the 3D cousin (the octree, eight children) drives Barnes–Hut n-body approximation.

## Quadtree vs geohash

Geohash has no note of its own, so the contrast lives here. A **geohash** interleaves the bits of latitude and longitude and base-32-encodes the result into a short string, so that a shared *prefix* means spatial proximity — it linearizes 2D space onto a 1D **Z-order (Morton) curve**, the very interleaving a PR-quadtree path encodes. The consequence is powerful: a 2D range query becomes a **string-prefix / sorted-range scan** that any ordinary sorted index or key-value store can serve, with no custom tree to traverse.

That is the real distinction. A quadtree is a live, mutable, in-memory pointer structure you walk and rebalance by hand; a geohash is a flat, sortable **key** you can drop into an existing index, shard on, or cache. Geohash trades some boundary accuracy (two physically adjacent points can straddle a cell edge and share no prefix) for the ability to ride 1D infrastructure — which is why **Redis GEO** (52-bit interleaved scores in a sorted set) uses it, and why **Elasticsearch** exposes a `geohash_grid` aggregation (its `geo_point` index itself moved to Lucene BKD trees).

For durable database indexing, neither is the answer: an **R-tree** groups objects by (possibly overlapping) minimum bounding rectangles and is balanced and paged like a B-tree, making it the *on-disk* spatial index. A quadtree is best seen as the in-memory partitioner — the counterpart to the on-disk R-tree / GiST spatial *indexes* described in [[Indexes]], not an equivalent of them.

## Complexity

For `n` points; "average" assumes a roughly uniform spatial distribution, "worst" assumes heavy clustering.

| Operation | Average (uniform) | Worst (clustered) | Space |
| --- | --- | --- | --- |
| Insert | `O(log n)` | `O(n)` | `O(n)` |
| Point search | `O(log n)` | `O(n)` | — |
| Range query | `O(log n + k)` for `k` results | `O(n)` | — |
| Nearest neighbor | `~O(log n)` expected | `O(n)` | — |
| Build (`n` points) | `O(n log n)` | `O(n²)` | `O(n)` |

The single cause behind every worst case is the missing balance invariant: depth equals the number of subdivisions needed to separate the closest points, so two nearly coincident points force splitting down to the coordinate-precision limit. A PR quadtree's depth is therefore bounded by the coordinate resolution rather than by `n`, but on adversarial or clustered data it still degenerates — the honest reason a quadtree is a *partitioner*, not a guaranteed-`O(log n)` search tree.

## Reference drawer

> [!ABSTRACT]- Recursive subdivision
> ```mermaid
> graph TD
>   R["root region"] --> NW["NW"]
>   R --> NE["NE (overfull → split)"]
>   R --> SW["SW"]
>   R --> SE["SE"]
>   NE --> NW2["NW"]
>   NE --> NE2["NE"]
>   NE --> SW2["SW"]
>   NE --> SE2["SE"]
> ```
> Every internal node fans out to exactly four quadrants. Only the overfull quadrant (`NE`) subdivides again — the tree deepens locally, wherever the data is dense, rather than uniformly.

## Questions

> [!QUESTION]- Why isn't a quadtree an `O(log n)` balanced search tree?
> It has no balancing invariant — nothing forces the four subtrees to hold comparable amounts of data, and there are no rotations or fill rules. Depth is dictated by the spatial distribution: uniformly spread points give ~`log₄ n` depth, but clustered points force long degenerate branches and push operations toward `O(n)`. A PR quadtree's depth is bounded by coordinate precision rather than `n`, yet it still degrades under heavy clustering. The payoff for accepting this is spatial pruning of whole quadrants during range and nearest-neighbor queries.

> [!QUESTION]- When would you reach for a geohash instead of a quadtree?
> When you want spatial queries served by ordinary 1D infrastructure. A geohash interleaves lat/long bits into a sortable string whose shared prefix means proximity, so a range query becomes a prefix/sorted-range scan on a normal index, key-value store, or shard key — no live tree to traverse or rebalance. A quadtree is the better fit when you need a mutable in-memory structure with exact, adaptive subdivision (collision broad-phase, nearest-neighbor, image compression). Geohash trades boundary accuracy for the ability to ride existing indexes.

> [!QUESTION]- How does a point quadtree differ from a PR quadtree?
> A point quadtree splits the plane at the coordinates of each inserted point (like a 2D BST), so its shape depends on insertion order and a bad order degrades it. A PR (point-region) quadtree always splits space into four *equal* quadrants independent of point coordinates, subdividing a bucket only when it overflows — so its shape depends solely on where the points are, not the order they arrived.

## References

- [Finkel & Bentley — Quad trees: a data structure for retrieval on composite keys, Acta Informatica 4 (1974)](https://doi.org/10.1007/BF00288933) — the original paper introducing the point quadtree for multidimensional keys; the primary source.
- [Hanan Samet — Foundations of Multidimensional and Metric Data Structures (2006)](https://www.sciencedirect.com/book/9780123694461/foundations-of-multidimensional-and-metric-data-structures) — the definitive reference on quadtree variants, region quadtrees, and their relationship to R-trees and other spatial indexes.
- [Hanan Samet — quadtree research page](https://www.cs.umd.edu/~hjs/quadtree/) — companion bibliography and figures for the region/PR/point quadtree families.
