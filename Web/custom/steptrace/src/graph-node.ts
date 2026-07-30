export const GRAPH_NODE_SIZE_PX = 26
export const GRAPH_NODE_RADIUS_PX = GRAPH_NODE_SIZE_PX / 2
export const GRAPH_NODE_HALO_GAP_PX = 4.5
export const GRAPH_EDGE_ARROW_GAP_PX = 3

export interface GraphPoint {
  x: number
  y: number
}

export interface FixedSvgNode {
  element: SVGGElement
  point: GraphPoint
  coordinates?: "local" | "absolute"
}

function numericViewBox(svg: SVGSVGElement) {
  const box = svg.viewBox?.baseVal
  if (box?.width && box?.height) return { width: box.width, height: box.height }
  const source =
    typeof svg.getAttribute === "function"
      ? svg.getAttribute("viewBox")
      : (svg as unknown as { attributes?: Map<string, string> }).attributes?.get("viewBox")
  const values = source?.trim().split(/\s+/).map(Number)
  return values?.length === 4 && values.every(Number.isFinite)
    ? { width: values[2], height: values[3] }
    : null
}

export function svgRenderedScale(
  rect: Pick<DOMRect, "width" | "height">,
  viewBox: { width: number; height: number },
) {
  if (
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0 ||
    viewBox.width <= 0 ||
    viewBox.height <= 0
  )
    return 1
  return Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
}

export function trimGraphEdge(
  from: GraphPoint,
  to: GraphPoint,
  sourceInset: number,
  targetInset = sourceInset,
) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  return {
    x1: from.x + ux * sourceInset,
    y1: from.y + uy * sourceInset,
    x2: to.x - ux * targetInset,
    y2: to.y - uy * targetInset,
  }
}

export function observeFixedSvgNodes(
  svg: SVGSVGElement,
  nodes: readonly FixedSvgNode[],
  onGeometry?: (unitsPerCssPixel: number) => void,
) {
  const update = () => {
    const viewBox = numericViewBox(svg)
    const rect = svg.getBoundingClientRect?.()
    const scale = viewBox && rect ? svgRenderedScale(rect, viewBox) : 1
    const inverseScale = 1 / scale
    for (const { element, point, coordinates = "local" } of nodes) {
      const origin = `translate(${point.x} ${point.y}) scale(${inverseScale})`
      element.setAttribute(
        "transform",
        coordinates === "absolute" ? `${origin} translate(${-point.x} ${-point.y})` : origin,
      )
    }
    onGeometry?.(inverseScale)
  }

  update()
  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          update()
        })
  observer?.observe(svg)
  return {
    update,
    destroy() {
      observer?.disconnect()
    },
  }
}
