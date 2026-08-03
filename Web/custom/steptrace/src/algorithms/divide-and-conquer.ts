import { executionTreeFamily, parseExecutionTreeConfig } from "../families/execution-tree"
import type {
  ExecutionTreeConfig,
  ExecutionTreeFrame,
  ExecutionTreeNode,
  ExecutionTreeOperations,
} from "../families/execution-tree"
import type { ExecutionTreeRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition } from "../types"

export const divideAndConquer = {
  id: "divide-and-conquer",
  kind: "rectree",
  family: executionTreeFamily,
  meta: { label: "Divide and Conquer" },
  parse: parseExecutionTreeConfig,
  run(input, ops) {
    const nodes: ExecutionTreeNode[] = [
      {
        id: "root",
        label: "Problem",
        detail: "whole problem",
        values: [],
        x: 300,
        y: 30,
        depth: 0,
      },
      {
        id: "left",
        label: "Subproblem A",
        detail: "independent work",
        values: [],
        x: 150,
        y: 105,
        depth: 1,
      },
      {
        id: "right",
        label: "Subproblem B",
        detail: "independent work",
        values: [],
        x: 450,
        y: 105,
        depth: 1,
      },
      { id: "a", label: "Base A1", detail: "base case", values: [], x: 60, y: 190, depth: 2 },
      { id: "b", label: "Base A2", detail: "base case", values: [], x: 210, y: 190, depth: 2 },
      { id: "c", label: "Base B1", detail: "base case", values: [], x: 390, y: 190, depth: 2 },
      { id: "d", label: "Base B2", detail: "base case", values: [], x: 540, y: 190, depth: 2 },
    ]
    const edges = [
      { from: "root", to: "left" },
      { from: "root", to: "right" },
      { from: "left", to: "a" },
      { from: "left", to: "b" },
      { from: "right", to: "c" },
      { from: "right", to: "d" },
    ]

    ops.tree(
      nodes,
      edges,
      "root",
      "Start with one problem. The fixed tree reveals the recursive structure without moving the layout.",
    )
    ops.split(
      "root",
      ["root"],
      ["left", "right"],
      "Divide Problem into independent Subproblem A and Subproblem B.",
    )
    ops.split(
      "left",
      ["root", "left"],
      ["a", "b"],
      "Divide Subproblem A until its work reaches Base A1 and Base A2.",
    )
    ops.base(
      "a",
      ["root", "left", "a"],
      "base result A1",
      "Base A1 solves its smallest direct case.",
    )
    ops.returnResult(
      "a",
      ["root", "left"],
      "base result A1",
      "Return the Base A1 result to Subproblem A.",
    )
    ops.base(
      "b",
      ["root", "left", "b"],
      "base result A2",
      "Base A2 solves its smallest direct case.",
    )
    ops.returnResult(
      "b",
      ["root", "left"],
      "base result A2",
      "Return the Base A2 result to Subproblem A.",
    )
    ops.combine("left", ["root", "left"], "Result A", "Combine the two base results into Result A.")
    ops.returnResult("left", ["root"], "Result A", "Return Result A to Problem.")
    ops.split(
      "right",
      ["root", "right"],
      ["c", "d"],
      "Divide Subproblem B until its work reaches Base B1 and Base B2.",
    )
    ops.base(
      "c",
      ["root", "right", "c"],
      "base result B1",
      "Base B1 solves its smallest direct case.",
    )
    ops.returnResult(
      "c",
      ["root", "right"],
      "base result B1",
      "Return the Base B1 result to Subproblem B.",
    )
    ops.base(
      "d",
      ["root", "right", "d"],
      "base result B2",
      "Base B2 solves its smallest direct case.",
    )
    ops.returnResult(
      "d",
      ["root", "right"],
      "base result B2",
      "Return the Base B2 result to Subproblem B.",
    )
    ops.combine(
      "right",
      ["root", "right"],
      "Result B",
      "Combine the two base results into Result B.",
    )
    ops.returnResult("right", ["root"], "Result B", "Return Result B to Problem.")
    ops.combine(
      "root",
      ["root"],
      "Final solution",
      "Combine Result A and Result B into the Final solution.",
    )
    ops.done(
      "root",
      "Final solution",
      "Final solution: independent work returns upward until the original problem is combined.",
    )
  },
} satisfies FamilyAlgorithmDefinition<
  "rectree",
  ExecutionTreeConfig,
  ExecutionTreeRecorder & ExecutionTreeOperations,
  ExecutionTreeFrame
>
