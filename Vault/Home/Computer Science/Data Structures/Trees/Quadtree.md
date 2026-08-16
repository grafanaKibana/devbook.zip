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

A quadtree divides a 2D domain into as many as four regions per node. In point-region (PR) and region quadtrees, a split produces **NW, NE, SW, SE** child regions. Empty quadrants may remain implicit rather than allocating child objects. An overfull point bucket or a mixed pixel block splits again until each leaf satisfies its stopping rule. Routing a point at `(x, y)` through those regions tends to place spatial neighbors in the same or adjacent leaves.

A quadtree is a **spatial-partitioning tree, not a balanced search tree**. It has no rotation or fill invariant like an [[Home/Computer Science/Data Structures/Trees/AVL Tree|AVL Tree]] or a [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]]. Point-quadtree depth depends on insertion order and placement. PR-quadtree depth follows clustering inside a fixed root region and needs an explicit minimum cell size, coordinate limit, or overflow rule. Region-quadtree depth follows raster resolution. In return, spatial queries can prune whole regions that do not intersect the search.

**Family shape:** recursively partition a 2D domain into four child regions → route or aggregate spatial data within those regions → prune regions that cannot intersect a query. PR and region quadtrees split rectangular bounds into equal NW/NE/SW/SE quadrants when a bucket overflows or a raster block is mixed. A point quadtree instead splits at each stored point into generally unequal quadrants.

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
              "kind": "curve",
              "role": "Actual depth",
              "formula": "O(h)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Point search",
          "bounds": [
            {
              "kind": "curve",
              "role": "Actual depth",
              "formula": "O(h)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Range query",
          "bounds": [
            {
              "kind": "curve",
              "role": "Output-sensitive",
              "formula": "O(v + k)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Nearest neighbor",
          "bounds": [
            {
              "kind": "curve",
              "role": "Visited nodes",
              "formula": "O(v)",
              "curveId": "linear"
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
              "kind": "curve",
              "role": "Allocated nodes",
              "formula": "O(s)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Traversal",
          "bounds": [
            {
              "kind": "curve",
              "role": "Call stack or explicit path",
              "formula": "O(h)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Range-query output",
          "bounds": [
            {
              "kind": "curve",
              "role": "Returned points",
              "formula": "O(k)",
              "curveId": "linear"
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

The family varies along two decisions: what triggers a split and what a leaf stores.

- **Point quadtree** (Finkel & Bentley, 1974). Each inserted point *becomes* an internal node and splits the plane at its own coordinates into four (generally unequal) quadrants — a direct 2D generalization of a [[Home/Computer Science/Data Structures/Trees/Binary Search Tree|Binary Search Tree]]. Its nodes do not carry fixed rectangular bounds unless the implementation adds them. Shape depends on insertion order, so a bad order degrades it.
- **Point-region (PR) quadtree.** Decouples splitting from the data. Space is cut into four **equal** quadrants regardless of point coordinates. A leaf bucket splits only when it exceeds capacity (often one point). Internal nodes are pure spatial subdivisions. Leaves hold the points. The shape depends only on *where* the points are, not the order they arrived.
- **Region quadtree** (image/raster). The domain is a `2ⁿ × 2ⁿ` grid and each node covers a square block. A uniform block (all one color/value) is a leaf. A mixed block splits into four equal sub-blocks. Used for image compression and spatial occupancy — large empty or solid areas collapse to a single node.

# Operations and Use Cases

In a PR quadtree, insert, search, and delete follow the target's quadrant down to a leaf. A point-quadtree lookup can stop at an internal node that stores the matching point, while deletion may require subtree reconstruction or another explicit repair strategy. Spatial queries earn the extra structure by pruning subtrees:

- **2D range query** — descend, skipping any quadrant whose rectangle does not intersect the query window. Report points in the surviving leaves.
- **Nearest-neighbor** — best-first / branch-and-bound over quadrants, pruning a quadrant once its bounding box is farther than the current best.
- **Collision detection (broad phase)** — objects sharing a cell (or an adjacent one) are collision candidates, replacing an all-pairs scan with a handful of local comparisons.
- **Image compression** — a region quadtree merges uniform blocks into single leaves.
- **Geospatial and simulation** — subdividing a map into cells for level-of-detail, terrain, or particle systems. The 3D cousin (the octree, eight children) drives Barnes–Hut n-body approximation.

# Quadtree Vs Geohash

A [[Home/Computer Science/Data Structures/Geohash|Geohash]] encodes a point as a sortable prefix in a fixed grid. A PR or region quadtree subdivides cells only where more resolution is needed. Geohash fits existing sorted indexes, cache keys, and shard prefixes. Quadtrees fit mutable in-memory work that needs explicit region bounds, local subdivision, collision broad-phase, or sparse raster compression.

Adjacent points can fall into different geohash prefixes, so proximity queries inspect neighboring cells and filter candidates by exact geometry or distance. An adaptive PR quadtree avoids one global cell size but still needs a depth or cell-size limit for coincident points. Paged durable storage usually belongs in the database's spatial index unless the fixed-prefix key is itself the requirement. [[Home/Computer Science/Data Structures/Geohash|Geohash]] covers the encoding and its boundary algorithm. [[Home/Data Persistence/SQL/Indexes|Indexes]] covers the wider database-index tradeoff.

# Recursive Subdivision Diagram

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
> Every subdivided PR/region node defines four child regions. This diagram materializes all four quadrant slots. Only the overfull quadrant (`NE`) subdivides again — the tree deepens locally, wherever the data is dense, rather than uniformly.

# References

- [Finkel & Bentley — Quad trees: a data structure for retrieval on composite keys, Acta Informatica 4 (1974)](https://doi.org/10.1007/BF00288933)
- [Hanan Samet — Foundations of Multidimensional and Metric Data Structures (2006)](https://www.sciencedirect.com/book/9780123694461/foundations-of-multidimensional-and-metric-data-structures)
