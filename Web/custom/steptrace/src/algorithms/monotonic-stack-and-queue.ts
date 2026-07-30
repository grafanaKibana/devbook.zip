import {
  stackSequenceFamily,
  type StackSequenceConfig,
  type StackSequenceFrame,
  type StackSequenceOperations,
  type StackSequenceRecorder,
} from "../families/stack-sequence"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

const DEFAULT_ARRAY = [73, 74, 75, 71, 69, 72, 76, 73]

export function parseMonotonicStackConfig(config: StepTraceConfig): StackSequenceConfig {
  const array = config.array ?? DEFAULT_ARRAY
  if (!Array.isArray(array) || array.length === 0 || !array.every(Number.isFinite))
    throw new Error(`steptrace: monotonic-stack-and-queue requires a non-empty numeric "array".`)
  return { profile: "next-greater", array: array.slice() }
}

export const monotonicStackAndQueue = {
  id: "monotonic-stack-and-queue",
  kind: "pointers",
  family: stackSequenceFamily,
  meta: { label: "Monotonic stack and queue" },
  parse: parseMonotonicStackConfig,
  run(input, ops) {
    ops.init("Start with an empty decreasing stack of unanswered indices.")
    const stack: number[] = []

    for (let index = 0; index < input.array.length; index++) {
      const value = input.array[index]
      ops.scan(index, `Scan i${index} = ${value}; compare it with the stack top.`)
      while (stack.length && input.array[stack.at(-1)!] < value) {
        const popped = stack.pop()!
        ops.pop(
          index,
          `${value} > ${input.array[popped]}, so pop i${popped}; ${value} is its next greater value.`,
        )
      }
      stack.push(index)
      ops.push(
        index,
        `Push i${index}; retained values are ${stack.map((item) => input.array[item]).join(" > ")}.`,
      )
    }

    ops.done("The scan is complete; retained indices have no greater value to their right.")
  },
} satisfies FamilyAlgorithmDefinition<
  "pointers",
  StackSequenceConfig,
  StackSequenceRecorder & StackSequenceOperations,
  StackSequenceFrame
>
