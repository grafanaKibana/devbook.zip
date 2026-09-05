import type { SimulationSnapshot } from "../domain/types"
import { MermaidAdapter, type MotionHandle } from "./adapter"

const SVG_NS = "http://www.w3.org/2000/svg"
const OWNED = "data-flowmaid-owned"

interface NodeDecoration {
  readonly root: SVGGElement
  readonly metric: Element
  readonly load?: {
    readonly label: SVGTextElement
    readonly fill: SVGRectElement
    readonly width: number
  }
}

export interface DecorationHandle {
  update(
    snapshot: SimulationSnapshot,
    paused: boolean,
    reducedMotion: boolean,
    motion?: "emit" | "hold" | "clear",
  ): void
  destroy(): void
}

export const createDecorations = (adapter: MermaidAdapter): DecorationHandle => {
  const nodes = new Map<string, NodeDecoration>()
  const motions = new Map<string, MotionHandle>()
  const motionSignatures = new Map<string, string>()
  const states = new Map<Element, { state: string | null; owner: string | null }>()
  const metricSnapshots = new Map<HTMLElement, { text: string; marker: string | null }>()

  const decorateNode = (id: string, withLoad: boolean): NodeDecoration => {
    const existing = nodes.get(id)
    if (existing) return existing
    const node = adapter.resolveNode(id)
    const bounds = adapter.resolveNodePaint(id).getBBox()
    const root = adapter.svg.ownerDocument.createElementNS(SVG_NS, "g")
    const existingMetric = node.querySelector<HTMLElement>(
      ":scope > g.label foreignObject .nodeLabel > p > span:last-child",
    )
    const metric = existingMetric ?? adapter.svg.ownerDocument.createElementNS(SVG_NS, "text")
    root.setAttribute(OWNED, "node")
    root.setAttribute("pointer-events", "none")
    if (existingMetric) {
      if (!metricSnapshots.has(existingMetric))
        metricSnapshots.set(existingMetric, {
          text: existingMetric.textContent ?? "",
          marker: existingMetric.getAttribute("data-flowmaid-metric"),
        })
      existingMetric.setAttribute("data-flowmaid-metric", "")
    } else {
      metric.setAttribute("class", "flowmaid-node-metric")
      metric.setAttribute("x", String(bounds.x + 8))
      metric.setAttribute("y", String(bounds.y + bounds.height - (withLoad ? 16 : 7)))
      root.append(metric)
    }
    let load: NodeDecoration["load"]
    if (withLoad) {
      const label = adapter.svg.ownerDocument.createElementNS(SVG_NS, "text")
      const track = adapter.svg.ownerDocument.createElementNS(SVG_NS, "rect")
      const fill = adapter.svg.ownerDocument.createElementNS(SVG_NS, "rect")
      const x = bounds.x + 8
      const y = bounds.y + bounds.height - 7
      const labelWidth = 44
      const width = Math.max(0, bounds.width - 16 - labelWidth)
      label.setAttribute("class", "flowmaid-node-load-label")
      label.setAttribute("x", String(x))
      label.setAttribute("y", String(y))
      track.setAttribute("class", "flowmaid-node-load-track")
      track.setAttribute("x", String(x + labelWidth))
      track.setAttribute("y", String(bounds.y + bounds.height - 9))
      track.setAttribute("width", String(width))
      track.setAttribute("height", "4")
      track.setAttribute("rx", "2")
      fill.setAttribute("class", "flowmaid-node-load-fill")
      fill.setAttribute("x", String(x + labelWidth))
      fill.setAttribute("y", String(bounds.y + bounds.height - 9))
      fill.setAttribute("height", "4")
      fill.setAttribute("rx", "2")
      root.setAttribute("role", "progressbar")
      root.setAttribute("aria-label", `${node.textContent?.trim() || id} load`)
      root.setAttribute("aria-valuemin", "0")
      root.setAttribute("aria-valuemax", "100")
      root.append(label, track, fill)
      load = { label, fill, width }
    }
    node.append(root)
    const result = { root, metric, ...(load && { load }) }
    nodes.set(id, result)
    return result
  }

  const paint = (element: Element, state: string) => {
    if (!states.has(element))
      states.set(element, {
        state: element.getAttribute("data-flowmaid-state"),
        owner: element.getAttribute("data-flowmaid-state-owner"),
      })
    if (state === "normal") {
      element.removeAttribute("data-flowmaid-state")
      element.removeAttribute("data-flowmaid-state-owner")
    } else {
      element.setAttribute("data-flowmaid-state", state)
      element.setAttribute("data-flowmaid-state-owner", "")
    }
  }

  return {
    update(snapshot, paused, reducedMotion, motionMode = "emit") {
      for (const [id, value] of Object.entries(snapshot.nodes)) {
        paint(adapter.resolveNodePaint(id), value.state)
        if (!value.metric && value.capacity === undefined) continue
        const decoration = decorateNode(id, value.capacity !== undefined)
        decoration.metric.textContent = value.metric
        if (decoration.load && value.load !== undefined) {
          const percentage = Math.max(0, value.load * 100)
          decoration.load.label.textContent = value.loadLabel ?? ""
          decoration.load.fill.setAttribute(
            "width",
            String(decoration.load.width * Math.min(value.load, 1)),
          )
          decoration.root.setAttribute(
            "aria-valuenow",
            String(Math.min(100, Math.round(percentage))),
          )
          decoration.root.setAttribute(
            "aria-valuetext",
            `${value.loadLabel ?? ""}, ${Math.round(percentage)}% load`.trim(),
          )
          decoration.root.toggleAttribute("data-flowmaid-overloaded", value.load > 1)
        }
      }
      for (const [id, value] of Object.entries(snapshot.edges)) {
        paint(adapter.resolveEdge(id), value.state)
        const options = {
          count: paused || reducedMotion || motionMode !== "emit" ? 0 : value.dots,
          rate: value.rate,
          radius: value.radius,
          durationMs: value.durationMs,
        }
        const signature = `${value.records}|${options.count}|${options.rate}|${options.radius}|${options.durationMs}`
        const motion = motions.get(id)
        if (!motion) {
          motions.set(id, adapter.createMotion(id, options))
          if (motionMode === "emit") motionSignatures.set(id, signature)
        } else if (paused || reducedMotion || motionMode === "clear") {
          motion.clear()
          motionSignatures.delete(id)
        } else if (motionMode === "emit" && motionSignatures.get(id) !== signature) {
          motion.set(options)
          motionSignatures.set(id, signature)
        }
      }
    },
    destroy() {
      motions.forEach((motion) => motion.destroy())
      nodes.forEach((node) => node.root.remove())
      metricSnapshots.forEach((snapshot, element) => {
        element.textContent = snapshot.text
        if (snapshot.marker === null) element.removeAttribute("data-flowmaid-metric")
        else element.setAttribute("data-flowmaid-metric", snapshot.marker)
      })
      states.forEach((snapshot, element) => {
        if (snapshot.state === null) element.removeAttribute("data-flowmaid-state")
        else element.setAttribute("data-flowmaid-state", snapshot.state)
        if (snapshot.owner === null) element.removeAttribute("data-flowmaid-state-owner")
        else element.setAttribute("data-flowmaid-state-owner", snapshot.owner)
      })
      motions.clear()
      motionSignatures.clear()
      nodes.clear()
      metricSnapshots.clear()
      states.clear()
    },
  }
}
