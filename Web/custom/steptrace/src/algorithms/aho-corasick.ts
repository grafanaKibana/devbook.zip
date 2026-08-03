import {
  prefixCharacterFamily,
  prefixTopology,
  type PrefixCharacterConfig,
  type PrefixCharacterEdge,
  type PrefixCharacterFrame,
  type PrefixCharacterOperations,
  type PrefixCharacterRecorder,
} from "../families/prefix-character"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

interface AhoCorasickConfig extends PrefixCharacterConfig {
  profile: "aho-corasick"
  patterns: string[]
  text: string
  failures: Readonly<Record<string, string>>
}

function invalid(message: string): never {
  throw new Error(`steptrace: aho-corasick ${message}`)
}

export function parseAhoCorasickConfig(config: StepTraceConfig): AhoCorasickConfig {
  if (!Array.isArray(config.patterns) || !config.patterns.length)
    invalid('requires a non-empty "patterns" array.')
  if (!config.patterns.every((pattern) => typeof pattern === "string" && pattern))
    invalid('requires every "patterns" value to be a non-empty string.')
  if (typeof config.text !== "string" || !config.text) invalid('requires a non-empty "text".')
  const patterns = config.patterns.slice()
  const built = prefixTopology(patterns)
  const ids = new Set(built.nodes.map((node) => node.id))
  const failures: Record<string, string> = {}
  for (const node of built.nodes.filter((candidate) => candidate.id !== "root")) {
    let suffix = node.id.slice(1)
    while (suffix && !ids.has(suffix)) suffix = suffix.slice(1)
    failures[node.id] = suffix || "root"
  }
  const failureEdges: PrefixCharacterEdge[] = Object.entries(failures)
    .filter(([, target]) => target !== "root")
    .map(([from, to]) => ({ id: `fail:${from}->${to}`, from, to, kind: "failure" }))
  return {
    profile: "aho-corasick",
    patterns,
    text: config.text,
    failures,
    operations: [
      ...patterns.map((pattern) => ["insert", pattern] as ["insert", string]),
      ["build failures", "patterns"],
      ["scan", config.text],
    ],
    nodes: built.nodes,
    edges: [...built.edges, ...failureEdges],
  }
}

export const ahoCorasick = {
  id: "aho-corasick",
  kind: "string",
  family: prefixCharacterFamily,
  meta: { label: "Aho-Corasick" },
  parse: parseAhoCorasickConfig,
  run(input, ops) {
    for (const pattern of input.patterns) {
      ops.begin("insert", pattern, `Insert pattern "${pattern}" into the shared prefix tree.`)
      let prefix = ""
      for (let index = 0; index < pattern.length; index++) {
        const next = prefix + pattern[index]
        const edgeId = `${prefix || "root"}->${next}`
        if (ops.hasVisibleEdge(edgeId))
          ops.reuseEdge(edgeId, next, index + 1, `Reuse ${pattern[index]} to state "${next}".`)
        else ops.createNode(edgeId, next, index + 1, `Create state "${next}".`)
        prefix = next
      }
      ops.markTerminal(pattern, `Mark output pattern "${pattern}".`)
    }

    ops.begin("build failures", "patterns", "Compute the longest proper suffix for each state.")
    for (const node of input.nodes.filter((candidate) => candidate.id !== "root")) {
      const target = input.failures[node.id]
      const edgeId = target === "root" ? null : `fail:${node.id}->${target}`
      ops.failureLink(edgeId, node.id, `Failure("${node.id}") → ${target}.`)
    }

    ops.setText(input.text)
    ops.begin("scan", input.text, `Scan "${input.text}" once through goto and failure links.`)
    const states = new Set(input.nodes.map((node) => node.id))
    let state = "root"
    for (let index = 0; index < input.text.length; index++) {
      const character = input.text[index]
      while (state !== "root" && !states.has(`${state}${character}`)) {
        const target = input.failures[state]
        const edgeId = target === "root" ? null : `fail:${state}->${target}`
        ops.fallback(edgeId, target, index, `No ${character} edge: fall back ${state} → ${target}.`)
        state = target
      }
      const next = state === "root" ? character : `${state}${character}`
      if (states.has(next)) {
        ops.goto(`${state}->${next}`, next, index, `Consume ${character}: goto "${next}".`)
        state = next
      } else {
        ops.fallback(null, "root", index, `No ${character} edge from root; stay at root.`)
        state = "root"
      }
      const outputs: string[] = []
      let outputState = state
      while (outputState !== "root") {
        if (input.patterns.includes(outputState)) outputs.push(outputState)
        outputState = input.failures[outputState]
      }
      if (outputs.length)
        ops.output(outputs, index, `Emit ${outputs.join(" + ")} ending at text index ${index}.`)
    }
    ops.done("Scan complete.")
  },
} satisfies FamilyAlgorithmDefinition<
  "string",
  AhoCorasickConfig,
  PrefixCharacterRecorder & PrefixCharacterOperations,
  PrefixCharacterFrame
>
