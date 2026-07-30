import {
  BucketDistributionRecorder,
  rangeBucketDistributionFamily,
  type BucketDistributionFrame,
  type RangeBucketDistributionConfig,
} from "../families/bucket-distribution"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

function invalidConfig(message: string): never {
  throw new Error(`steptrace: bucket-sort ${message}`)
}

export function parseBucketSortConfig(config: StepTraceConfig): RangeBucketDistributionConfig {
  const { array } = config
  const bucketCount = config.bucketCount ?? 5
  if (!Array.isArray(array) || array.length < 2)
    invalidConfig('requires an "array" with at least two finite numbers in [0, 1).')
  if (
    !array.every(
      (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1,
    )
  )
    invalidConfig('requires every "array" value to be a finite number in [0, 1).')
  if (array.length > 12)
    invalidConfig("limits the demonstration to 12 keys so local bucket order remains legible.")
  if (!Number.isInteger(bucketCount) || bucketCount < 2 || bucketCount > 8)
    invalidConfig('requires "bucketCount" to be an integer from 2 through 8.')

  return {
    profile: "bucket",
    array: array.slice(),
    bucketCount,
    bucketLabels: Array.from({ length: bucketCount }, (_, index) => {
      const start = index / bucketCount
      const end = (index + 1) / bucketCount
      return `${start.toFixed(1)}–${end.toFixed(1)}`
    }),
  }
}

export const bucketSort = {
  id: "bucket-sort",
  kind: "sort",
  family: rangeBucketDistributionFamily,
  meta: { label: "Bucket sort" },
  parse: parseBucketSortConfig,
  run(input, ops) {
    const buckets = Array.from({ length: input.bucketCount }, () => [] as number[])
    ops.intro(
      `${input.bucketCount} equal-width ranges split [0, 1); scatter by value, sort locally, then gather left to right.`,
    )
    ops.beginPass(
      0,
      1,
      "range pass",
      `Each value maps directly to one of ${input.bucketCount} numeric ranges.`,
    )
    input.array.forEach((value, sourceIndex) => {
      const bucketIndex = Math.min(input.bucketCount - 1, Math.floor(value * input.bucketCount))
      buckets[bucketIndex].push(value)
      ops.scatter(
        sourceIndex,
        bucketIndex,
        `${value.toFixed(2)} lies in ${input.bucketLabels[bucketIndex]}; append it to that bucket.`,
      )
    })

    buckets.forEach((bucket, bucketIndex) => {
      if (bucket.length < 2) return
      ops.beginLocalSort(
        bucketIndex,
        `Sort ${input.bucketLabels[bucketIndex]} internally; other ranges do not need comparison.`,
      )
      for (let right = 1; right < bucket.length; right++) {
        for (let cursor = right; cursor > 0; cursor--) {
          const leftValue = bucket[cursor - 1]
          const rightValue = bucket[cursor]
          ops.compareBucket(
            bucketIndex,
            cursor - 1,
            cursor,
            `Compare ${leftValue.toFixed(2)} and ${rightValue.toFixed(2)} inside ${input.bucketLabels[bucketIndex]}.`,
          )
          if (leftValue <= rightValue) break
          const value = bucket[cursor - 1]
          bucket[cursor - 1] = bucket[cursor]
          bucket[cursor] = value
          ops.swapBucket(
            bucketIndex,
            cursor - 1,
            cursor,
            `${rightValue.toFixed(2)} moves before ${leftValue.toFixed(2)} inside its bucket.`,
          )
        }
      }
    })

    ops.beginGather(
      `Every earlier bucket covers smaller values, so concatenate ranges without cross-bucket comparisons.`,
    )
    const sorted: number[] = []
    buckets.forEach((bucket, bucketIndex) => {
      bucket.forEach((value, itemIndex) => {
        sorted.push(value)
        ops.gather(
          bucketIndex,
          itemIndex,
          `Write ${value.toFixed(2)} from ${input.bucketLabels[bucketIndex]} at output index ${sorted.length - 1}.`,
        )
      })
    })
    ops.finishPass("All locally sorted ranges are concatenated in increasing range order.")
    ops.done(`Bucket Sort produced [${sorted.map((value) => value.toFixed(2)).join(", ")}].`)
  },
} satisfies FamilyAlgorithmDefinition<
  "sort",
  RangeBucketDistributionConfig,
  BucketDistributionRecorder,
  BucketDistributionFrame
>
