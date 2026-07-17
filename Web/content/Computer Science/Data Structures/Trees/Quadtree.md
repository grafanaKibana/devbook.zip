---
publish: true
created: 2026-07-15T08:11:34.538Z
modified: 2026-07-16T18:39:21.620Z
published: 2026-07-16T18:39:21.620Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A tree that recursively subdivides a 2D region into four quadrants for spatial queries — fast on uniform data, unbalanced by nature.
level:
  - "4"
priority: Medium
status: Creation
---

# Intro

A quadtree recursively subdivides a 2D domain into as many as four quadrants per node. In point-region (PR) and region quadtrees, each subdivided node owns four child regions — **NW, NE, SW, SE** — although an implementation can keep empty quadrants as implicit slots instead of allocating child objects. A region holding too much (too many points, or a non-uniform block of pixels) splits into four equal sub-regions, each of which may split again, until every leaf is "simple enough" — holds at most a small bucket of points, or is a uniform block. A point at `(x, y)` is placed by repeatedly asking which quadrant it falls in and descending, so spatial neighbors end up in the same or adjacent leaves.

Be honest about what it is not: a quadtree is a **spatial-partitioning tree, not a balanced `O(log n)` search tree**. It has no rotation or fill invariant like an [[AVL Tree]] or a [[B-tree]]; its depth is driven entirely by how the data clusters in space. Uniformly spread points give a shallow tree (~`log₄ n`); tightly clustered points force long degenerate branches and drag operations toward `O(n)`. What it buys in return is spatial pruning: a range or nearest-neighbor query discards whole quadrants that cannot intersect the query region, instead of scanning every point.

**Core shape:** rectangular region → split into 4 equal quadrants (NW/NE/SW/SE) when overfull → recurse until leaves are simple → point routed by quadrant containment → depth follows data distribution, not a balance invariant, `O(n)` storage.

## Variants

The name covers a family that differs in _what triggers a split_ and _what a leaf stores_:

- **Point quadtree** (Finkel & Bentley, 1974). Each inserted point _becomes_ an internal node and splits the plane at its own coordinates into four (generally unequal) quadrants — a direct 2D generalization of a [[Binary Search Tree]]. Simple, but the shape depends on insertion order, so a bad order degrades it.
- **Point-region (PR) quadtree.** Decouples splitting from the data. Space is cut into four **equal** quadrants regardless of point coordinates; a leaf bucket splits only when it exceeds capacity (often one point). Internal nodes are pure spatial subdivisions; leaves hold the points. The shape depends only on _where_ the points are, not the order they arrived.
- **Region quadtree** (image/raster). The domain is a `2ⁿ × 2ⁿ` grid and each node covers a square block. A uniform block (all one color/value) is a leaf; a mixed block splits into four equal sub-blocks. Used for image compression and spatial occupancy — large empty or solid areas collapse to a single node.

## Operations and use cases

Insert, search, and delete all follow the quadrant containing the target down to a leaf. The queries that make the structure worthwhile prune subtrees:

- **2D range query** — descend, skipping any quadrant whose rectangle does not intersect the query window; report points in the surviving leaves.
- **Nearest-neighbor** — best-first / branch-and-bound over quadrants, pruning a quadrant once its bounding box is farther than the current best.
- **Collision detection (broad phase)** — objects sharing a cell (or an adjacent one) are collision candidates, replacing an `O(n²)` all-pairs check with a handful of local comparisons.
- **Image compression** — a region quadtree merges uniform blocks into single leaves.
- **Geospatial and simulation** — subdividing a map into cells for level-of-detail, terrain, or particle systems; the 3D cousin (the octree, eight children) drives Barnes–Hut n-body approximation.

## Quadtree vs geohash

A [[Geohash]] encodes a point into a fixed-grid, sortable prefix; a quadtree is an adaptive tree whose cells subdivide only where the workload requires more resolution. Geohash is the better fit when an existing sorted index, cache, or shard key should produce spatial candidates. A quadtree is the better fit for mutable in-memory workloads that benefit from exact region traversal, local subdivision, collision broad-phase, or sparse raster compression.

![[Assets/System Design 101/a0d8f8de511d1c23c9b85c7125994affbb45028b1115fe676bbee9cdffa61fbd.jpg]]

The boundary cost differs. Adjacent points can fall into different geohash prefixes, so a proximity query must inspect neighboring cells and filter candidates by exact geometry or distance. A quadtree avoids a fixed global cell size but still degenerates under clustering. For paged durable storage, prefer the database's spatial index unless the fixed-prefix key is itself the requirement. [[Geohash]] carries the encoding, Redis and Elasticsearch examples, boundary algorithm, and R-tree/GiST comparison; [[Indexes]] covers the broader database-index tradeoff.

## Complexity

For `n` points, `v` visited or intersected quadtree nodes, and `k` results; "average" assumes a roughly uniform spatial distribution, while "worst" assumes heavy clustering.

| Operation | Average (uniform) | Worst (clustered) | Space |
| --- | --- | --- | --- |
| Insert | `O(log n)` | `O(n)` | `O(n)` |
| Point search | `O(log n)` | `O(n)` | — |
| Range query | `O(v + k)` | `O(n)` | — |
| Nearest neighbor | `~O(log n)` expected | `O(n)` | — |
| Build (`n` points) | `O(n log n)` | `O(n²)` | `O(n)` |

With roughly uniform occupancy and a query window that intersects a bounded number of cells at the chosen depth, `v` remains small relative to `n`; it is not generally `O(log n)`.

The single cause behind every worst case is the missing balance invariant: depth equals the number of subdivisions needed to separate the closest points, so two nearly coincident points force splitting down to the coordinate-precision limit. A PR quadtree's depth is therefore bounded by the coordinate resolution rather than by `n`, but on adversarial or clustered data it still degenerates — the honest reason a quadtree is a _partitioner_, not a guaranteed-`O(log n)` search tree.

## Reference drawer

> [!ABSTRACT]- Recursive subdivision
>
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
>
> Every subdivided PR/region node defines four child regions; this diagram materializes all four quadrant slots. Only the overfull quadrant (`NE`) subdivides again — the tree deepens locally, wherever the data is dense, rather than uniformly.

## Questions

> [!QUESTION]- Why isn't a quadtree an `O(log n)` balanced search tree?
> It has no balancing invariant — nothing forces the four subtrees to hold comparable amounts of data, and there are no rotations or fill rules. Depth is dictated by the spatial distribution: uniformly spread points give ~`log₄ n` depth, but clustered points force long degenerate branches and push operations toward `O(n)`. A PR quadtree's depth is bounded by coordinate precision rather than `n`, yet it still degrades under heavy clustering. The payoff for accepting this is spatial pruning of whole quadrants during range and nearest-neighbor queries.

> [!QUESTION]- When would you reach for a geohash instead of a quadtree?
> Use [[Geohash]] when spatial candidates must ride ordinary sorted indexes, cache keys, or shard prefixes and exact filtering can repair cell-boundary error. Use a quadtree when adaptive subdivision and tree traversal are the mechanism: collision broad-phase, nearest-neighbor pruning, or image-region compression. Geohash pays with neighboring-cell expansion; quadtree pays with pointer structure and distribution-dependent depth.

> [!QUESTION]- How does a point quadtree differ from a PR quadtree?
> A point quadtree splits the plane at the coordinates of each inserted point (like a 2D BST), so its shape depends on insertion order and a bad order degrades it. A PR (point-region) quadtree always splits space into four _equal_ quadrants independent of point coordinates, subdividing a bucket only when it overflows — so its shape depends solely on where the points are, not the order they arrived.

## References

- [Finkel & Bentley — Quad trees: a data structure for retrieval on composite keys, Acta Informatica 4 (1974)](https://doi.org/10.1007/BF00288933) — the original paper introducing the point quadtree for multidimensional keys; the primary source.
- [Hanan Samet — Foundations of Multidimensional and Metric Data Structures (2006)](https://www.sciencedirect.com/book/9780123694461/foundations-of-multidimensional-and-metric-data-structures) — the definitive reference on quadtree variants, region quadtrees, and their relationship to R-trees and other spatial indexes.
- [Hanan Samet — quadtree research page](https://www.cs.umd.edu/~hjs/quadtree/) — companion bibliography and figures for the region/PR/point quadtree families.
- [ByteByteGo System Design 101 — Quadtree](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/quadtree.md) — editorial overview of the split mechanism and spatial use cases; used as an audited mechanism baseline, not the sole factual authority, and its inconsistent source diagram is intentionally excluded.
- [ByteByteGo System Design 101 — Proximity service](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/proximity-service.md) — editorial comparison of geohash and quadtree lookup paths plus the embedded proximity-search visual; used for provenance, with the primary references above remaining authoritative for quadtree behavior.
