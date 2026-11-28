import { resolveBasePath, simplifySlug } from "@quartz-community/utils"
import { graphNodeHitRadius } from "./graph-node-hit-radius.js"

let nextGraphId = 0

function neighborhood(content, current, depth) {
  const notes = new Map(Object.entries(content).map(([slug, note]) => [simplifySlug(slug), note]))
  const neighbors = new Map([...notes.keys()].map((id) => [id, new Set()]))
  const edges = []
  for (const [source, note] of notes) {
    for (const link of note.links ?? []) {
      const target = simplifySlug(link)
      if (!notes.has(target)) continue
      edges.push({ source, target })
      neighbors.get(source).add(target)
      neighbors.get(target).add(source)
    }
  }
  const seen = new Set([current])
  let frontier = [current]
  for (let hop = 0; hop < depth && frontier.length; hop++) {
    const next = []
    for (const id of frontier) {
      for (const neighbor of neighbors.get(id) ?? []) {
        if (seen.has(neighbor)) continue
        seen.add(neighbor)
        next.push(neighbor)
      }
    }
    frontier = next
  }
  const nodes = [...seen].map((id) => ({
    id,
    title: notes.get(id)?.title ?? document.title,
    folder: notes.get(id)?.tags?.includes("foldernote"),
    degree: 0,
  }))
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const links = edges.filter(({ source, target }) => seen.has(source) && seen.has(target))
  for (const edge of links) {
    edge.source = byId.get(edge.source)
    edge.target = byId.get(edge.target)
    edge.source.degree++
    if (edge.source !== edge.target) edge.target.degree++
    edge.direct = edge.source.id === current || edge.target.id === current
  }
  return { nodes, links }
}

function draw(container, content, cfg) {
  const d3 = window.d3
  const current = simplifySlug(document.body.dataset.slug)
  const { nodes, links } = neighborhood(content, current, cfg.depth)
  const center = nodes[0]
  // The note's folder note anchors the layout when it is in the neighborhood.
  const folderId = current.replace(/[^/]*$/, "") || "/"
  const anchor = nodes.find((n) => n.id === folderId) ?? center
  anchor.fx = anchor.fy = 0
  for (const n of nodes) n.r = 2 + Math.sqrt(n.degree)
  d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(-100 * cfg.repelForce))
    .force("link", d3.forceLink(links).distance(cfg.linkDistance))
    .force("collide", d3.forceCollide((n) => n.r).iterations(3))
    .stop()
    .tick(300)

  const extentX = d3.max(nodes, (n) => Math.abs(n.x) + n.r)
  const extentY = d3.max(nodes, (n) => Math.abs(n.y) + n.r)
  const colors = JSON.parse(document.querySelector(".ec-color-map")?.textContent || "{}")
  const svg = d3
    .select(container)
    .append("svg")
    .attr("aria-label", `Connections to ${center.title}`)
  const drawing = svg.append("g")
  const lines = drawing
    .append("g")
    .selectAll("line")
    .data(links.sort((a, b) => a.direct - b.direct))
    .join("line")
    .attr("class", (l) => (l.direct ? "direct" : null))
    .attr("x1", (l) => l.source.x)
    .attr("y1", (l) => l.source.y)
    .attr("x2", (l) => l.target.x)
    .attr("y2", (l) => l.target.y)
  const anchors = drawing
    .selectAll("a")
    .data(nodes)
    .join("a")
    .attr("href", (n) => resolveBasePath(n.id))
    .attr("aria-label", (n) => n.title)
    .attr("aria-current", (n) => (n === center ? "page" : null))
    .style("--node-color", (n) => colors[n.id.split("/")[0] + "/index"] ?? "var(--gray)")
  anchors
    .append("circle")
    .attr("class", (n) => (n.folder ? "dot folder" : "dot"))
    .attr("cx", (n) => n.x)
    .attr("cy", (n) => n.y)
    .attr("r", (n) => n.r)
  drawing
    .append("circle")
    .attr("class", "current")
    .attr("cx", center.x)
    .attr("cy", center.y)
    .attr("r", center.r + 2.5)

  // Clip enlarged click targets to the nearest node's cell where targets overlap.
  const triangulation = d3.Delaunay.from(
    nodes,
    (n) => n.x,
    (n) => n.y,
  )
  const clipPrefix = `local-graph-${nextGraphId++}-cell-`
  const clipPaths = svg
    .append("defs")
    .selectAll("clipPath")
    .data(nodes)
    .join("clipPath")
    .attr("id", (_, i) => clipPrefix + i)
    .attr("clipPathUnits", "userSpaceOnUse")
    .append("path")
  const hit = anchors
    .append("circle")
    .attr("class", "hit")
    .attr("clip-path", (_, i) => `url(#${clipPrefix}${i})`)
    .attr("cx", (n) => n.x)
    .attr("cy", (n) => n.y)
  const tip = d3.select(container).append("span").attr("class", "local-graph-label")
  let hovered, focused
  function highlight() {
    const selected = hovered ?? focused
    tip.text(selected?.title ?? "")
    lines.classed("muted", (l) => !!selected && l.source !== selected && l.target !== selected)
    lines.classed("highlight", (l) => l.source === selected || l.target === selected)
  }
  anchors
    .on("pointerenter", (_, n) => {
      hovered = n
      highlight()
    })
    .on("pointerleave", () => {
      hovered = null
      highlight()
    })
    .on("focus", (_, n) => {
      focused = n
      highlight()
    })
    .on("blur", () => {
      focused = null
      highlight()
    })
  svg.on("click", (event) => {
    if (event.target.closest("a")) return
    event.stopPropagation()
    const opener = container.parentElement.querySelector(".global-graph-icon")
    opener.setAttribute("data-pointer-focus", "")
    opener.click()
  })
  function fit() {
    const w = container.clientWidth,
      h = container.clientHeight
    if (!w || !h) return
    const scale = Math.max(0.01, Math.min(1, (w / 2 - 12) / extentX, (h / 2 - 12) / extentY))
    drawing.attr("transform", `translate(${w / 2},${h / 2}) scale(${scale})`)
    const halfWidth = w / (2 * scale)
    const halfHeight = h / (2 * scale)
    const cells = triangulation.voronoi([-halfWidth, -halfHeight, halfWidth, halfHeight])
    hit.attr("r", (n) => graphNodeHitRadius(n.r, scale))
    clipPaths.attr("d", (_, i) => cells.renderCell(i))
  }
  fit()
  const resize = new ResizeObserver(fit)
  resize.observe(container)
  window.addCleanup?.(() => resize.disconnect())
}

// The graph plugin loads D3 and PixiJS only when it draws its own graph. This
// panel replaces its local graph, and a cold PixiJS slows the first opening of
// the global graph, so both load here from the plugin's pinned builds.
const D3_BUILD = {
  global: "d3",
  src: "https://cdn.jsdelivr.net/npm/d3@7.9.2/dist/d3.min.js",
  integrity: "sha384-LxfWGZyh6PaLjBRPf7NWiEYs9Mn0UQ6ZmqbLLZhxlOBBNWF2a2K0Pfc5efkrNnhQ",
}
export const PIXI_BUILD = {
  global: "PIXI",
  src: "https://cdn.jsdelivr.net/npm/pixi.js@8.23.0/dist/pixi.min.js",
  integrity: "sha384-IGfYrdVH+mWT/lAfomOiw9gRIY0pOGCN3enQE3TBB6FWluTVVh4hlXDzNotZYUcv",
}
const loading = new Map()

// The plugin treats any tag with its URL as already loaded. A tag carries the
// exact URL only once it has loaded, and a failed tag is removed.
export function loadLibrary({ global, src, integrity }) {
  if (window[global]) return Promise.resolve()
  if (!loading.has(src)) {
    loading.set(
      src,
      new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`)
        const script = existing ?? document.createElement("script")
        script.addEventListener("load", () => {
          script.setAttribute("src", src)
          resolve()
        })
        script.addEventListener("error", () => {
          script.remove()
          loading.delete(src)
          reject()
        })
        if (existing) return
        script.src = src + "#pending"
        script.integrity = integrity
        script.crossOrigin = "anonymous"
        document.head.append(script)
      }),
    )
  }
  return loading.get(src)
}

// Claim the small panel before Quartz starts its Pixi renderer. The plugin
// continues to own the expanded graph and its keyboard shortcut.
function claim() {
  for (const el of document.querySelectorAll(".graph-container")) {
    el.classList.replace("graph-container", "local-note-graph")
  }
}

function setup() {
  claim()
  for (const el of document.querySelectorAll(".local-note-graph:not([data-initialized])")) {
    el.dataset.initialized = ""
    Promise.all([loadLibrary(D3_BUILD), fetchData])
      .then(([, content]) => {
        if (el.isConnected) draw(el, content, JSON.parse(el.dataset.cfg))
      })
      .catch(() => {
        el.textContent = "Graph could not load."
      })
  }
}
// Deferred plugin scripts may draw before DOMContentLoaded, but not before this.
document.addEventListener("readystatechange", () => {
  if (document.readyState === "interactive") claim()
})
document.addEventListener("nav", setup)
document.addEventListener("render", setup)
document.addEventListener("DOMContentLoaded", setup)
