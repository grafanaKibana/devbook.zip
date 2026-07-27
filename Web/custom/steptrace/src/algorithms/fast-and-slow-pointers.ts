import {
  linkedTopologyFamily,
  type LinkedTopologyConfig,
  type LinkedTopologyFrame,
  type LinkedTopologyOperations,
  type LinkedTopologyRecorder,
} from "../families/linked-topology"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

const CONFIG: LinkedTopologyConfig = {
  profile: "fast-slow-pointers",
  nodes: [
    { id: "A", x: 10, y: 35 },
    { id: "B", x: 35, y: 35 },
    { id: "C", x: 60, y: 35 },
    { id: "D", x: 65, y: 14 },
    { id: "E", x: 75, y: 14 },
    { id: "F", x: 80, y: 35 },
    { id: "G", x: 75, y: 56 },
    { id: "H", x: 65, y: 56 },
  ],
  next: { A: "B", B: "C", C: "D", D: "E", E: "F", F: "G", G: "H", H: "C" },
  cycle: ["C", "D", "E", "F", "G", "H"],
  entry: "C",
}

export function parseFastAndSlowPointersConfig(_config: StepTraceConfig): LinkedTopologyConfig {
  return {
    ...CONFIG,
    nodes: CONFIG.nodes.map((node) => ({ ...node })),
    next: { ...CONFIG.next },
    cycle: CONFIG.cycle.slice(),
  }
}

export const fastAndSlowPointers = {
  id: "fast-and-slow-pointers",
  kind: "pointers",
  family: linkedTopologyFamily,
  meta: { label: "Fast and slow pointers" },
  parse: parseFastAndSlowPointersConfig,
  run(_input, ops) {
    ops.begin("Start slow and fast at A.")

    ops.move("slow", "B", "Slow advances one node: A → B.")
    ops.move("fast", "B", "Fast begins its two-node advance: A → B.")
    ops.move("fast", "C", "Fast completes the advance: B → C.")

    ops.move("slow", "C", "Slow advances one node: B → C.")
    ops.move("fast", "D", "Fast begins its next advance: C → D.")
    ops.move("fast", "E", "Fast completes the advance: D → E.")

    ops.move("slow", "D", "Slow advances one node: C → D.")
    ops.move("fast", "F", "Fast begins its next advance: E → F.")
    ops.move("fast", "G", "Fast completes the advance: F → G.")

    ops.move("slow", "E", "Slow advances one node: D → E.")
    ops.move("fast", "H", "Fast begins its next advance: G → H.")
    ops.move("fast", "C", "Fast completes the advance and wraps: H → C.")

    ops.move("slow", "F", "Slow advances one node: E → F.")
    ops.move("fast", "D", "Fast begins its next advance: C → D.")
    ops.move("fast", "E", "Fast completes the advance: D → E.")

    ops.move("slow", "G", "Slow advances one node: F → G.")
    ops.move("fast", "F", "Fast begins its next advance: E → F.")
    ops.meet("fast", "G", "Fast completes the advance at G; both pointers meet, proving a cycle.")

    ops.reset(
      "fast",
      "A",
      "Reset fast to A. Keep slow at G; both pointers now move one node at a time.",
    )
    ops.move("fast", "B", "Head pointer advances one node: A → B.")
    ops.move("slow", "H", "Cycle pointer advances one node: G → H.")
    ops.move("fast", "C", "Head pointer advances one node: B → C.")
    ops.enter("slow", "C", "Cycle pointer advances H → C; both meet at cycle entry C.")
  },
} satisfies FamilyAlgorithmDefinition<
  "pointers",
  LinkedTopologyConfig,
  LinkedTopologyRecorder & LinkedTopologyOperations,
  LinkedTopologyFrame
>
