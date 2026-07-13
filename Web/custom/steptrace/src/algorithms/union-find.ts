import type { UnionFindAlgorithmDefinition } from "../types"

// ────────────────────────────── union-find ─────────────────────────────
export const unionFind = {
  id: "union-find",
  kind: "unionfind",
  meta: { label: "Union-Find" },
  run: (input, ops) => {
    const n = input.n || 7
    ops.init(
      `Union-Find on ${n} elements — union merges two sets; find returns a set's representative (its root), flattening the path it walks (path compression).`,
    )
    const operations =
      Array.isArray(input.ops) && input.ops.length
        ? input.ops
        : [
            ["union", 0, 1],
            ["union", 2, 3],
            ["union", 4, 5],
            ["union", 1, 2],
            ["find", 3],
            ["union", 6, 4],
          ]
    const findRoot = (x, why) => {
      const pathToRoot = [x]
      let c = x
      while (ops.parent[c] !== c) {
        c = ops.parent[c]
        pathToRoot.push(c)
      }
      ops.findPath(pathToRoot, `${why} follow ${pathToRoot.join(" → ")} to root ${c}.`)
      for (const node of pathToRoot) {
        if (node !== c && ops.parent[node] !== c)
          ops.setParent(node, c, `Path compression: point ${node} straight at root ${c}.`)
      }
      return c
    }
    for (const op of operations) {
      if (op[0] === "union") {
        const a = op[1]
        const b = op[2]
        const ra = findRoot(a, `Union(${a}, ${b}):`)
        const rb = findRoot(b, `Union(${a}, ${b}):`)
        if (ra === rb) ops.clear(`${a} and ${b} are already in the same set.`)
        else ops.setParent(ra, rb, `Link root ${ra} under root ${rb} — the two sets merge.`)
      } else if (op[0] === "find") {
        const x = op[1]
        const rt = findRoot(x, `Find(${x}):`)
        ops.clear(`Find(${x}) = ${rt}.`)
      }
    }
    const roots = new Set()
    for (let i = 0; i < n; i++) {
      let c = i
      while (ops.parent[c] !== c) c = ops.parent[c]
      roots.add(c)
    }
    ops.done(`Done — ${roots.size} disjoint set${roots.size === 1 ? "" : "s"} remain.`)
  },
} satisfies UnionFindAlgorithmDefinition
