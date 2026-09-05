import { readFileSync } from "node:fs"
import path from "node:path"

import { extractFlowmaid } from "../src/authoring/extract"
import { parseFlowmaidYaml } from "../src/authoring/yaml"
import { compileFlowmaid } from "../src/domain/compile"
import type { DirectedGraph, FlowmaidProgram } from "../src/domain/types"

export const repo = path.resolve(import.meta.dirname, "../../../..")
export const read = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

export const fixture = (name: string): FlowmaidProgram => {
  const extracted = extractFlowmaid(read(`Web/custom/flowmaid/test/fixtures/${name}.mmd`))
  if (extracted.kind !== "found") throw new Error(`${name}: carrier not found`)
  return compileFlowmaid(parseFlowmaidYaml(extracted.value.yaml))
}

export const kafkaGraph: DirectedGraph = {
  nodes: ["P1", "P2", "PR", "T1", "T2", "T3", "C1", "C2", "C3"],
  edges: [
    { id: "P1-PR", from: "P1", to: "PR" },
    { id: "P2-PR", from: "P2", to: "PR" },
    { id: "PR-T1", from: "PR", to: "T1" },
    { id: "PR-T2", from: "PR", to: "T2" },
    { id: "PR-T3", from: "PR", to: "T3" },
    { id: "T1-C1", from: "T1", to: "C1" },
    { id: "T2-C2", from: "T2", to: "C2" },
    { id: "T3-C3", from: "T3", to: "C3" },
  ],
}
