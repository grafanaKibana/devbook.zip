import {
  parsePrefixCharacterConfig,
  prefixCharacterFamily,
  type PrefixCharacterConfig,
  type PrefixCharacterFrame,
  type PrefixCharacterOperations,
  type PrefixCharacterRecorder,
} from "../families/prefix-character"
import type { FamilyAlgorithmDefinition } from "../types"

export const trie = {
  id: "trie",
  kind: "string",
  family: prefixCharacterFamily,
  meta: { label: "Trie" },
  parse: parsePrefixCharacterConfig,
  run(input, ops) {
    for (const [operation, key] of input.operations) {
      ops.begin(operation, key, `${operation} "${key}" starts at the root.`)
      let prefix = ""
      let pathExists = true
      for (let index = 0; index < key.length; index++) {
        const next = prefix + key[index]
        const edgeId = `${prefix || "root"}->${next}`
        if (!ops.hasVisibleEdge(edgeId)) {
          if (operation !== "insert") {
            pathExists = false
            break
          }
          ops.createNode(edgeId, next, index + 1, `Create edge ${key[index]} and node "${next}".`)
        } else {
          ops.reuseEdge(edgeId, next, index + 1, `Reuse edge ${key[index]} to node "${next}".`)
        }
        prefix = next
      }
      if (operation === "insert") {
        ops.markTerminal(key, `Mark "${key}" terminal; descendants do not change that marker.`)
      } else if (operation === "prefix") {
        ops.completePrefix(pathExists, `Prefix "${key}" tests path existence: ${pathExists}.`)
      } else {
        const found = pathExists && ops.hasTerminal(key)
        ops.completeSearch(found, `Search "${key}" tests IsEnd after the path: ${found}.`)
      }
    }
    ops.done("All trie operations complete; shared prefixes remain one persistent path.")
  },
} satisfies FamilyAlgorithmDefinition<
  "string",
  PrefixCharacterConfig,
  PrefixCharacterRecorder & PrefixCharacterOperations,
  PrefixCharacterFrame
>
