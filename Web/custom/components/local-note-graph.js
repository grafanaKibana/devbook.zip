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

// The drawing outlives SPA navigation, so the next page's graph starts from
// this layout and moves into its own.
let kept

// Reduced motion collapses the duration token, which leaves the swap instant.
function travelTime(container) {
  const token = getComputedStyle(container).getPropertyValue("--dur-4").trim()
  const duration = parseFloat(token) * (token.endsWith("ms") ? 1 : 1000)
  return duration > 1 ? duration : 0
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

  const held = kept && (!kept.svg.isConnected || kept.svg.parentNode === container)
  const reuse = held ? kept : undefined
  if (reuse) {
    const origin = reuse.positions.get(anchor.id) ?? { x: 0, y: 0 }
    // Turn or mirror the settled layout about its anchor to the closest match
    // with the kept one, so shared notes travel the least.
    let turn = { score: 0, flip: 1, cos: 1, sin: 0 }
    for (const flip of [1, -1]) {
      let dot = 0
      let cross = 0
      for (const n of nodes) {
        const p = reuse.positions.get(n.id)
        if (!p) continue
        const px = p.x - origin.x
        const py = p.y - origin.y
        dot += flip * n.x * px + n.y * py
        cross += flip * n.x * py - n.y * px
      }
      const score = Math.hypot(dot, cross)
      if (score > turn.score) turn = { score, flip, cos: dot / score, sin: cross / score }
    }
    const adjacent = new Map(nodes.map((n) => [n, []]))
    for (const { source, target } of links) {
      adjacent.get(source).push(target)
      adjacent.get(target).push(source)
    }
    // Nodes arrive breadth-first, so a new node starts at a placed neighbor.
    for (const n of nodes) {
      const x = n.x * turn.flip
      n.x = x * turn.cos - n.y * turn.sin
      n.y = x * turn.sin + n.y * turn.cos
      n.from = reuse.positions.get(n.id) ?? adjacent.get(n).find((m) => m.from)?.from ?? origin
    }
  }

  const extentX = d3.max(nodes, (n) => Math.abs(n.x) + n.r)
  const extentY = d3.max(nodes, (n) => Math.abs(n.y) + n.r)
  const colors = JSON.parse(document.querySelector(".ec-color-map")?.textContent || "{}")
  const svg = reuse ? d3.select(reuse.svg) : d3.create("svg")
  if (!reuse) {
    const scene = svg.append("g")
    scene.append("g").attr("class", "links")
    scene.append("g").attr("class", "nodes")
    scene.append("circle").attr("class", "current")
    svg.append("defs")
  }
  container.append(svg.node())
  svg.attr("aria-label", `Connections to ${center.title}`)
  const duration = reuse && travelTime(container)
  const motion = duration && svg.transition().duration(duration)
  const move = (selection) => (motion ? selection.transition(motion) : selection)
  const start = (n) => n.from ?? n
  const drawing = svg.select("g")
  const lines = drawing
    .select(".links")
    .selectAll("line")
    .data(
      links.sort((a, b) => a.direct - b.direct),
      (l) => `${l.source.id}\n${l.target.id}`,
    )
    .join(
      (enter) =>
        enter
          .append("line")
          .style("opacity", 0)
          .attr("x1", (l) => start(l.source).x)
          .attr("y1", (l) => start(l.source).y)
          .attr("x2", (l) => start(l.target).x)
          .attr("y2", (l) => start(l.target).y),
      (update) => update,
      (exit) => move(exit).style("opacity", 0).remove(),
    )
    .attr("class", (l) => (l.direct ? "direct" : null))
  move(lines)
    .style("opacity", null)
    .attr("x1", (l) => l.source.x)
    .attr("y1", (l) => l.source.y)
    .attr("x2", (l) => l.target.x)
    .attr("y2", (l) => l.target.y)
  const anchors = drawing
    .select(".nodes")
    .selectAll("a")
    .data(nodes, (n) => n.id)
    .join(
      (enter) => {
        const entering = enter.append("a").style("opacity", 0)
        entering
          .append("circle")
          .attr("class", (n) => (n.folder ? "dot folder" : "dot"))
          .attr("cx", (n) => start(n).x)
          .attr("cy", (n) => start(n).y)
          .attr("r", 0)
        entering.append("circle").attr("class", "hit")
        return entering
      },
      (update) => update,
      (exit) =>
        move(
          exit
            .style("pointer-events", "none")
            .attr("aria-hidden", "true")
            .attr("aria-current", null)
            .attr("tabindex", -1),
        )
          .style("opacity", 0)
          .remove(),
    )
    .attr("aria-hidden", null)
    .attr("tabindex", null)
    .attr("href", (n) => resolveBasePath(n.id))
    .attr("aria-label", (n) => n.title)
    .attr("aria-current", (n) => (n === center ? "page" : null))
    .style("--node-color", (n) => colors[n.id.split("/")[0] + "/index"] ?? "var(--gray)")
    .style("pointer-events", null)
  move(anchors).style("opacity", null)
  move(anchors.select(".dot"))
    .attr("cx", (n) => n.x)
    .attr("cy", (n) => n.y)
    .attr("r", (n) => n.r)
  move(drawing.select(".current"))
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
    .select("defs")
    .selectAll("clipPath")
    .data(nodes)
    .join((enter) =>
      enter
        .append("clipPath")
        .attr("clipPathUnits", "userSpaceOnUse")
        .call((clip) => clip.append("path")),
    )
    .attr("id", (_, i) => clipPrefix + i)
    .select("path")
  const hit = anchors
    .select(".hit")
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
    // Quartz's router reads HTMLAnchorElement.href, which SVG links lack.
    .on("click", (event, n) => {
      const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      if (modified || !window.spaNavigate) return
      event.preventDefault()
      window.spaNavigate(new URL(resolveBasePath(n.id), location.href))
    })
  svg.on("click", (event) => {
    if (event.target.closest("a")) return
    event.stopPropagation()
    const opener = container.parentElement.querySelector(".global-graph-icon")
    opener.setAttribute("data-pointer-focus", "")
    opener.click()
  })
  let width, height
  function fit(travel) {
    const w = container.clientWidth,
      h = container.clientHeight
    if (!w || !h || (w === width && h === height)) return
    width = w
    height = h
    const scale = Math.max(0.01, Math.min(1, (w / 2 - 12) / extentX, (h / 2 - 12) / extentY))
    const frame = `translate(${w / 2},${h / 2}) scale(${scale})`
    if (travel) move(drawing).attr("transform", frame)
    else drawing.interrupt().attr("transform", frame)
    const halfWidth = w / (2 * scale)
    const halfHeight = h / (2 * scale)
    const cells = triangulation.voronoi([-halfWidth, -halfHeight, halfWidth, halfHeight])
    hit.attr("r", (n) => graphNodeHitRadius(n.r, scale))
    clipPaths.attr("d", (_, i) => cells.renderCell(i))
  }
  fit(true)
  const resize = new ResizeObserver(() => fit())
  resize.observe(container)
  window.addCleanup?.(() => resize.disconnect())
  kept = { svg: svg.node(), positions: new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }])) }
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
    // A transition's clock starts when it is created, and the first frames
    // after navigation are slow. The kept drawing stays up until they pass.
    const hold = kept && !kept.svg.isConnected && travelTime(el)
    if (hold) el.append(kept.svg)
    const frames =
      hold && new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    Promise.all([loadLibrary(D3_BUILD), fetchData, frames])
      .then(([, content]) => {
        const drawn = el.querySelector(".local-graph-label")
        if (el.isConnected && !drawn) draw(el, content, JSON.parse(el.dataset.cfg))
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
