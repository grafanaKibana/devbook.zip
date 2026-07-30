import { mountFibonacciHeap, type FibonacciHeapConfig } from "../families/heap-structure"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [3, 7, 18, 24, 26, 39, 41, 52, 63]

export function parseFibonacciHeapConfig(config: StepTraceConfig): FibonacciHeapConfig {
  const values = Array.isArray(config.array) && config.array.length ? config.array : DEFAULT_VALUES
  if (
    values.some(
      (value) => typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value),
    )
  )
    throw new Error(`steptrace: fibonacci-heap requires finite integer values.`)
  return { values: values as number[] }
}

export const fibonacciHeap = {
  id: "fibonacci-heap",
  family: "heap-selection",
  meta: { label: "Fibonacci heap" },
  parse: parseFibonacciHeapConfig,
  mount: mountFibonacciHeap,
} satisfies InteractiveStructureDefinition<FibonacciHeapConfig>
