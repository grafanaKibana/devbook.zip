import {
  runStackFamily,
  type RunStackConfig,
  type RunStackFrame,
  type RunStackRecorder,
} from "../families/run-stack"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

function invalidConfig(message: string): never {
  throw new Error(`steptrace: tim-sort ${message}`)
}

export function parseTimSortConfig(config: StepTraceConfig): RunStackConfig {
  const { array } = config
  if (!Array.isArray(array) || array.length < 2)
    invalidConfig('requires an "array" with at least two numbers.')
  if (!array.every((value) => typeof value === "number" && Number.isFinite(value)))
    invalidConfig('requires every "array" value to be a finite number.')
  const minrun = config.minrun ?? Math.min(array.length, 4)
  if (!Number.isInteger(minrun) || minrun < 2)
    invalidConfig('requires "minrun" to be an integer of at least 2.')
  return { array: array.slice(), minrun: Math.min(minrun, array.length), profile: "tim-sort" }
}

function runLabel(start: number, length: number) {
  return `[${start}, ${start + length - 1}]`
}

export const timSort = {
  id: "tim-sort",
  kind: "sort",
  family: runStackFamily,
  meta: { label: "Tim sort" },
  parse: parseTimSortConfig,
  run(input, ops) {
    const n = ops.value.length
    ops.init(
      `Scan natural runs, extend short runs to minrun ${input.minrun}, then merge the run stack.`,
    )

    function mergeCollapse() {
      while (true) {
        const stack = ops.frames.at(-1)?.stack || []
        if (stack.length < 2) return
        const n = stack.length - 2
        const x = stack[n + 1].length
        const y = stack[n].length
        const z = n > 0 ? stack[n - 1].length : null
        const w = n > 1 ? stack[n - 2].length : null
        const deeperViolation = w != null && z != null && w <= z + y
        const threeRunViolation = z != null && z <= y + x
        const pairViolation = y <= x
        ops.check(
          `Check X=${x}, Y=${y}${z == null ? "" : `, Z=${z}`}: ${threeRunViolation || pairViolation || deeperViolation ? "merge is required" : "invariants hold"}.`,
        )
        if (threeRunViolation || deeperViolation) {
          const mergeIndex = z != null && z < x ? n - 1 : n
          ops.merge(
            mergeIndex,
            false,
            `Invariant collapse: merge adjacent runs ${runLabel(stack[mergeIndex].start, stack[mergeIndex].length)} and ${runLabel(stack[mergeIndex + 1].start, stack[mergeIndex + 1].length)}.`,
          )
        } else if (pairViolation) {
          ops.merge(
            n,
            false,
            `Top pair violates Y > X: merge adjacent runs ${runLabel(stack[n].start, stack[n].length)} and ${runLabel(stack[n + 1].start, stack[n + 1].length)}.`,
          )
        } else return
      }
    }

    let start = 0
    while (start < n) {
      let end = start + 1
      const descending = end < n && ops.value[end] < ops.value[start]
      if (descending) {
        while (end < n && ops.value[end] < ops.value[end - 1]) end++
      } else {
        while (end < n && ops.value[end] >= ops.value[end - 1]) end++
      }
      let length = end - start
      ops.detect(
        { start, length },
        descending ? "descending" : "ascending",
        `Detect ${descending ? "strictly descending" : "ascending"} natural run ${runLabel(start, length)}.`,
      )
      if (descending)
        ops.reverse(
          { start, length },
          `Reverse the strictly descending run ${runLabel(start, length)}; equal keys never entered it.`,
        )

      const forcedLength = Math.min(input.minrun, n - start)
      if (length < forcedLength) {
        ops.extend(
          { start, length: forcedLength },
          `Extend ${runLabel(start, length)} to minrun ${forcedLength} with stable binary insertion.`,
        )
        for (let source = start + length; source < start + forcedLength; source++) {
          const value = ops.value[source]
          let lo = start
          let hi = source
          while (lo < hi) {
            const mid = (lo + hi) >> 1
            if (value < ops.value[mid]) hi = mid
            else lo = mid + 1
          }
          ops.insert(
            { start, length: forcedLength },
            source,
            lo,
            source,
            `Binary-insert ${value} at index ${lo}; equals stay after earlier equals for stability.`,
          )
        }
        length = forcedLength
      }
      ops.push({ start, length }, `Push contiguous run ${runLabel(start, length)} onto the stack.`)
      mergeCollapse()
      start += length
    }

    while ((ops.frames.at(-1)?.stack.length || 0) > 1) {
      const stack = ops.frames.at(-1).stack
      let index = stack.length - 2
      if (index > 0 && stack[index - 1].length < stack[index + 1].length) index--
      ops.merge(
        index,
        true,
        `Force final merge of adjacent runs ${runLabel(stack[index].start, stack[index].length)} and ${runLabel(stack[index + 1].start, stack[index + 1].length)}.`,
      )
    }
    ops.done(
      `One run remains: sorted stably after ${ops.frames.at(-1)?.merges || 0} adjacent merges.`,
    )
  },
} satisfies FamilyAlgorithmDefinition<"sort", RunStackConfig, RunStackRecorder, RunStackFrame>
