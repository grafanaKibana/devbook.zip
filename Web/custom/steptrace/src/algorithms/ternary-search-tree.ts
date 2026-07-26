import {
  characterTopology,
  prefixCharacterFamily,
  type PrefixCharacterConfig,
  type PrefixCharacterEdge,
  type PrefixCharacterFrame,
  type PrefixCharacterOperation,
  type PrefixCharacterOperations,
  type PrefixCharacterRecorder,
} from "../families/prefix-character"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

type Role = "lo" | "eq" | "hi"

interface TernaryNode {
  id: string
  character: string
  lo: string | null
  eq: string | null
  hi: string | null
}

interface TernarySearchTreeConfig extends PrefixCharacterConfig {
  profile: "ternary-search-tree"
  rootNode: string
  ternaryNodes: Readonly<Record<string, Readonly<TernaryNode>>>
}

function invalid(message: string): never {
  throw new Error(`steptrace: ternary-search-tree ${message}`)
}

const edgeId = (from: string, role: Role, to: string) => `${from}-${role}->${to}`

export function parseTernarySearchTreeConfig(config: StepTraceConfig): TernarySearchTreeConfig {
  if (!Array.isArray(config.operations) || !config.operations.length)
    invalid('requires a non-empty "operations" array.')
  const operations = config.operations.map((entry) => {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !["insert", "search"].includes(entry[0]) ||
      typeof entry[1] !== "string" ||
      !entry[1]
    )
      invalid('operations must be ["insert"|"search", non-empty string] pairs.')
    return [entry[0], entry[1]] as [PrefixCharacterOperation, string]
  })
  const inserts = operations.filter(([operation]) => operation === "insert")
  if (!inserts.length) invalid("requires at least one insert before search.")

  let serial = 0
  let rootNode: string | null = null
  const nodes: Record<string, TernaryNode> = {}
  const edges: PrefixCharacterEdge[] = []
  const create = (character: string) => {
    const id = `${character}${++serial}`
    nodes[id] = { id, character, lo: null, eq: null, hi: null }
    return id
  }
  for (const [, key] of inserts) {
    let index = 0
    if (!rootNode) {
      rootNode = create(key[0])
      edges.push({ id: edgeId("root", "eq", rootNode), from: "root", to: rootNode, role: "eq" })
    }
    let current = rootNode
    while (true) {
      const node = nodes[current]
      const character = key[index]
      if (character < node.character) {
        if (!node.lo) {
          node.lo = create(character)
          edges.push({ id: edgeId(current, "lo", node.lo), from: current, to: node.lo, role: "lo" })
        }
        current = node.lo
      } else if (character > node.character) {
        if (!node.hi) {
          node.hi = create(character)
          edges.push({ id: edgeId(current, "hi", node.hi), from: current, to: node.hi, role: "hi" })
        }
        current = node.hi
      } else {
        if (index === key.length - 1) break
        index++
        if (!node.eq) {
          node.eq = create(key[index])
          edges.push({ id: edgeId(current, "eq", node.eq), from: current, to: node.eq, role: "eq" })
        }
        current = node.eq
      }
    }
  }
  const labels = new Map<string, string>([
    ["root", "root"],
    ...Object.values(nodes).map((node) => [node.id, node.character] as [string, string]),
  ])
  const built = characterTopology(labels, edges)
  return {
    profile: "ternary-search-tree",
    operations,
    rootNode,
    ternaryNodes: Object.freeze(
      Object.fromEntries(Object.entries(nodes).map(([id, node]) => [id, Object.freeze({ ...node })])),
    ),
    nodes: built.nodes,
    edges: built.edges,
  }
}

function traverse(
  input: TernarySearchTreeConfig,
  ops: PrefixCharacterOperations,
  operation: "insert" | "search",
  key: string,
) {
  ops.begin(operation, key, `${operation} "${key}" starts at the ternary root.`)
  let index = 0
  let current = input.rootNode
  const rootEdge = edgeId("root", "eq", current)
  if (ops.hasVisibleEdge(rootEdge))
    ops.reuseEdge(rootEdge, current, index, `Enter root character ${input.ternaryNodes[current].character}.`)
  else ops.createNode(rootEdge, current, index, `Create root character ${input.ternaryNodes[current].character}.`)

  while (current) {
    const node = input.ternaryNodes[current]
    const character = key[index]
    if (character === node.character) {
      if (index === key.length - 1) {
        if (operation === "insert") ops.markTerminal(current, `Mark "${key}" terminal.`)
        else
          ops.completeSearch(
            ops.hasTerminal(current),
            `Character matched; IsEnd("${key}") is ${ops.hasTerminal(current)}.`,
          )
        return
      }
      index++
      if (!node.eq) break
      const id = edgeId(current, "eq", node.eq)
      if (ops.hasVisibleEdge(id))
        ops.reuseEdge(id, node.eq, index, `eq consumes the character; continue with ${key[index]}.`)
      else ops.createNode(id, node.eq, index, `eq consumes the character; create ${key[index]}.`)
      current = node.eq
    } else {
      const role: Role = character < node.character ? "lo" : "hi"
      const next = node[role]
      if (!next) break
      const id = edgeId(current, role, next)
      if (ops.hasVisibleEdge(id))
        ops.reuseEdge(id, next, index, `${role} keeps the cursor on ${character}.`)
      else ops.createNode(id, next, index, `${role} keeps the cursor on ${character}.`)
      current = next
    }
  }
  if (operation === "search") ops.completeSearch(false, `Search "${key}" stopped before a terminal.`)
}

export const ternarySearchTree = {
  id: "ternary-search-tree",
  kind: "string",
  family: prefixCharacterFamily,
  meta: { label: "Ternary Search Tree" },
  parse: parseTernarySearchTreeConfig,
  run(input, ops) {
    for (const [operation, key] of input.operations)
      traverse(input, ops, operation as "insert" | "search", key)
    ops.done("Ternary search tree complete: lo/hi compared without consuming; eq consumed.")
  },
} satisfies FamilyAlgorithmDefinition<
  "string",
  TernarySearchTreeConfig,
  PrefixCharacterRecorder & PrefixCharacterOperations,
  PrefixCharacterFrame
>
