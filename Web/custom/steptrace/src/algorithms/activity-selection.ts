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

const DEFAULT_MEETINGS: Array<[number, number]> = [
  [0, 6],
  [8, 9],
  [3, 5],
  [1, 4],
  [5, 7],
]

function pair(interval: IntervalToken): [number, number] {
  return [interval.start, interval.end]
}

export const activitySelection = {
  id: "activity-selection",
  kind: "pointers",
  family: intervalTrackFamily,
  meta: { label: "Activity selection" },
  parse(config: StepTraceConfig): IntervalTrackConfig {
    return {
      profile: "activity-selection",
      intervals: parseIntervalTokens(config, DEFAULT_MEETINGS, "activity-selection"),
    }
  },
  run(input, ops) {
    ops.begin("Start with meetings in their original order.")
    const sorted = input.intervals
      .slice()
      .sort((a, b) => a.end - b.end || a.start - b.start || a.id - b.id)
    ops.sorted(
      sorted.map((interval) => interval.id),
      "Sort by finish time so each accepted meeting leaves the most room for what follows.",
    )

    let accepted = sorted[0]
    ops.accept(
      0,
      accepted.id,
      pair(accepted),
      `Accept [${accepted.start}, ${accepted.end}]; it finishes first.`,
    )

    for (let index = 1; index < sorted.length; index++) {
      const next = sorted[index]
      const compatible = next.start >= accepted.end
      ops.inspect(
        index,
        next.id,
        compatible ? "compatible" : "conflict",
        compatible
          ? `${next.start} ≥ ${accepted.end}, so [${next.start}, ${next.end}] is compatible.`
          : `${next.start} < ${accepted.end}, so [${next.start}, ${next.end}] overlaps the last accepted meeting.`,
      )
      if (!compatible) {
        ops.reject(
          index,
          next.id,
          `Reject [${next.start}, ${next.end}]; accepting it would overlap [${accepted.start}, ${accepted.end}].`,
        )
        continue
      }

      accepted = next
      ops.accept(
        index,
        next.id,
        pair(next),
        `Accept [${next.start}, ${next.end}] and move the compatibility boundary to ${next.end}.`,
      )
    }

    ops.finish("Every meeting was considered; the accepted schedule is maximum-size.")
  },
} satisfies FamilyAlgorithmDefinition<
  "pointers",
  IntervalTrackConfig,
  IntervalTrackRecorder & IntervalTrackOperations,
  IntervalTrackFrame
>
