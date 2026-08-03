import {
  intervalTrackFamily,
  parseIntervalTokens,
  type IntervalToken,
  type IntervalTrackConfig,
  type IntervalTrackFrame,
  type IntervalTrackOperations,
  type IntervalTrackRecorder,
} from "../families/interval-track"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

const DEFAULT_INTERVALS: Array<[number, number]> = [
  [13, 16],
  [1, 4],
  [8, 10],
  [2, 6],
  [16, 20],
  [9, 12],
  [3, 5],
]

export function parseMergeIntervalsConfig(config: StepTraceConfig): IntervalTrackConfig {
  return {
    profile: "merge-intervals",
    intervals: parseIntervalTokens(config, DEFAULT_INTERVALS, "merge-intervals"),
  }
}

function pair(interval: IntervalToken): [number, number] {
  return [interval.start, interval.end]
}

export const mergeIntervals = {
  id: "merge-intervals",
  kind: "pointers",
  family: intervalTrackFamily,
  meta: { label: "Merge intervals" },
  parse: parseMergeIntervalsConfig,
  run(input, ops) {
    ops.begin("Start with intervals in their original order.")
    const sorted = input.intervals
      .slice()
      .sort((a, b) => a.start - b.start || a.end - b.end || a.id - b.id)
    ops.sorted(
      sorted.map((interval) => interval.id),
      "Sort intervals by start so every possible overlap becomes adjacent.",
    )

    let current = pair(sorted[0])
    ops.seed(0, sorted[0].id, current, `Seed the current block with [${current.join(", ")}].`)

    for (let index = 1; index < sorted.length; index++) {
      const next = sorted[index]
      if (next.start <= current[1]) {
        const relation = next.end <= current[1] ? "contained" : "overlap"
        ops.inspect(
          index,
          next.id,
          relation,
          relation === "contained"
            ? `[${next.start}, ${next.end}] is contained in [${current.join(", ")}]; keep the current end.`
            : `${next.start} ≤ ${current[1]}, so [${next.start}, ${next.end}] overlaps the current block.`,
        )
        if (relation === "contained") continue
        current = [current[0], Math.max(current[1], next.end)]
        ops.extend(current, `Extend the current block to [${current.join(", ")}].`)
        continue
      }

      ops.inspect(
        index,
        next.id,
        "gap",
        `${next.start} > ${current[1]}, so a gap closes [${current.join(", ")}].`,
      )
      ops.emit(
        current,
        `Emit [${current.join(", ")}]; no later interval can reach back across the gap.`,
      )
      current = pair(next)
      ops.restart(index, next.id, current, `Start a new current block at [${current.join(", ")}].`)
    }

    ops.done(current, `Emit [${current.join(", ")}] and finish the sweep.`)
  },
} satisfies FamilyAlgorithmDefinition<
  "pointers",
  IntervalTrackConfig,
  IntervalTrackRecorder & IntervalTrackOperations,
  IntervalTrackFrame
>
