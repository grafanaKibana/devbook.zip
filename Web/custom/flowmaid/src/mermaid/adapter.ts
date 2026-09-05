import type { DirectedGraph, GraphEdge } from "../domain/types"

const SVG_NS = "http://www.w3.org/2000/svg"
const OWNED = "data-flowmaid-owned"

export interface NativeSnapshot {
  readonly viewBox: string | null
  readonly nodes: readonly { id: string; transform: string | null; text: string }[]
  readonly edges: readonly {
    id: string
    d: string
    transform: string | null
    style: string | null
    className: string | null
    markerStart: string | null
    markerEnd: string | null
  }[]
}

export interface MotionOptions {
  readonly count: number
  readonly rate: number
  readonly radius: number
  readonly durationMs: number
}

export interface MotionHandle {
  readonly root: SVGGElement
  set(options: MotionOptions): void
  clear(): void
  destroy(): void
}

const createSvg = <K extends keyof SVGElementTagNameMap>(document: Document, name: K) =>
  document.createElementNS(SVG_NS, name)

const authoredNodeId = (node: SVGGElement): string | null => {
  const match = node.id.match(/flowchart-(.+)-\d+$/u)
  return match?.[1] ?? null
}

const usableMatrix = (element: SVGGraphicsElement): DOMMatrix => {
  const matrix = element.getScreenCTM()
  const determinant = matrix ? matrix.a * matrix.d - matrix.b * matrix.c : 0
  if (!matrix || !Number.isFinite(determinant) || Math.abs(determinant) < Number.EPSILON)
    throw new Error("Flowmaid target has no usable screen CTM")
  return matrix
}

export class MermaidAdapter {
  readonly graph: DirectedGraph
  private readonly nodes = new Map<string, SVGGElement>()
  private readonly paths = new Map<string, SVGPathElement>()
  private readonly owned = new Set<Element>()
  private readonly motions = new Set<MotionHandle>()
  private readonly token: string
  private liveParticles = 0

  constructor(readonly svg: SVGSVGElement) {
    const crypto = svg.ownerDocument.defaultView?.crypto
    if (!crypto) throw new Error("Flowmaid secure mount identity is unavailable")
    this.token = [...crypto.getRandomValues(new Uint32Array(3))]
      .map((value) => value.toString(36))
      .join("-")
    for (const node of Array.from(svg.querySelectorAll<SVGGElement>("g.nodes > g.node"))) {
      const id = authoredNodeId(node)
      if (!id) continue
      if (this.nodes.has(id)) throw new Error(`Flowmaid node ${id} is ambiguous`)
      this.nodes.set(id, node)
    }
    if (!this.nodes.size) throw new Error("Flowmaid found no Mermaid flowchart nodes")

    const paths = Array.from(
      svg.querySelectorAll<SVGPathElement>("g.edgePaths path.flowchart-link"),
    )
    if (paths.length > 64) throw new Error("Flowmaid graph must contain at most 64 edges")
    const edges: GraphEdge[] = []
    for (const path of paths) {
      const id = path.id
      if (!id || !path.getAttribute("d")?.trim())
        throw new Error("Flowmaid found an unusable Mermaid edge")
      const matches: Array<{ from: string; to: string }> = []
      for (const from of this.nodes.keys())
        for (const to of this.nodes.keys())
          if (new RegExp(`^L_${escapeRegExp(from)}_${escapeRegExp(to)}_\\d+$`, "u").test(id))
            matches.push({ from, to })
      if (matches.length !== 1)
        throw new Error(`Flowmaid edge ${id} has ambiguous endpoint metadata`)
      const edge = { id, ...matches[0]! }
      edges.push(edge)
      this.paths.set(id, path)
    }
    if (!edges.length) throw new Error("Flowmaid found no Mermaid flowchart edges")
    this.graph = { nodes: [...this.nodes.keys()], edges }
  }

  resolveNode(id: string): SVGGElement {
    const node = this.nodes.get(id)
    if (!node) throw new Error(`Flowmaid node ${id} did not resolve`)
    return node
  }

  resolveNodePaint(id: string): SVGGraphicsElement {
    const target = this.resolveNode(id).querySelector<SVGGraphicsElement>(
      ":scope > rect, :scope > polygon, :scope > path",
    )
    if (!target) throw new Error(`Flowmaid node ${id} has no paint target`)
    return target
  }

  resolveEdge(id: string): SVGPathElement {
    const path = this.paths.get(id)
    if (!path) throw new Error(`Flowmaid edge ${id} did not resolve`)
    return path
  }

  snapshotNative(): NativeSnapshot {
    return {
      viewBox: this.svg.getAttribute("viewBox"),
      nodes: [...this.nodes].map(([id, node]) => ({
        id,
        transform: node.getAttribute("transform"),
        text: node.textContent?.trim() ?? "",
      })),
      edges: [...this.paths].map(([id, path]) => ({
        id,
        d: path.getAttribute("d")!,
        transform: path.getAttribute("transform"),
        style: path.getAttribute("style"),
        className: path.getAttribute("class"),
        markerStart: path.getAttribute("marker-start"),
        markerEnd: path.getAttribute("marker-end"),
      })),
    }
  }

  createMotion(edgeId: string, options: MotionOptions): MotionHandle {
    const nativePath = this.resolveEdge(edgeId)
    const owner = nativePath.closest<SVGGElement>("g.edgePaths")
    if (!owner) throw new Error(`Flowmaid edge ${edgeId} has no coordinate owner`)
    const root = createSvg(this.svg.ownerDocument, "g")
    const guide = createSvg(this.svg.ownerDocument, "path")
    const guideId = `flowmaid-guide-${this.token}-${this.paths.get(edgeId)!.id.replace(/[^a-z0-9-]/giu, "-")}`
    root.setAttribute(OWNED, "motion")
    root.setAttribute("aria-hidden", "true")
    root.setAttribute("pointer-events", "none")
    guide.id = guideId
    guide.setAttribute("d", nativePath.getAttribute("d")!)
    guide.setAttribute("fill", "none")
    guide.setAttribute("stroke", "none")
    root.append(guide)
    owner.append(root)
    try {
      const nativeMatrix = usableMatrix(nativePath)
      const rootMatrix = usableMatrix(root)
      const same = (["a", "b", "c", "d", "e", "f"] as const).every(
        (key) => Math.abs(nativeMatrix[key] - rootMatrix[key]) < 1e-9,
      )
      if (!same) {
        const relative = rootMatrix.inverse().multiply(nativeMatrix)
        root.setAttribute(
          "transform",
          `matrix(${relative.a} ${relative.b} ${relative.c} ${relative.d} ${relative.e} ${relative.f})`,
        )
      }
    } catch (error) {
      root.remove()
      throw error
    }
    this.owned.add(root)

    const view = this.svg.ownerDocument.defaultView!
    const pathLength = nativePath.getTotalLength()
    if (!Number.isFinite(pathLength) || pathLength <= 0) {
      root.remove()
      this.owned.delete(root)
      throw new Error(`Flowmaid edge ${edgeId} has no measurable length`)
    }
    const timers = new Map<SVGGElement, { start?: number; expiry: number }>()
    let nextStartAt = 0
    const remove = (particle: SVGGElement) => {
      const scheduled = timers.get(particle)
      if (!scheduled) return
      if (scheduled.start !== undefined) view.clearTimeout(scheduled.start)
      view.clearTimeout(scheduled.expiry)
      timers.delete(particle)
      this.liveParticles -= 1
      particle.remove()
    }
    const clear = () => {
      ;[...timers.keys()].forEach(remove)
      nextStartAt = 0
    }
    const set = (next: MotionOptions) => {
      const cadenceMs = next.rate > 0 ? 1000 / next.rate : next.durationMs
      const pathCapacity = Math.max(1, Math.floor(pathLength / (next.radius * 2 + 1)))
      const durationMs = Math.min(next.durationMs, pathCapacity * cadenceMs)
      const now = view.performance.now()
      let startAt = Math.max(now, nextStartAt)
      for (let index = 0; index < next.count; index += 1) {
        if (timers.size >= 500 || this.liveParticles >= 1024) break
        const particle = createSvg(this.svg.ownerDocument, "g")
        const circle = createSvg(this.svg.ownerDocument, "circle")
        const motion = createSvg(this.svg.ownerDocument, "animateMotion")
        const motionPath = createSvg(this.svg.ownerDocument, "mpath")
        particle.setAttribute(OWNED, "particle")
        circle.setAttribute("r", String(next.radius))
        circle.setAttribute("fill", "currentColor")
        const delayMs = Math.max(0, startAt - now)
        startAt += cadenceMs
        motion.setAttribute("dur", `${durationMs}ms`)
        motion.setAttribute("begin", "indefinite")
        motion.setAttribute("repeatCount", "1")
        motion.setAttribute("calcMode", "paced")
        motion.addEventListener("endEvent", () => remove(particle), { once: true })
        motionPath.setAttribute("href", `#${guideId}`)
        motion.append(motionPath)
        particle.append(circle, motion)
        root.append(particle)
        this.liveParticles += 1
        const scheduled: { start?: number; expiry: number } = { expiry: 0 }
        timers.set(particle, scheduled)
        scheduled.expiry = view.setTimeout(() => remove(particle), delayMs + durationMs)
        if (delayMs > 0) {
          particle.setAttribute("visibility", "hidden")
          scheduled.start = view.setTimeout(() => {
            scheduled.start = undefined
            motion.beginElement()
            particle.removeAttribute("visibility")
          }, delayMs)
        } else motion.beginElement()
      }
      nextStartAt = startAt
    }
    set(options)
    const handle: MotionHandle = {
      root,
      set,
      clear,
      destroy: () => {
        clear()
        root.remove()
        this.owned.delete(root)
        this.motions.delete(handle)
      },
    }
    this.motions.add(handle)
    return handle
  }

  destroy(): void {
    ;[...this.motions].forEach((motion) => motion.destroy())
    this.owned.forEach((element) => element.remove())
    this.owned.clear()
  }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")

export const cloneNativeMermaid = (svg: SVGSVGElement): SVGSVGElement => {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll(`[${OWNED}]`).forEach((element) => element.remove())
  clone.querySelectorAll("[data-flowmaid-state-owner]").forEach((element) => {
    element.removeAttribute("data-flowmaid-state")
    element.removeAttribute("data-flowmaid-state-owner")
  })
  return clone
}
