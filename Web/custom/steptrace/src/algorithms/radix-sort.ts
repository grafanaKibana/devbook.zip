import {
  BucketDistributionRecorder,
  radixDistributionFamily,
  type BucketDistributionFrame,
  type RadixDistributionConfig,
} from "../families/bucket-distribution"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

function invalidConfig(message: string): never {
  throw new Error(`steptrace: radix-sort ${message}`)
}

export function parseRadixSortConfig(config: StepTraceConfig): RadixDistributionConfig {
  const { array } = config
  const radix = config.radix ?? 10
  const mode = config.mode ?? "LSD"
  if (!Array.isArray(array) || array.length < 2)
    invalidConfig('requires an "array" with at least two non-negative integers.')
  if (!array.every((value) => Number.isSafeInteger(value) && value >= 0))
    invalidConfig('requires every "array" value to be a non-negative safe integer.')
  if (array.length > 12)
    invalidConfig("limits the demonstration to 12 keys so every bucket pass remains legible.")
  if (!Number.isInteger(radix) || radix < 2 || radix > 16)
    invalidConfig('requires "radix" to be an integer from 2 through 16.')
  if (String(mode).toUpperCase() !== "LSD")
    invalidConfig('currently visualizes only stable least-significant-digit mode ("LSD").')

  const max = Math.max(...array)
  const places: number[] = []
  for (let place = 1; place <= Math.max(max, 1); place *= radix) {
    places.push(place)
    if (Math.floor(max / place) < radix) break
  }
  return {
    profile: "radix",
    array: array.slice(),
    radix,
    bucketCount: radix,
    bucketLabels: Array.from({ length: radix }, (_, digit) => String(digit)),
    places,
  }
}

function digitName(place: number, radix: number) {
  if (radix !== 10) return `place ${place}`
  if (place === 1) return "ones"
  if (place === 10) return "tens"
  if (place === 100) return "hundreds"
  if (place === 1000) return "thousands"
  return `place ${place}`
}

export const radixSort = {
  id: "radix-sort",
  kind: "sort",
  family: radixDistributionFamily,
  meta: { label: "Radix sort" },
  parse: parseRadixSortConfig,
  run(input, ops) {
    let working = input.array.slice()
    ops.intro(
      `${input.places.length} stable base-${input.radix} passes will order every digit from least to most significant.`,
    )
    input.places.forEach((place, passIndex) => {
      const passLabel = digitName(place, input.radix)
      const buckets = Array.from({ length: input.radix }, () => [] as number[])
      ops.beginPass(
        passIndex,
        input.places.length,
        passLabel,
        `Pass ${passIndex + 1}/${input.places.length}: distribute by the ${passLabel} digit.`,
      )
      working.forEach((value, sourceIndex) => {
        const digit = Math.floor(value / place) % input.radix
        buckets[digit].push(value)
        ops.scatter(
          sourceIndex,
          digit,
          `${value}'s ${passLabel} digit is ${digit}; append it to bucket ${digit}.`,
        )
      })
      ops.beginGather(
        `Read digit buckets from ${input.bucketLabels[0]} through ${input.bucketLabels.at(-1)} without changing order inside a bucket.`,
      )
      const next: number[] = []
      buckets.forEach((bucket, bucketIndex) => {
        bucket.forEach((value, itemIndex) => {
          next.push(value)
          ops.gather(
            bucketIndex,
            itemIndex,
            `Take ${value} from bucket ${bucketIndex}; write it at output index ${next.length - 1}.`,
          )
        })
      })
      ops.finishPass(
        `${passLabel[0].toUpperCase()}${passLabel.slice(1)} pass complete: lower processed digits remain stably ordered.`,
      )
      working = next
    })
    ops.done(`All ${input.places.length} digit positions are ordered: [${working.join(", ")}].`)
  },
} satisfies FamilyAlgorithmDefinition<
  "sort",
  RadixDistributionConfig,
  BucketDistributionRecorder,
  BucketDistributionFrame
>
