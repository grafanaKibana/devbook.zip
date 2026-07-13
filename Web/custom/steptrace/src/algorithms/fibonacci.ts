import type { RecTreeAlgorithmDefinition } from "../types"

// ──────────────────────────── fibonacci ────────────────────────────────
// The DP paradigm made visible: phase 1 DFS-reveals the FULL naive fib(N)
// call tree (it balloons — the same subproblems are recomputed over and over);
// phase 2 re-runs the SAME tree with a memo, so repeated states become cache
// HITS whose subtrees collapse (dimmed) instead of expanding. The full tree is
// laid out ONCE and shipped on frame 0, so the node set never changes.
export const fibonacci = {
  id: "fibonacci",
  kind: "rectree",
  meta: { label: "Fibonacci — recursion vs memo" },
  run: (input, ops) => {
    const N = Math.min(Math.max(Math.round(input.n ?? 5), 1), 6) // cap: the naive tree must stay readable

    // true fib values, so every stored/returned value is exact
    const FIB = [0, 1]
    for (let i = 2; i <= N; i++) FIB[i] = FIB[i - 1] + FIB[i - 2]

    // 1) build the FULL naive call tree — one unique node per CALL
    let nextId = 0
    const all = []
    const build = (k, depth) => {
      const node = { id: "c" + nextId++, k, depth, children: [] }
      all.push(node)
      if (k >= 2) {
        node.children.push(build(k - 1, depth + 1))
        node.children.push(build(k - 2, depth + 1))
      }
      return node
    }
    const root = build(N, 0)

    // tidy layout: leaves fill left→right, internals centre over their children
    const ROW = 62
    const SP = 48
    let leaf = 0
    const layout = (node) => {
      node.y = node.depth * ROW
      if (!node.children.length) {
        node.x = leaf++ * SP
      } else {
        node.children.forEach(layout)
        node.x = (node.children[0].x + node.children[node.children.length - 1].x) / 2
      }
    }
    layout(root)

    const descendants = (node) => {
      const out = []
      for (const c of node.children) {
        out.push(c.id)
        out.push(...descendants(c))
      }
      return out
    }

    const nodeList = all.map((n) => ({
      id: n.id,
      label: `f(${n.k})`,
      x: Math.round(n.x),
      y: n.y,
      depth: n.depth,
    }))
    const edges = []
    for (const n of all) for (const c of n.children) edges.push({ from: n.id, to: c.id })
    ops.tree(
      nodeList,
      edges,
      `Compute f(${N}) by plain recursion: every call spawns two more. The tree balloons because identical subproblems get recomputed from scratch.`,
    )

    // 2) NAIVE phase — DFS the whole tree; every node is a separate call
    ops.phase(
      "naive",
      `Phase 1 — plain recursion. Reveal each call in order; the running count IS the total work.`,
    )
    const naive = (node) => {
      if (node.k < 2) {
        ops.base(node.id, node.k, `f(${node.k}) = ${node.k} — base case, return at once.`)
      } else {
        ops.enter(
          node.id,
          `Call f(${node.k}); with no memory it must recompute f(${node.k - 1}) + f(${node.k - 2}) all over again.`,
        )
        node.children.forEach(naive)
      }
    }
    naive(root)
    const naiveCalls = all.length

    // 3) MEMO phase — same tree, but a table keyed by the argument k
    ops.phase(
      "memo",
      `Phase 2 — memoise. Same tree, but keep a table of computed f(k); a repeat of any state is now a cache hit.`,
    )
    const seen = new Set()
    let memoCalls = 0
    let hits = 0
    const memo = (node) => {
      memoCalls++
      if (seen.has(node.k)) {
        hits++
        ops.hit(
          node.id,
          node.k,
          FIB[node.k],
          descendants(node),
          `f(${node.k}) is already in the table → cache HIT, return ${FIB[node.k]}. Its whole subtree is skipped — that is an overlapping subproblem eliminated.`,
        )
        return FIB[node.k]
      }
      seen.add(node.k)
      if (node.k < 2) {
        ops.miss(
          node.id,
          node.k,
          node.k,
          `f(${node.k}) = ${node.k} — first time seen, store it in the table.`,
        )
      } else {
        ops.miss(
          node.id,
          node.k,
          FIB[node.k],
          `f(${node.k}) is new → compute f(${node.k - 1}) + f(${node.k - 2}) once and store f(${node.k}) = ${FIB[node.k]}.`,
        )
        node.children.forEach(memo)
      }
      return FIB[node.k]
    }
    memo(root)

    ops.done(
      `Naive f(${N}) makes ${naiveCalls} calls. Memoised: ${memoCalls} calls — ${hits} of them cache hits that skipped whole subtrees. Same answer, ${naiveCalls - memoCalls} calls saved.`,
    )
  },
} satisfies RecTreeAlgorithmDefinition
