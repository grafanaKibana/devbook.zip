// Convert screen-space target sizes to graph units at the current fit or zoom.
export function graphNodeHitRadius(radius, scale) {
  return Math.max(20 / scale, radius + 8 / scale)
}
