import type { NumericTransform } from "./types"

export const transformNumber = (value: number, transform?: NumericTransform): number => {
  if (!transform) return value
  let result = value * (transform.scale ?? 1) + (transform.offset ?? 0)
  if (transform.min !== undefined) result = Math.max(transform.min, result)
  if (transform.max !== undefined) result = Math.min(transform.max, result)
  return transform.round ? Math.round(result) : result
}
