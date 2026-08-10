import {
  indexedArraySearchFamily,
  parseIndexedArraySearchConfig,
  type IndexedArraySearchConfig,
  type IndexedSearchFrame,
} from "../families/indexed-array-search"
import { IndexedSearchRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export function parseFibonacciSearchConfig(config: StepTraceConfig): IndexedArraySearchConfig {
  return parseIndexedArraySearchConfig(config, "fibonacci-search", "fibonacci")
}

export const fibonacciSearch = {
  id: "fibonacci-search",
  kind: "search",
  family: indexedArraySearchFamily,
  meta: { label: "Fibonacci search" },
  parse: parseFibonacciSearchConfig,
  run(input, ops) {
    const values = ops.value
    const target = input.target
    let fib2 = 0
    let fib1 = 1
    let fib = fib1 + fib2
    while (fib < values.length) {
      fib2 = fib1
      fib1 = fib
      fib = fib1 + fib2
    }
    let offset = -1
    ops.init(`Fibonacci search for ${target}: narrow the sorted suffix with Fibonacci offsets.`)
    ops.beginPhase(0, values.length - 1, `Start with Fibonacci window ${fib}.`, "fibonacci")
    while (fib > 1) {
      const probe = Math.min(offset + fib2, values.length - 1)
      ops.annotatedProbe(
        offset + 1,
        Math.min(offset + fib - 1, values.length - 1),
        probe,
        "offset",
        String(offset),
        `Probe offset + F(k−2) at index ${probe}: ${values[probe]}.`,
      )
      if (values[probe] < target) {
        fib = fib1
        fib1 = fib2
        fib2 = fib - fib1
        offset = probe
        ops.narrow(
          offset + 1,
          Math.min(offset + fib, values.length - 1),
          `Discard through index ${probe}.`,
        )
      } else if (values[probe] > target) {
        fib = fib2
        fib1 -= fib2
        fib2 = fib - fib1
        ops.narrow(
          offset + 1,
          Math.min(offset + fib - 1, values.length - 1),
          `Discard from index ${probe}.`,
        )
      } else {
        ops.hit(probe, `${target} is at index ${probe}.`)
        ops.done(`Found ${target} after ${ops.comparisons} probes.`)
        return
      }
    }
    if (fib1 && offset + 1 < values.length) {
      const probe = offset + 1
      ops.probe(probe, probe, probe, `Check the final candidate at index ${probe}.`)
      if (values[probe] === target) {
        ops.hit(probe, `${target} is at index ${probe}.`)
        ops.done(`Found ${target} after ${ops.comparisons} probes.`)
        return
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
