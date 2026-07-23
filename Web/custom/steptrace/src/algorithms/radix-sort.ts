import {
  parseRadixDistributionConfig,
  radixDistributionFamily,
  type BucketDistributionFrame,
  type BucketDistributionRecorder,
  type RadixDistributionConfig,
} from "../families/bucket-distribution"
import type { FamilyAlgorithmDefinition } from "../types"

type Token = { value: number; origin: number }

function digitOf(value: number, place: number, radix: number) {
  return Math.floor(value / place) % radix
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

export const radixSort = {
  id: "radix-sort",
  kind: "sort",
  family: radixDistributionFamily,
  meta: { label: "Radix sort" },
  parse: parseRadixDistributionConfig,
  run(input: RadixDistributionConfig, ops: BucketDistributionRecorder) {
    const radix = input.radix
    const maxPasses = input.places.length
    ops.intro(`LSD radix sort with ${radix} buckets and ${maxPasses} pass(es).`)

    let source: Token[] = input.array.map((value, origin) => ({ value, origin }))
    for (let pass = 0; pass < maxPasses; pass++) {
      const place = Math.pow(radix, pass)
      const passLabel = `${place}`
      ops.beginPass(pass, maxPasses, passLabel, `Distribute by digit ${pass} (${passLabel} place).`)

      const buckets: Token[][] = Array.from({ length: input.bucketCount }, () => [])
      for (let index = 0; index < source.length; index++) {
        const token = source[index]
        const target = digitOf(token.value, place, radix)
        buckets[target].push(token)
        ops.scatter(index, target, `Scatter source[${index}] = ${token.value} into bucket ${target}.`)
      }

      for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex++) {
        const bucket = buckets[bucketIndex]
        if (bucket.length <= 1) continue
        ops.beginLocalSort(bucketIndex, `Sort bucket ${bucketIndex} locally.`)
        insertionSortBucket(bucket, bucketIndex, ops)
      }

      ops.beginGather("Read buckets left-to-right into output array.")
      const output: Array<Token | null> = Array.from({ length: source.length }, () => null)
      let next = 0
      for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex++) {
        const bucket = buckets[bucketIndex]
        for (let itemIndex = 0; itemIndex < bucket.length; itemIndex++) {
          const token = bucket[itemIndex]
          output[next] = token
          ops.gather(bucketIndex, itemIndex, `Read bucket ${bucketIndex} item ${itemIndex} into output[${next}].`)
          next++
        }
      }
      source = output.map((token) => token as Token)
      ops.finishPass(`Digit ${pass + 1} completed; all lower digits stay stable.`)
    }

    ops.done(
      `All ${maxPasses} digits processed. Final output: ${source.map((token) => token.value).join(", ")}.`,
    )
  },
} satisfies FamilyAlgorithmDefinition<
  "sort",
  RadixDistributionConfig,
  BucketDistributionRecorder,
  BucketDistributionFrame
>
