import type { Direction } from "./types"

const SVG_NS = "http://www.w3.org/2000/svg"
const OWNED_ATTRIBUTE = "data-mermaid-flow-owned"

export interface NativeSnapshot {
  viewBox: string | null
  nodes: Array<{ id: string; transform: string | null; text: string }>
  edges: Array<{
    id: string | null
    d: string
    transform: string | null
    style: string | null
    markerEnd: string | null
  }>
}

export interface MotionOptions {
  direction: Direction
  durationMs: number
  delayMs?: number
  particlesPerCycle?: number
  radius?: number
  visible?: boolean
  probe?: boolean
}

export interface MotionHandle {
  readonly root: SVGGElement
  readonly guide: SVGPathElement
  readonly particles: SVGGElement[]
  setParticles(options: MotionOptions): void
  destroy(): void
}

const createSvg = <K extends keyof SVGElementTagNameMap>(
  document: Document,
  name: K,
): SVGElementTagNameMap[K] => document.createElementNS(SVG_NS, name)

const screenPoint = (element: SVGGraphicsElement, x = 0, y = 0): DOMPoint => {
  const matrix = element.getScreenCTM()
  const determinant = matrix ? matrix.a * matrix.d - matrix.b * matrix.c : 0
  if (!matrix || !Number.isFinite(determinant) || Math.abs(determinant) < Number.EPSILON)
    throw new Error("mermaid-flow: target has no usable screen CTM")
  return new DOMPoint(x, y).matrixTransform(matrix)
}

export class MermaidSvgAdapter {
  readonly edges: SVGPathElement[]
  private readonly owned = new Set<Element>()
  private readonly metricSnapshots = new Map<HTMLElement, string>()
  private readonly loads = new Map<
    string,
    { root: SVGGElement; fill: SVGRectElement; label: SVGTextElement; width: number }
  >()
  private readonly token: string

  constructor(readonly svg: SVGSVGElement) {
    const crypto = svg.ownerDocument.defaultView?.crypto
    if (!crypto) throw new Error("mermaid-flow: secure mount identity unavailable")
    this.token = Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) =>
      value.toString(36).padStart(7, "0"),
    ).join("-")
    this.edges = Array.from(svg.querySelectorAll<SVGPathElement>("g.edgePaths path.flowchart-link"))
    if (!this.edges.length) throw new Error("mermaid-flow: no native flowchart edges")
    this.edges.forEach((edge, ordinal) => {
      if (!edge.getAttribute("d")?.trim())
        throw new Error(`mermaid-flow: edge ${ordinal} has no path data`)
    })
  }

  resolveNode(authoredId: string): SVGGElement {
    const segment = `flowchart-${authoredId}-`
    const matches = Array.from(this.svg.querySelectorAll<SVGGElement>("g.nodes > g.node")).filter(
      (node) => {
        const ordinal = node.id.lastIndexOf(segment)
        return ordinal >= 0 && /^\d+$/u.test(node.id.slice(ordinal + segment.length))
      },
    )
    if (matches.length !== 1)
      throw new Error(`mermaid-flow: node ${authoredId} resolved to ${matches.length} targets`)
    return matches[0]
  }

  resolveEdge(ordinal: number): SVGPathElement {
    if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= this.edges.length)
      throw new Error(`mermaid-flow: edge ${ordinal} is out of range`)
    return this.edges[ordinal]
  }

  snapshotNative(): NativeSnapshot {
    return {
      viewBox: this.svg.getAttribute("viewBox"),
      nodes: Array.from(this.svg.querySelectorAll<SVGGElement>("g.nodes > g.node")).map((node) => ({
        id: node.id,
        transform: node.getAttribute("transform"),
        text: node.textContent?.trim() ?? "",
      })),
      edges: this.edges.map((edge) => ({
        id: edge.getAttribute("id"),
        d: edge.getAttribute("d")!,
        transform: edge.getAttribute("transform"),
        style: edge.getAttribute("style"),
        markerEnd: edge.getAttribute("marker-end"),
      })),
    }
  }

  resolveNodePaintTarget(authoredId: string): Element {
    const paint = this.resolveNode(authoredId).querySelector(
      ":scope > rect, :scope > polygon, :scope > path",
    )
    if (!paint) throw new Error(`mermaid-flow: node ${authoredId} has no paint target`)
    return paint
  }

  resolveEdgePaintTarget(ordinal: number): SVGPathElement {
    return this.resolveEdge(ordinal)
  }

  setNodeMetric(authoredId: string, metric?: string): void {
    const node = this.resolveNode(authoredId)
    const target = node.querySelector<HTMLElement>(
      ":scope > g.label foreignObject .nodeLabel > p > span:last-child",
    )
    if (!target)
      throw new Error(
        `mermaid-flow: node ${authoredId} needs a final <span> metric line in its Mermaid label`,
      )
    if (!this.metricSnapshots.has(target))
      this.metricSnapshots.set(target, target.textContent ?? "")
    target.dataset.mermaidFlowMetric = ""
    target.textContent = metric ?? this.metricSnapshots.get(target)!
  }

  setNodeLoad(authoredId: string, load?: number, loadLabel?: string): void {
    const previous = this.loads.get(authoredId)
    if (load === undefined) {
      previous?.root.remove()
      if (previous) {
        this.owned.delete(previous.root)
        this.loads.delete(authoredId)
      }
      return
    }
    if (!Number.isFinite(load) || load < 0)
      throw new Error(`mermaid-flow: node ${authoredId} has invalid load ${String(load)}`)

    let handle = previous
    if (!handle) {
      const node = this.resolveNode(authoredId)
      const paint = this.resolveNodePaintTarget(authoredId) as SVGGraphicsElement
      if (typeof paint.getBBox !== "function")
        throw new Error(`mermaid-flow: node ${authoredId} has no measurable paint target`)
      const bounds = paint.getBBox()
      const labelWidth = 44
      const x = bounds.x + 8
      const y = bounds.y + bounds.height - 7
      const width = Math.max(0, bounds.width - 16 - labelWidth)
      const root = createSvg(this.svg.ownerDocument, "g")
      root.setAttribute(OWNED_ATTRIBUTE, "load")
      root.setAttribute("role", "progressbar")
      root.setAttribute("aria-valuemin", "0")
      root.setAttribute("aria-valuemax", "100")
      root.setAttribute("pointer-events", "none")
      const label = createSvg(this.svg.ownerDocument, "text")
      label.classList.add("mermaid-flow-node-load-label")
      label.setAttribute("x", String(x))
      label.setAttribute("y", String(y))
      const track = createSvg(this.svg.ownerDocument, "rect")
      track.classList.add("mermaid-flow-node-load-track")
      track.setAttribute("x", String(x + labelWidth))
      track.setAttribute("y", String(bounds.y + bounds.height - 9))
      track.setAttribute("width", String(width))
      track.setAttribute("height", "4")
      track.setAttribute("rx", "2")
      const fill = createSvg(this.svg.ownerDocument, "rect")
      fill.classList.add("mermaid-flow-node-load-fill")
      fill.setAttribute("x", String(x + labelWidth))
      fill.setAttribute("y", String(bounds.y + bounds.height - 9))
      fill.setAttribute("height", "4")
      fill.setAttribute("rx", "2")
      root.append(label, track, fill)
      node.append(root)
      this.owned.add(root)
      handle = { root, fill, label, width }
      this.loads.set(authoredId, handle)
    }

    const percentage = Math.round(load * 100)
    handle.label.textContent = loadLabel ?? ""
    handle.fill.setAttribute("width", String(handle.width * Math.min(load, 1)))
    handle.root.setAttribute("aria-valuenow", String(Math.min(percentage, 100)))
    handle.root.setAttribute(
      "aria-valuetext",
      loadLabel ? `${loadLabel}, ${percentage}% load` : `${percentage}% load`,
    )
    handle.root.toggleAttribute("data-mermaid-flow-overloaded", load > 1)
  }

  createMotion(ordinal: number, initial: MotionOptions): MotionHandle {
    const nativePath = this.resolveEdge(ordinal)
    const owner = nativePath.closest<SVGGElement>("g.edgePaths")
    if (!owner) throw new Error(`mermaid-flow: edge ${ordinal} has no coordinate owner`)
    const document = this.svg.ownerDocument
    const root = createSvg(document, "g")
    root.setAttribute(OWNED_ATTRIBUTE, "motion")
    root.setAttribute("aria-hidden", "true")
    root.setAttribute("pointer-events", "none")
    const guide = createSvg(document, "path")
    guide.id = `mermaid-flow-guide-${this.token}-${ordinal}`
    guide.setAttribute("d", nativePath.getAttribute("d")!)
    guide.setAttribute("fill", "none")
    guide.setAttribute("stroke", "none")
    root.append(guide)

    const particles: SVGGElement[] = []
    const setParticles = (options: MotionOptions) => {
      particles.splice(0).forEach((particle) => particle.remove())
      const count = options.probe
        ? 1
        : options.visible === false
          ? 0
          : (options.particlesPerCycle ?? 1)
      for (let index = 0; index < count; index++) {
        const particle = createSvg(document, "g")
        particle.setAttribute(OWNED_ATTRIBUTE, "particle")
        const circle = createSvg(document, "circle")
        circle.setAttribute("r", String(options.radius ?? 3))
        circle.setAttribute("fill", "currentColor")
        const motion = createSvg(document, "animateMotion")
        motion.setAttribute("dur", `${options.durationMs}ms`)
        motion.setAttribute(
          "begin",
          options.probe
            ? "0s"
            : `${(options.delayMs ?? 0) + index * (options.durationMs / count)}ms`,
        )
        motion.setAttribute("calcMode", options.direction === "reverse" ? "linear" : "paced")
        motion.setAttribute("repeatCount", options.probe ? "1" : "indefinite")
        if (options.probe) motion.setAttribute("fill", "freeze")
        if (options.direction === "reverse") {
          motion.setAttribute("keyPoints", "1;0")
          motion.setAttribute("keyTimes", "0;1")
        }
        const mpath = createSvg(document, "mpath")
        mpath.setAttribute("href", `#${guide.id}`)
        motion.append(mpath)
        particle.append(circle, motion)
        root.append(particle)
        particles.push(particle)
      }
    }
    const destroy = () => {
      root.remove()
      this.owned.delete(root)
    }
    owner.append(root)
    try {
      const nativeMatrix = nativePath.getScreenCTM()
      const rootMatrix = root.getScreenCTM()
      const nativeDeterminant = nativeMatrix
        ? nativeMatrix.a * nativeMatrix.d - nativeMatrix.b * nativeMatrix.c
        : 0
      const rootDeterminant = rootMatrix
        ? rootMatrix.a * rootMatrix.d - rootMatrix.b * rootMatrix.c
        : 0
      if (
        !nativeMatrix ||
        !rootMatrix ||
        !Number.isFinite(nativeDeterminant) ||
        !Number.isFinite(rootDeterminant) ||
        Math.abs(nativeDeterminant) < Number.EPSILON ||
        Math.abs(rootDeterminant) < Number.EPSILON
      )
        throw new Error(`mermaid-flow: edge ${ordinal} has no usable coordinate transform`)
      const same = ["a", "b", "c", "d", "e", "f"].every(
        (key) =>
          Math.abs(
            (nativeMatrix[key as keyof DOMMatrix] as number) -
              (rootMatrix[key as keyof DOMMatrix] as number),
          ) < 1e-9,
      )
      if (!same) {
        const relative = rootMatrix.inverse().multiply(nativeMatrix)
        root.setAttribute(
          "transform",
          `matrix(${relative.a} ${relative.b} ${relative.c} ${relative.d} ${relative.e} ${relative.f})`,
        )
      }
      this.owned.add(root)
      setParticles(initial)
    } catch (error) {
      root.remove()
      throw error
    }
    return { root, guide, particles, setParticles, destroy }
  }

  sampleProbe(ordinal: number, direction: Direction, fractions: readonly number[]): number[] {
    const nativePath = this.resolveEdge(ordinal)
    const handle = this.createMotion(ordinal, { direction, durationMs: 1000, probe: true })
    const total = nativePath.getTotalLength()
    return fractions.map((fraction) => {
      this.svg.setCurrentTime(fraction)
      const native = nativePath.getPointAtLength(
        total * (direction === "forward" ? fraction : 1 - fraction),
      )
      const expected = screenPoint(nativePath, native.x, native.y)
      const actual = screenPoint(handle.particles[0])
      return Math.hypot(expected.x - actual.x, expected.y - actual.y)
    })
  }

  destroy(): void {
    this.owned.forEach((element) => element.remove())
    this.owned.clear()
    this.loads.clear()
    this.metricSnapshots.forEach((text, element) => {
      element.textContent = text
      delete element.dataset.mermaidFlowMetric
    })
    this.metricSnapshots.clear()
  }
}

export const productionBeginTimes = (
  delayMs: number,
  travelMs: number,
  particlesPerCycle: number,
): number[] =>
  Array.from(
    { length: particlesPerCycle },
    (_, index) => delayMs + index * (travelMs / particlesPerCycle),
  )
