import {
  indexedArraySearchFamily,
  parseIndexedArraySearchConfig,
  type IndexedArraySearchConfig,
  type IndexedSearchFrame,
} from "../families/indexed-array-search"
import { IndexedSearchRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export function parseJumpSearchConfig(config: StepTraceConfig): IndexedArraySearchConfig {
  const parsed = parseIndexedArraySearchConfig(config, "jump-search", "jump")
  const blockSize = config.blockSize ?? Math.max(1, Math.floor(Math.sqrt(parsed.array.length)))

  if (!Number.isInteger(blockSize) || blockSize <= 0)
    throw new Error('steptrace: jump-search requires "blockSize" to be a positive integer.')

  return { ...parsed, blockSize }
}

export const jumpSearch = {
  id: "jump-search",
  kind: "search",
  family: indexedArraySearchFamily,
  meta: { label: "Jump search" },
  parse: parseJumpSearchConfig,
  run(input, ops) {
    const values = ops.value
    const { target } = input
    const step = input.blockSize as number

    ops.init(
      `Jump search for ${target}: move in blocks of ${step}, then linearly scan the candidate block.`,
    )

    let previousBound = -1
    let bound = Math.min(step - 1, values.length - 1)

    while (true) {
      ops.jumpProbe(
        previousBound,
        bound,
        `Check block end ${bound}: ${values[bound]} ${values[bound] < target ? "is below" : "reaches or passes"} ${target}.`,
      )
      if (values[bound] >= target || bound === values.length - 1) break
      previousBound = bound
      bound = Math.min(bound + step, values.length - 1)
    }

    if (values[bound] < target) {
      ops.done(
        `${target} is larger than the array maximum; not found after ${ops.comparisons} probes.`,
      )
      return
    }

    const lo = previousBound + 1
    const hi = bound
    ops.beginPhase(
      lo,
      hi,
      `The target can only be in block [${lo}, ${hi}]; scan that block from the start.`,
      "scan",
    )

    for (let i = lo; i <= hi && i < values.length; i++) {
      ops.probe(lo, hi, i, `Linear scan in jump block [${lo}, ${hi}]: check index ${i}.`)
      if (values[i] === target) {
        ops.hit(i, `${values[i]} equals ${target}; found it at index ${i}.`)
        ops.done(`Found ${target} at index ${i} after ${ops.comparisons} probes.`)
        return
      }
      if (values[i] > target) {
        break
      }
    }
    ops.done(`${target} is not in the array after ${ops.comparisons} probes.`)
  },
} satisfies FamilyAlgorithmDefinition<
  "search",
  IndexedArraySearchConfig,
  IndexedSearchRecorder,
  IndexedSearchFrame
>
