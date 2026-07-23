import {
  parseRangeBucketDistributionConfig,
  rangeBucketDistributionFamily,
  type BucketDistributionFrame,
  type BucketDistributionRecorder,
  type RangeBucketDistributionConfig,
} from "../families/bucket-distribution"
import type { FamilyAlgorithmDefinition } from "../types"

type Token = { value: number; origin: number }

function bucketIndex(value: number, min: number, max: number, count: number) {
  if (max === min) return 0
  const ratio = (value - min) / (max - min)
  const index = Math.floor(count * ratio)
  return Math.min(count - 1, Math.max(0, index))
}

function insertionSortBucket(
  bucket: Token[],
  bucketIndex: number,
  ops: BucketDistributionRecorder,
) {
  for (let i = 1; i < bucket.length; i++) {
    const key = bucket[i]
    let j = i - 1
    while (j >= 0) {
      ops.compareBucket(
        bucketIndex,
        j,
        j + 1,
        `Compare bucket[${bucketIndex}][${j}] and bucket[${j + 1}] in local sort.`,
      )
      if (bucket[j].value <= key.value) break
      ops.swapBucket(
        bucketIndex,
        j,
        j + 1,
        `Swap bucket[${bucketIndex}][${j}] and bucket[${j + 1}] in local sort.`,
      )
      bucket[j + 1] = bucket[j]
      bucket[j] = key
      j--
    }
  }
}

export const bucketSort = {
  id: "bucket-sort",
  kind: "sort",
  family: rangeBucketDistributionFamily,
  meta: { label: "Bucket sort" },
  parse: parseRangeBucketDistributionConfig,
  run(input: RangeBucketDistributionConfig, ops: BucketDistributionRecorder) {
    const min = Math.min(...input.array)
    const max = Math.max(...input.array)
    const count = input.bucketCount
    ops.intro(`Partition [${min}, ${max}] into ${count} equal-width buckets.`)

    const source: Token[] = input.array.map((value, origin) => ({ value, origin }))
    ops.beginPass(0, 1, "0", "Scatter keys into range buckets.")

    const buckets: Token[][] = Array.from({ length: count }, () => [])
    for (let index = 0; index < source.length; index++) {
      const token = source[index]
      const target = bucketIndex(token.value, min, max, count)
      buckets[target].push(token)
      ops.scatter(index, target, `Scatter source[${index}] = ${token.value} into bucket ${target}.`)
    }

    for (let bucketIdx = 0; bucketIdx < count; bucketIdx++) {
      const bucket = buckets[bucketIdx]
      if (bucket.length <= 1) continue
      ops.beginLocalSort(bucketIdx, `Sort bucket ${bucketIdx} locally.`)
      insertionSortBucket(bucket, bucketIdx, ops)
    }

    ops.beginGather("Concatenate buckets in order to form the output.")
    let next = 0
    const output: Array<Token | null> = Array.from({ length: source.length }, () => null)
    for (let bucketIdx = 0; bucketIdx < count; bucketIdx++) {
      const bucket = buckets[bucketIdx]
      for (let itemIndex = 0; itemIndex < bucket.length; itemIndex++) {
        output[next] = bucket[itemIndex]
        ops.gather(bucketIdx, itemIndex, `Append bucket ${bucketIdx} item ${itemIndex} to output[${next}].`)
        next++
      }
    }

    ops.finishPass("Single scatter-sort-gather pass complete.")
    ops.done(`Sorted by range bucketing: ${output
      .filter((token) => token != null)
      .map((token) => token!.value)
      .join(", ")}.`)
  },
} satisfies FamilyAlgorithmDefinition<
  "sort",
  RangeBucketDistributionConfig,
  BucketDistributionRecorder,
  BucketDistributionFrame
>
