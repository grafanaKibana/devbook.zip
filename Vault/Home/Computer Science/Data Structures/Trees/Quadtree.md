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

A quadtree recursively subdivides a 2D domain into as many as four quadrants per node. In point-region (PR) and region quadtrees, each subdivided node owns four child regions — **NW, NE, SW, SE** — although an implementation can keep empty quadrants as implicit slots instead of allocating child objects. A region holding too much (too many points, or a non-uniform block of pixels) splits into four equal sub-regions, each of which may split again, until every leaf is "simple enough" — holds at most a small bucket of points, or is a uniform block. A point at `(x, y)` is placed by repeatedly asking which quadrant it falls in and descending, so spatial neighbors end up in the same or adjacent leaves.

Be honest about what it is not: a quadtree is a **spatial-partitioning tree, not a balanced search tree**. It has no rotation or fill invariant like an [[Home/Computer Science/Data Structures/Trees/AVL Tree|AVL Tree]] or a [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]]. A point quadtree's depth follows insertion order and point placement. A PR quadtree's depth follows clustering within a fixed root region and stops only at a defined minimum cell size, coordinate precision, or overflow policy. A region quadtree's depth follows the raster resolution. What these variants buy is spatial pruning: a range or nearest-neighbor query can discard whole regions that do not intersect the search.

**Core shape:** rectangular region → split into 4 equal quadrants (NW/NE/SW/SE) when overfull → recurse until leaves are simple → point routed by quadrant containment → depth follows data distribution, not a balance invariant.

~~~~~tabsdown
tab: Visualization

![[Assets/Computer Science/Computer Science-Quadtree-Adaptive-Split.svg|900]]

Only the overfull northeast leaf subdivides; the other three root quadrants retain their bounds and contents. The inserted points are then routed into the four new child regions, so resolution increases locally where the data is dense.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Quadtree complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of stored points"
    },
    "treeDepth": {
      "symbol": "h",
      "description": "actual tree depth induced by insertion order or point distribution"
    },
    "visitedNodes": {
      "symbol": "v",
      "description": "nodes visited or intersected by a spatial query"
    },
    "resultCount": {
      "symbol": "k",
      "description": "points returned by a spatial query"
    },
    "allocatedNodes": {
      "symbol": "s",
      "description": "tree nodes allocated under the chosen depth and empty-child policy"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "text",
              "role": "Actual depth",
              "formula": "O(h)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Point search",
          "bounds": [
            {
              "kind": "text",
              "role": "Actual depth",
              "formula": "O(h)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Range query",
          "bounds": [
            {
              "kind": "text",
              "role": "Output-sensitive",
              "formula": "O(v + k)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Nearest neighbor",
          "bounds": [
            {
              "kind": "text",
              "role": "Visited nodes",
              "formula": "O(v)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Build",
          "bounds": [
            {
              "kind": "text",
              "role": "Repeated insertion",
              "formula": "O(nh)"
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
          "operation": "Persistent tree",
          "bounds": [
            {
              "kind": "text",
              "role": "Allocated nodes",
              "formula": "O(s)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Traversal",
          "bounds": [
            {
              "kind": "text",
              "role": "Call stack or explicit path",
              "formula": "O(h)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Range-query output",
          "bounds": [
            {
              "kind": "text",
              "role": "Returned points",
              "formula": "O(k)"
            }
          ]
        }
      ]
    }
  }
}
```

Point operations follow actual depth `h`; no relationship between `h` and `n` is structural. For a PR quadtree, `h` is capped only when the implementation defines a finite root region and a minimum cell size, finite coordinate precision, or another terminal overflow rule. A region quadtree over a `2^r × 2^r` raster instead has `h ≤ r`. Persistent space follows allocated nodes `s`, which depends on depth and whether empty children are materialized. A range query depends on both visited nodes `v` and returned points `k`.

The point-quadtree worst case comes from insertion order and spatial placement, just as an ordinary binary search tree can become a chain. The PR-quadtree worst case comes from repeated subdivision of one region; coincident points cannot be separated by geometry, so the implementation must keep an overflow bucket or stop at a declared depth. Coordinate resolution bounds depth only when coordinates are quantized and the split arithmetic respects that finite domain.
~~~~~

# Variants

The name covers a family that differs in *what triggers a split* and *what a leaf stores*:

- **Point quadtree** (Finkel & Bentley, 1974). Each inserted point *becomes* an internal node and splits the plane at its own coordinates into four (generally unequal) quadrants — a direct 2D generalization of a [[Home/Computer Science/Data Structures/Trees/Binary Search Tree|Binary Search Tree]]. Its nodes do not carry fixed rectangular bounds unless the implementation adds them; shape depends on insertion order, so a bad order degrades it.
- **Point-region (PR) quadtree.** Decouples splitting from the data. Space is cut into four **equal** quadrants regardless of point coordinates; a leaf bucket splits only when it exceeds capacity (often one point). Internal nodes are pure spatial subdivisions; leaves hold the points. The shape depends only on *where* the points are, not the order they arrived.
- **Region quadtree** (image/raster). The domain is a `2ⁿ × 2ⁿ` grid and each node covers a square block. A uniform block (all one color/value) is a leaf; a mixed block splits into four equal sub-blocks. Used for image compression and spatial occupancy — large empty or solid areas collapse to a single node.

# Operations and Use Cases

Insert, search, and delete all follow the quadrant containing the target down to a leaf. The queries that make the structure worthwhile prune subtrees:

- **2D range query** — descend, skipping any quadrant whose rectangle does not intersect the query window; report points in the surviving leaves.
- **Nearest-neighbor** — best-first / branch-and-bound over quadrants, pruning a quadrant once its bounding box is farther than the current best.
- **Collision detection (broad phase)** — objects sharing a cell (or an adjacent one) are collision candidates, replacing an all-pairs scan with a handful of local comparisons.
- **Image compression** — a region quadtree merges uniform blocks into single leaves.
- **Geospatial and simulation** — subdividing a map into cells for level-of-detail, terrain, or particle systems; the 3D cousin (the octree, eight children) drives Barnes–Hut n-body approximation.

# Quadtree Vs Geohash

A [[Home/Computer Science/Data Structures/Geohash|Geohash]] encodes a point into a fixed-grid, sortable prefix; a PR or region quadtree is an adaptive tree whose cells subdivide only where the workload requires more resolution. Geohash is the better fit when an existing sorted index, cache, or shard key should produce spatial candidates. A PR or region quadtree is the better fit for mutable in-memory workloads that benefit from explicit region bounds, local subdivision, collision broad-phase, or sparse raster compression.

The boundary cost differs. Adjacent points can fall into different geohash prefixes, so a proximity query must inspect neighboring cells and filter candidates by exact geometry or distance. An adaptive PR quadtree avoids one fixed global cell size but still needs a maximum depth or minimum cell size for coincident and near-coincident points. For paged durable storage, prefer the database's spatial index unless the fixed-prefix key is itself the requirement. [[Home/Computer Science/Data Structures/Geohash|Geohash]] carries the encoding, Redis and Elasticsearch examples, boundary algorithm, and R-tree/GiST comparison; [[Home/Data Persistence/SQL/Indexes|Indexes]] covers the broader database-index tradeoff.

# Reference Drawer

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
> Every subdivided PR/region node defines four child regions; this diagram materializes all four quadrant slots. Only the overfull quadrant (`NE`) subdivides again — the tree deepens locally, wherever the data is dense, rather than uniformly.

# Questions

> [!QUESTION]- Why isn't a quadtree a balanced search tree?
> It has no balancing invariant — nothing forces the four subtrees to hold comparable amounts of data, and there are no rotations or fill rules. A point quadtree can become a chain through insertion order. A PR quadtree repeatedly subdivides the occupied region and needs an explicit finite-resolution or overflow rule; a region quadtree is bounded by raster resolution. The payoff is spatial pruning of regions during range and nearest-neighbor queries.

> [!QUESTION]- When would you reach for a geohash instead of a quadtree?
> Use [[Home/Computer Science/Data Structures/Geohash|Geohash]] when spatial candidates must ride ordinary sorted indexes, cache keys, or shard prefixes and exact filtering can repair cell-boundary error. Use a quadtree when adaptive subdivision and tree traversal are the mechanism: collision broad-phase, nearest-neighbor pruning, or image-region compression. Geohash pays with neighboring-cell expansion; quadtree pays with pointer structure and distribution-dependent depth.

> [!QUESTION]- How does a point quadtree differ from a PR quadtree?
> A point quadtree splits the plane at the coordinates of each inserted point (like a 2D BST), so its shape depends on insertion order and a bad order degrades it. A PR (point-region) quadtree always splits space into four *equal* quadrants independent of point coordinates, subdividing a bucket only when it overflows — so its shape depends solely on where the points are, not the order they arrived.

# References

- [Finkel & Bentley — Quad trees: a data structure for retrieval on composite keys, Acta Informatica 4 (1974)](https://doi.org/10.1007/BF00288933) — the original paper introducing the point quadtree for multidimensional keys; the primary source.
- [Hanan Samet — Foundations of Multidimensional and Metric Data Structures (2006)](https://www.sciencedirect.com/book/9780123694461/foundations-of-multidimensional-and-metric-data-structures) — the definitive reference on quadtree variants, region quadtrees, and their relationship to R-trees and other spatial indexes.
- [Hanan Samet — quadtree research page](https://www.cs.umd.edu/~hjs/quadtree/) — companion bibliography and figures for the region/PR/point quadtree families.
- [ByteByteGo System Design 101 — Quadtree](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/quadtree.md) — editorial overview of the split mechanism and spatial use cases; used as an audited mechanism baseline, not the sole factual authority, and its inconsistent source diagram is intentionally excluded.
