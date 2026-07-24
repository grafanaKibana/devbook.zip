import {
  executionTreeFamily,
  parseMemoizationConfig,
  type ExecutionTreeConfig,
  type ExecutionTreeFrame,
  type ExecutionTreeNode,
  type ExecutionTreeOperations,
} from "../families/execution-tree"
import type { ExecutionTreeRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition } from "../types"

export const memoization = {
  id: "memoization",
  kind: "rectree",
  family: executionTreeFamily,
  meta: { label: "Memoization" },
  parse: parseMemoizationConfig,
  run(input, ops) {
    const nodes: ExecutionTreeNode[] = [
      { id: "a", label: "solve(A)", detail: "key A", values: [], x: 300, y: 24, depth: 0 },
      { id: "b", label: "solve(B)", detail: "key B", values: [], x: 165, y: 82, depth: 1 },
      { id: "c", label: "solve(C)", detail: "key C", values: [], x: 435, y: 82, depth: 1 },
      { id: "d1", label: "solve(D)", detail: "key D", values: [], x: 105, y: 140, depth: 2 },
      { id: "e", label: "solve(E)", detail: "base key E", values: [], x: 225, y: 140, depth: 2 },
      { id: "d2", label: "solve(D)", detail: "same key D", values: [], x: 375, y: 140, depth: 2 },
      { id: "e2", label: "solve(E)", detail: "same key E", values: [], x: 495, y: 140, depth: 2 },
      { id: "g1", label: "solve(G)", detail: "base key G", values: [], x: 55, y: 198, depth: 3 },
      { id: "h1", label: "solve(H)", detail: "base key H", values: [], x: 155, y: 198, depth: 3 },
      { id: "g2", label: "solve(G)", detail: "would repeat", values: [], x: 325, y: 198, depth: 3 },
      { id: "h2", label: "solve(H)", detail: "would repeat", values: [], x: 425, y: 198, depth: 3 },
    ]
    const edges = [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
      { from: "b", to: "d1" },
      { from: "b", to: "e" },
      { from: "c", to: "d2" },
      { from: "c", to: "e2" },
      { from: "d1", to: "g1" },
      { from: "d1", to: "h1" },
      { from: "d2", to: "g2" },
      { from: "d2", to: "h2" },
    ]

    ops.tree(nodes, edges, "a", "Begin at state A with an empty cache.")
    ops.split("a", ["a"], ["b", "c"], "State A needs the results of states B and C.")
    ops.split("b", ["a", "b"], ["d1", "e"], "State B needs states D and E.")
    ops.split("d1", ["a", "b", "d1"], ["g1", "h1"], "State D is new, so expand it once.")
    ops.base("g1", ["a", "b", "d1", "g1"], "result G", "State G is a base case.")
    ops.base("h1", ["a", "b", "d1", "h1"], "result H", "State H is a base case.")
    ops.combine("d1", ["a", "b", "d1"], "result D", "Combine the base results to finish state D.")
    ops.store(
      "d1",
      ["a", "b", "d1"],
      "D",
      "result D",
      "Store state D under its complete cache key.",
    )
    ops.base("e", ["a", "b", "e"], "result E", "State E is a base case.")
    ops.store("e", ["a", "b", "e"], "E", "result E", "Store state E for any later repeat.")
    ops.combine("b", ["a", "b"], "result B", "Combine D and E to finish state B.")
    ops.store("b", ["a", "b"], "B", "result B", "Store state B for any later repeat.")
    ops.split("c", ["a", "c"], ["d2", "e2"], "State C reuses cached states D and E.")
    ops.cacheHit(
      "d2",
      ["a", "c", "d2"],
      "D",
      "result D",
      ["g2", "h2"],
      "Key D is already cached: return result D without entering its two child calls.",
    )
    ops.cacheHit(
      "e2",
      ["a", "c", "e2"],
      "E",
      "result E",
      [],
      "Key E is already cached: reuse the base result immediately.",
    )
    ops.combine("c", ["a", "c"], "result C", "Combine the cached branches to finish state C.")
    ops.store("c", ["a", "c"], "C", "result C", "Store state C.")
    ops.combine("a", ["a"], "result A", "Combine B and C to finish the original state.")
    ops.store("a", ["a"], "A", "result A", "Store the final state A.")
    ops.done(
      "a",
      "result A",
      "Memoization computed each cache key once and skipped repeated D and E branches.",
    )
  },
} satisfies FamilyAlgorithmDefinition<
  "rectree",
  ExecutionTreeConfig,
  ExecutionTreeRecorder & ExecutionTreeOperations,
  ExecutionTreeFrame
>
