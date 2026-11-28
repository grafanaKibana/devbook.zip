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
// what is on screen and moves into its own layout.
let kept

// Reduced motion collapses the duration tokens, which leaves the swap instant.
function tempoOf(container) {
  const style = getComputedStyle(container)
  const ms = (name) => {
    const token = style.getPropertyValue(name).trim()
    return parseFloat(token) * (token.endsWith("ms") ? 1 : 1000)
  }
  const large = ms("--dur-4")
  if (!(large > 1)) return
  return { onset: large, soft: 2 * large, ack: ms("--dur-2") || 0 }
}

// The travel is a live simulation stepped at a fixed rate, so it runs at the
// same pace on any display. HOME pulls a note toward its place in the settled
// layout, DRAG is the share of its speed it loses each step, and TUG is how
// hard notes push and pull each other on the way. At full strength those
// forces scatter the notes before the pull can bring them home.
const STEP = 1000 / 60
const HOME = 0.045
const DRAG = 0.4
const TUG = 0.08
function ramp(u) {
  const c = Math.min(1, Math.max(0, u))
  return c * c * (3 - 2 * c)
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
  const charge = () => d3.forceManyBody().strength(-100 * cfg.repelForce)
  const spring = () => d3.forceLink(links).distance(cfg.linkDistance)
  const collide = () => d3.forceCollide((n) => n.r).iterations(3)
  d3.forceSimulation(nodes)
    .force("charge", charge())
    .force("link", spring())
    .force("collide", collide())
    .stop()
    .tick(300)

  const held = kept && (!kept.svg.isConnected || kept.svg.parentNode === container)
  const reuse = held ? kept : undefined
  const svg = reuse ? d3.select(reuse.svg) : d3.create("svg")
  if (!reuse) {
    const scene = svg.append("g")
    scene.append("g").attr("class", "links")
    scene.append("g").attr("class", "nodes")
    scene.append("circle").attr("class", "current")
    svg.append("defs")
  }
  reuse?.stop?.()
  container.append(svg.node())
  svg.attr("aria-label", `Connections to ${center.title}`)
  const drawing = svg.select("g")
  const ring = drawing.select(".current").interrupt("ack")
  const tempo = tempoOf(container)
  const { onset, soft, ack } = tempo ?? { onset: 1, soft: 1, ack: 0 }
  const moving = reuse && tempo
  // The curves match --ease-in-out and --ease-out.
  const swing = d3.easeCubicInOut
  const arrive = d3.easePolyOut.exponent(5)

  // The layout on screen, which may still be in flight from the last page.
  const shown = new Map()
  drawing.selectAll(".nodes a").each(function (n) {
    const dot = this.firstChild
    shown.set(n.id, {
      x: +dot.getAttribute("cx"),
      y: +dot.getAttribute("cy"),
      r: +dot.getAttribute("r"),
      o: this.style.opacity === "" ? 1 : +this.style.opacity,
    })
  })
  const faded = new Map()
  if (moving) {
    drawing.selectAll(".links line").each(function () {
      faded.set(this, +getComputedStyle(this).opacity)
    })
  }
  const ringFrom = { x: +ring.attr("cx"), y: +ring.attr("cy"), r: +ring.attr("r") }

  const origin = shown.get(anchor.id) ?? { x: 0, y: 0 }
  // Turn or mirror the settled layout about its anchor to the closest match
  // with the shown one, so shared notes travel the least.
  let turn = { score: 0, flip: 1, cos: 1, sin: 0 }
  for (const flip of [1, -1]) {
    let dot = 0
    let cross = 0
    for (const n of nodes) {
      const p = shown.get(n.id)
      if (!p) continue
      const px = p.x - origin.x
      const py = p.y - origin.y
      dot += flip * n.x * px + n.y * py
      cross += flip * n.x * py - n.y * px
    }
    const score = Math.hypot(dot, cross)
    if (score > turn.score) turn = { score, flip, cos: dot / score, sin: cross / score }
  }
  for (const n of nodes) {
    const x = n.x * turn.flip
    n.x = x * turn.cos - n.y * turn.sin
    n.y = x * turn.sin + n.y * turn.cos
  }
  const adjacent = new Map(nodes.map((n) => [n, []]))
  for (const { source, target } of links) {
    adjacent.get(source).push(target)
    adjacent.get(target).push(source)
  }
  // Nodes arrive breadth-first, so a new note starts on a neighbor already
  // placed and the simulation pushes it out from there.
  for (const n of nodes) {
    const seen = shown.get(n.id)
    n.from = seen ?? adjacent.get(n).find((m) => m.from)?.from ?? origin
    n.r0 = seen ? seen.r : 0
    n.o0 = seen ? seen.o : 0
  }

  const extentX = d3.max(nodes, (n) => Math.abs(n.x) + n.r)
  const extentY = d3.max(nodes, (n) => Math.abs(n.y) + n.r)
  const colors = JSON.parse(document.querySelector(".ec-color-map")?.textContent || "{}")
  const actors = new Map(nodes.map((n) => [n.id, n]))
  const linked = drawing
    .select(".links")
    .selectAll("line")
    .data(
      links.sort((a, b) => a.direct - b.direct),
      (l) => `${l.source.id}\n${l.target.id}`,
    )
  const goneLines = linked.exit()
  const lines = linked
    .enter()
    .append("line")
    .merge(linked)
    .order()
    .attr("class", (l) => (l.direct ? "direct" : null))
    .style("opacity", null)
  const noted = drawing
    .select(".nodes")
    .selectAll("a")
    .data(nodes, (n) => n.id)
  const goneAnchors = noted
    .exit()
    .style("pointer-events", "none")
    .attr("aria-hidden", "true")
    .attr("aria-current", null)
    .attr("tabindex", -1)
  const entering = noted.enter().append("a")
  entering.append("circle").attr("class", (n) => (n.folder ? "dot folder" : "dot"))
  entering.append("circle").attr("class", "hit")
  const anchors = entering
    .merge(noted)
    .order()
    .attr("aria-hidden", null)
    .attr("tabindex", null)
    .attr("href", (n) => resolveBasePath(n.id))
    .attr("aria-label", (n) => n.title)
    .attr("aria-current", (n) => (n === center ? "page" : null))
    .style("--node-color", (n) => colors[n.id.split("/")[0] + "/index"] ?? "var(--gray)")
    .style("pointer-events", null)

  // A note that leaves is drawn back into the neighbor it hung from.
  const retreat = new Map()
  goneLines.each((l) => {
    const source = actors.get(l.source.id)
    const target = actors.get(l.target.id)
    if (source && !target) retreat.set(l.target.id, source)
    if (target && !source) retreat.set(l.source.id, target)
  })
  goneAnchors.each((n) => {
    n.from = shown.get(n.id)
    n.to = retreat.get(n.id)
    actors.set(n.id, n)
  })
  const ends = (l) => {
    l.a = actors.get(l.source.id)
    l.b = actors.get(l.target.id)
  }
  lines.each(function (l) {
    ends(l)
    l.o0 = faded.get(this) ?? 0
    l.o1 = moving ? +getComputedStyle(this).opacity : 1
  })
  goneLines.each(function (l) {
    ends(l)
    l.o0 = faded.get(this) ?? 1
    l.o1 = 0
  })

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
  let hovered, focused, acknowledged
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
    // Quartz's router reads HTMLAnchorElement.href, which SVG links lack. The
    // ring answers the click at once, before the next page has loaded.
    .on("click", (event, n) => {
      const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      if (modified || !window.spaNavigate) return
      event.preventDefault()
      acknowledged = true
      const chosen = ack ? ring.transition("ack").duration(ack).ease(arrive) : ring
      chosen
        .attr("cx", n.px)
        .attr("cy", n.py)
        .attr("r", n.r + 2.5)
      window.spaNavigate(new URL(resolveBasePath(n.id), location.href))
    })
  svg.on("click", (event) => {
    if (event.target.closest("a")) return
    event.stopPropagation()
    const opener = container.parentElement.querySelector(".global-graph-icon")
    opener.setAttribute("data-pointer-focus", "")
    opener.click()
  })

  const next = { svg: svg.node(), scale: reuse?.scale, actors }
  let width, height, scale
  let zoomed = 1
  function zoom() {
    if (!width) return
    const k0 = reuse?.scale ?? scale
    next.scale = k0 + (scale - k0) * zoomed
    drawing.attr("transform", `translate(${width / 2},${height / 2}) scale(${next.scale})`)
  }
  function fit() {
    const w = container.clientWidth,
      h = container.clientHeight
    if (!w || !h || (w === width && h === height)) return
    width = w
    height = h
    scale = Math.max(0.01, Math.min(1, (w / 2 - 12) / extentX, (h / 2 - 12) / extentY))
    const halfWidth = w / (2 * scale)
    const halfHeight = h / (2 * scale)
    const cells = triangulation.voronoi([-halfWidth, -halfHeight, halfWidth, halfHeight])
    hit.attr("r", (n) => graphNodeHitRadius(n.r, scale))
    clipPaths.attr("d", (_, i) => cells.renderCell(i))
    zoom()
  }

  // From here a note's x and y are where it is, and tx and ty where it settles.
  delete anchor.fx
  delete anchor.fy
  for (const n of nodes) {
    n.tx = n.x
    n.ty = n.y
    if (!moving) continue
    const before = reuse.actors?.get(n.id)
    n.x = n.from.x
    n.y = n.from.y
    n.vx = before?.vx ?? 0
    n.vy = before?.vy ?? 0
  }
  // The pull home eases in, so the travel has no visible first frame. The
  // forces between notes ease in with it and straight out again, which leaves
  // the pull alone to land every note exactly on its place.
  let pull = 0
  const flight = d3
    .forceSimulation(nodes)
    .alphaDecay(0)
    .velocityDecay(DRAG)
    .force("charge", charge())
    .force("link", spring())
    .force("collide", collide())
    .force("home", () => {
      for (const n of nodes) {
        n.vx += (n.tx - n.x) * HOME * pull
        n.vy += (n.ty - n.y) * HOME * pull
      }
    })
    .stop()
  function step(ms) {
    pull = ramp(ms / onset)
    flight.alpha(TUG * pull * (1 - ramp((ms - onset) / soft))).tick()
  }

  const everyAnchor = drawing.selectAll(".nodes a")
  const everyDot = everyAnchor.select(".dot")
  const everyLine = drawing.selectAll(".links line")
  function paint(ms) {
    const f = swing(Math.min(1, ms / soft))
    for (const n of nodes) {
      n.px = n.x
      n.py = n.y
      n.pr = n.r0 + (n.r - n.r0) * f
      n.po = n.o0 + (1 - n.o0) * f
    }
    goneAnchors.each((n) => {
      n.px = n.from.x + ((n.to?.px ?? n.from.x) - n.from.x) * f
      n.py = n.from.y + ((n.to?.py ?? n.from.y) - n.from.y) * f
      n.pr = n.from.r * (1 - f)
      n.po = n.from.o * (1 - f)
    })
    everyDot
      .attr("cx", (n) => n.px)
      .attr("cy", (n) => n.py)
      .attr("r", (n) => n.pr)
    everyAnchor.style("opacity", (n) => n.po)
    everyLine
      .attr("x1", (l) => l.a.px)
      .attr("y1", (l) => l.a.py)
      .attr("x2", (l) => l.b.px)
      .attr("y2", (l) => l.b.py)
      .style("opacity", (l) => l.o0 + (l.o1 - l.o0) * f)
    if (!acknowledged) {
      ring
        .attr("cx", ringFrom.x + (center.px - ringFrom.x) * f)
        .attr("cy", ringFrom.y + (center.py - ringFrom.y) * f)
        .attr("r", ringFrom.r + (center.pr + 2.5 - ringFrom.r) * f)
    }
    zoomed = f
    zoom()
  }
  function settle() {
    for (const n of nodes) {
      n.x = n.tx
      n.y = n.ty
      n.vx = n.vy = 0
    }
    paint(Infinity)
    hit.style("pointer-events", null)
    goneAnchors.remove()
    goneLines.remove()
    anchors.style("opacity", null)
    lines.style("opacity", null)
  }
  fit()
  if (moving) {
    // The enlarged targets sit at the final layout, so the dots take the clicks
    // until the notes get there.
    hit.style("pointer-events", "none")
    paint(0)
    let clock = 0
    let simulated = 0
    let last = 0
    const timer = d3.timer((elapsed) => {
      // A long frame counts for three steps at most, so a busy page slows the
      // travel instead of jolting it.
      clock += Math.min(elapsed - last, 3 * STEP)
      last = elapsed
      while (simulated + STEP <= clock) step((simulated += STEP))
      const home = nodes.every((n) => Math.hypot(n.tx - n.x, n.ty - n.y) < 0.25)
      if ((simulated > soft && home) || simulated > 4000) {
        timer.stop()
        settle()
      } else paint(simulated)
    })
    next.stop = () => timer.stop()
  } else {
    settle()
  }
  const resize = new ResizeObserver(fit)
  resize.observe(container)
  window.addCleanup?.(() => resize.disconnect())
  kept = next
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
    const hold = kept && !kept.svg.isConnected && tempoOf(el)
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
