import {
  monotoneBoundaryFamily,
  type BoundaryEvaluation,
  type BoundarySearchFrame,
  type BoundarySearchOperations,
  type MonotoneBoundaryConfig,
} from "../families/monotone-boundary"
import { BoundarySearchRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export function parseBinarySearchOnAnswerConfig(
  config: StepTraceConfig,
): MonotoneBoundaryConfig {
  const { weights, days } = config

  if (!Array.isArray(weights) || weights.length === 0)
    throw new Error('steptrace: binary-search-on-answer requires a non-empty "weights" array.')
  if (!weights.every((weight) => Number.isInteger(weight) && weight > 0))
    throw new Error('steptrace: binary-search-on-answer requires positive integer "weights".')
  if (!Number.isInteger(days) || (days as number) <= 0)
    throw new Error('steptrace: binary-search-on-answer requires "days" to be a positive integer.')

  return {
    profile: "shipping-capacity",
    lower: Math.max(...weights),
    upper: weights.reduce((total, weight) => total + weight, 0),
    weights: weights.slice(),
    days: days as number,
    goal: "smallest feasible capacity",
  }
}

function evaluateShipping(
  weights: readonly number[],
  capacity: number,
  allowed: number,
): BoundaryEvaluation {
  const lanes: BoundaryEvaluation["lanes"] = []
  let items: number[] = []
  let total = 0

  for (const weight of weights) {
    if (total + weight > capacity) {
      lanes.push({ label: `Day ${lanes.length + 1}`, items, total })
      items = []
      total = 0
    }
    items.push(weight)
    total += weight
  }
  lanes.push({ label: `Day ${lanes.length + 1}`, items, total })

  return {
    lanes,
    required: lanes.length,
    allowed,
    feasible: lanes.length <= allowed,
  }
}

export const binarySearchOnAnswer = {
  id: "binary-search-on-answer",
  kind: "search",
  family: monotoneBoundaryFamily,
  meta: { label: "Binary search on answer" },
  parse: parseBinarySearchOnAnswerConfig,
  run(input, ops) {
    ops.begin(
      `Search capacities ${input.lower} through ${input.upper}; the first feasible value is the answer.`,
    )

    let lo = input.lower
    let hi = input.upper
    while (lo < hi) {
      const candidate = lo + Math.floor((hi - lo) / 2)
      const evaluation = evaluateShipping(input.weights, candidate, input.days)
      ops.evaluate(
        lo,
        hi,
        candidate,
        evaluation,
        `Capacity ${candidate} needs ${evaluation.required} day${evaluation.required === 1 ? "" : "s"}: ${evaluation.feasible ? "feasible" : "too small"}.`,
      )

      if (evaluation.feasible) hi = candidate
      else lo = candidate + 1
      ops.narrow(
        lo,
        hi,
        evaluation.feasible
          ? `Keep ${lo} through ${hi}; a smaller feasible capacity may exist.`
          : `Keep ${lo} through ${hi}; every smaller capacity is infeasible.`,
      )
    }

    const evaluation = evaluateShipping(input.weights, lo, input.days)
    ops.hit(lo, evaluation, `${lo} is the first feasible capacity.`)
    ops.done(`Minimum feasible ship capacity: ${lo}.`)
  },
} satisfies FamilyAlgorithmDefinition<
  "search",
  MonotoneBoundaryConfig,
  BoundarySearchRecorder & BoundarySearchOperations,
  BoundarySearchFrame
>
