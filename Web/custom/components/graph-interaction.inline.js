import { PIXI_BUILD, loadLibrary } from "./local-note-graph.js"
import { graphNodeHitRadius } from "./graph-node-hit-radius.js"
import { resolveBasePath, simplifySlug } from "@quartz-community/utils"

// The global graph already owns its open/close commands. A native modal puts
// its backdrop above the fixed header and makes the rest of the page inert.
function setupDialogs() {
  for (const outer of document.querySelectorAll(".global-graph-outer")) {
    if (outer.parentElement.matches("dialog")) continue
    const trigger = outer.parentElement.querySelector(".global-graph-icon")
    const dialog = document.createElement("dialog")
    dialog.className = "graph graph-dialog"
    dialog.setAttribute("aria-label", trigger.getAttribute("aria-label"))
    trigger.setAttribute("aria-haspopup", "dialog")
    outer.before(dialog)
    dialog.append(outer)

    // Keep return focus for Enter, but reserve the panel outline for keyboard use.
    const clearPointerFocus = () => {
      if (!outer.classList.contains("active")) trigger.removeAttribute("data-pointer-focus")
    }
    trigger.addEventListener("blur", clearPointerFocus)
    trigger.addEventListener("keydown", clearPointerFocus)
    const sync = () => {
      const open = outer.classList.contains("active")
      if (open && !dialog.open) {
        trigger.focus({ preventScroll: true })
        dialog.showModal()
      } else if (!open && dialog.open) {
        dialog.close()
      }
    }
    const observer = new MutationObserver(sync)
    observer.observe(outer, { attributes: true, attributeFilter: ["class"] })
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault()
      if (outer.classList.contains("active")) trigger.click()
    })
    sync()
    window.addCleanup?.(() => {
      observer.disconnect()
      trigger.removeEventListener("blur", clearPointerFocus)
      trigger.removeEventListener("keydown", clearPointerFocus)
      trigger.removeAttribute("data-pointer-focus")
      if (dialog.open) dialog.close()
      dialog.replaceWith(outer)
    })
  }
}

document.addEventListener("nav", setupDialogs)
document.addEventListener("DOMContentLoaded", setupDialogs)
// Search is opened by a document-level shortcut, outside native modal inertness.
document.addEventListener(
  "keydown",
  (event) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "k" &&
      document.querySelector(".graph-dialog[open]")
    ) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  },
  true,
)

// Pixi's application extension runs for each new graph, including theme changes.
// The graph plugin populates the scene synchronously after creating its simulation.
let extended
function installGraphPicking() {
  const pixi = window.PIXI
  if (!pixi || pixi === extended) return
  extended = pixi
  pixi.extensions.add({
    extension: pixi.ExtensionType.Application,
    init() {
      this.stage.once("childAdded", () => {
        const container = this.canvas.parentElement
        if (!container?.matches(".global-graph-container")) return
        // Quartz constructs its D3 simulation and then its zoom synchronously after
        // attaching this scene. Capture both so dragging moves the underlying layout
        // and the opening view can frame it.
        const d3 = window.d3
        const create = d3.forceSimulation
        const createZoom = d3.zoom
        let zoom
        const captureZoom = (...args) => {
          d3.zoom = createZoom
          zoom = createZoom(...args)
          return zoom
        }
        const capture = (...args) => {
          d3.forceSimulation = create
          d3.zoom = captureZoom
          const simulation = create(...args)
          fetchData.then((content) => {
            if (container.isConnected && this.stage && !this.stage.destroyed) {
              enhancePicking(this, container, content, simulation, zoom)
            }
          })
          return simulation
        }
        d3.forceSimulation = capture
        queueMicrotask(() => {
          if (d3.forceSimulation === capture) d3.forceSimulation = create
          if (d3.zoom === captureZoom) d3.zoom = createZoom
        })
      })
    },
    destroy() {},
  })
}

document.addEventListener("load", installGraphPicking, true)
installGraphPicking()

// Warm PixiJS once while idle wherever the graph panel is displayed, so opening
// the global graph does not wait for its download and parse.
let warmed
function warmPixi() {
  if (warmed || !document.querySelector(".graph")?.getClientRects().length) return
  warmed = true
  const load = () =>
    loadLibrary(PIXI_BUILD)
      .then(warmRenderer)
      .catch(() => {
        warmed = false
      })
  if (window.requestIdleCallback) window.requestIdleCallback(load, { timeout: 3000 })
  else setTimeout(load, 1000)
}

// One throwaway frame compiles the renderer's code and shaders ahead of the
// first real graph, which otherwise opens twice as slowly as later ones.
async function warmRenderer() {
  const pixi = window.PIXI
  const app = new pixi.Application()
  await app.init({ width: 16, height: 16, antialias: true, backgroundAlpha: 0, autoStart: false })
  // As the plugin does: no animation-frame loop while nothing is drawn.
  pixi.Ticker.system.autoStart = false
  pixi.Ticker.system.stop()
  const node = new pixi.Graphics().circle(0, 0, 4).fill("#000").circle(0, 0, 3).stroke("#fff")
  const link = new pixi.Graphics().moveTo(0, 0).lineTo(8, 8).stroke({ width: 1, color: "#fff" })
  app.stage.addChild(link, node)
  app.render()
  app.destroy(true)
}
document.addEventListener("nav", warmPixi)

// Pixi cannot parse every computed CSS colour. Painting one pixel yields sRGB.
function cssColor(container, className) {
  const probe = document.createElement("div")
  probe.className = className
  probe.style.cssText = "position:absolute;visibility:hidden"
  container.append(probe)
  const style = getComputedStyle(probe)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  context.fillStyle = style.color
  context.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
  const opacity = Number.parseFloat(style.opacity)
  probe.remove()
  return {
    color: `rgb(${r}, ${g}, ${b})`,
    alpha: (a / 255) * (Number.isNaN(opacity) ? 1 : opacity),
  }
}

// The zoom transform that frames the whole layout. It never zooms in past 1×:
// above that the plugin builds every label at once, which stalls the opening.
function fitTransform(app, simulation, zoom) {
  const d3 = window.d3
  const { width, height } = app.screen
  const models = simulation.nodes()
  const [x0, x1] = d3.extent(models, (n) => n.x)
  const [y0, y1] = d3.extent(models, (n) => n.y)
  const [minScale] = zoom.scaleExtent()
  const pad = 24
  const fit = Math.min((width - 2 * pad) / (x1 - x0 || 1), (height - 2 * pad) / (y1 - y0 || 1))
  const scale = Math.max(minScale, Math.min(1, fit))
  // The plugin draws node positions offset by half the canvas.
  const midX = (x0 + x1) / 2 + width / 2
  const midY = (y0 + y1) / 2 + height / 2
  return d3.zoomIdentity.translate(width / 2 - scale * midX, height / 2 - scale * midY).scale(scale)
}

// Quartz uses trailing slashes for folder indexes and "/" for Home.
function contentSlug(id) {
  return id.replace(/\/$/, "/index").replace(/^\//, "")
}

function enhancePicking(app, container, content, simulation, zoom) {
  const graph = app.stage.children[0]
  const links = simulation.force("link").links()
  const current = simplifySlug(document.body.dataset.slug)
  // The plugin draws every resting link into one graphic, and hovered links into another.
  const [linkGfx] = graph.children.filter((child) => child instanceof window.PIXI.Graphics)
  const lineColor = cssColor(container, "graph-view color-line")
  const layer = graph.children.find((child) =>
    child.children.some((node) => node.eventMode === "static" && node.cursor === "pointer"),
  )
  // The plugin creates labels lazily in a separate layer and positions them on their nodes.
  const labels = graph.children.find(
    (child) => child !== layer && !(child instanceof window.PIXI.Graphics),
  )
  const nodes = (layer?.children ?? []).map((node) => ({
    node,
    radius: node.getLocalBounds().width / 2,
  }))
  const topicColors = JSON.parse(document.querySelector(".ec-color-map")?.textContent || "{}")
  const surface = getComputedStyle(container)
  const background = surface.backgroundColor
  const neutral = surface.getPropertyValue("--gray").trim()

  // Use the same nearest-center rule for Pixi hover and canvas gestures.
  function pick(x, y) {
    let closest
    let best = Infinity
    for (const entry of nodes) {
      const distance = (entry.node.x - x) ** 2 + (entry.node.y - y) ** 2
      if (distance < best && distance <= graphNodeHitRadius(entry.radius, graph.scale.x) ** 2) {
        best = distance
        closest = entry.node
      }
    }
    return closest
  }
  let hovered, grabbed, highlighted
  // Quartz adds labels in node order. Count distinct neighbors so reciprocal
  // links between the same two notes count as one connection.
  const neighbors = new Map(nodes.map(({ node }) => [node.label, new Set()]))
  for (const { source, target } of links) {
    if (source.id === target.id) continue
    neighbors.get(source.id).add(target.id)
    neighbors.get(target.id).add(source.id)
  }
  // Rank notes by connections. The best-connected 5% are labelled in the opening
  // view; the rest fade in as the view zooms to 3.5× its opening scale.
  const degrees = Array.from(neighbors.values(), (set) => set.size).sort((a, b) => a - b)
  const rank = (node) =>
    window.d3.bisectLeft(degrees, neighbors.get(node.label).size) / Math.max(1, degrees.length - 1)
  const revealAt = (node) => 0.75 + (2.5 * Math.max(0, 0.95 - rank(node))) / 0.95

  // The view keeps the settling layout framed until the reader zooms, pans or drags.
  let openingScale = graph.scale.x
  let following = !!zoom
  function follow() {
    if (!following) return
    const transform = fitTransform(app, simulation, zoom)
    openingScale = transform.k
    window.d3.select(app.canvas).call(zoom.transform, transform)
  }
  if (zoom) {
    zoom.on("start.fit", (event) => {
      if (event.sourceEvent) following = false
    })
    simulation.on("tick.fit", follow).on("end.fit", () => {
      following = false
    })
    follow()
  }

  // The plugin creates labels only above 1× zoom, all at once. At or below 1×,
  // hub labels are HTML over the canvas, which stays crisp without building
  // textures. Above 1× the plugin's own labels take over.
  const cfg = JSON.parse(container.dataset.cfg || "{}")
  const textColor = cssColor(container, "graph-view color-text")
  const overlay = document.createElement("div")
  overlay.className = "graph-hub-labels"
  overlay.style.color = textColor.color
  overlay.style.opacity = String(textColor.alpha)
  overlay.style.fontSize = `${(cfg.fontSize || 0.6) * 15}px`
  container.append(overlay)
  const hubs = new Map(
    nodes
      .filter(({ node }) => rank(node) >= 0.95)
      .map(({ node }) => {
        const label = document.createElement("span")
        label.textContent = content[contentSlug(node.label)]?.title ?? node.label
        overlay.append(label)
        return [node, label]
      }),
  )
  const point = new window.PIXI.Point()
  function updateHubLabels() {
    const shown = graph.scale.x <= 1
    for (const [node, label] of hubs) {
      const visible = shown && node !== highlighted
      label.hidden = !visible
      if (!visible) continue
      graph.toGlobal(node.position, point)
      label.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -120%)`
    }
  }

  const labelNodes = new Map()
  function labelNode(label) {
    if (!labelNodes.has(label)) {
      const entry = nodes.find(({ node }) => node.x === label.x && node.y === label.y)
      if (entry) labelNodes.set(label, entry.node)
    }
    return labelNodes.get(label)
  }
  function updateLabels() {
    for (const label of labels?.children ?? []) {
      if (!label.visible) continue
      const node = labelNode(label)
      if (!node || node === highlighted) continue
      const zoomed = graph.scale.x / openingScale
      label.alpha = Math.max(0, Math.min(1, (zoomed - revealAt(node)) / 0.25))
    }
    updateHubLabels()
  }
  // At rest only links to the current note keep full strength. Hover dims the rest itself.
  function drawIdleLinks() {
    if (highlighted || !linkGfx) return
    const cx = app.screen.width / 2
    const cy = app.screen.height / 2
    linkGfx.clear()
    for (const secondary of [false, true]) {
      let drawn = false
      for (const { source, target } of links) {
        if ((source.id !== current && target.id !== current) !== secondary) continue
        linkGfx.moveTo(source.x + cx, source.y + cy).lineTo(target.x + cx, target.y + cy)
        drawn = true
      }
      if (drawn) {
        const alpha = lineColor.alpha * (secondary ? 0.2 : 1)
        linkGfx.stroke({ width: 1, color: lineColor.color, alpha })
      }
    }
  }
  // The plugin renders on demand and rewrites label opacity and links before each frame.
  const render = app.render.bind(app)
  app.render = (...args) => {
    updateLabels()
    drawIdleLinks()
    return render(...args)
  }
  function updateHighlight() {
    const next = grabbed ?? hovered
    if (next === highlighted) return
    highlighted?.emit("graph-unhighlight")
    highlighted = next
    highlighted?.emit("graph-highlight")
  }

  // Notes with the same size and colours share one drawing, so the first frame
  // tessellates each look once instead of once per note.
  const drawings = new Map()
  function drawing(radius, color, fill) {
    const key = `${radius}|${color}|${fill}`
    if (!drawings.has(key)) {
      const width = 1.5
      drawings.set(
        key,
        new window.PIXI.GraphicsContext()
          .circle(0, 0, radius)
          .fill(fill)
          .circle(0, 0, radius - width / 2)
          .stroke({ color, width }),
      )
    }
    return drawings.get(key)
  }

  for (const { node, radius } of nodes) {
    if (!node.label.startsWith("tags/")) {
      const topic = node.label.split("/", 1)[0]
      const color = topicColors[topic + "/index"] ?? topicColors[topic] ?? neutral
      const folder = content[contentSlug(node.label)]?.tags?.includes("foldernote")
      const fill = folder ? window.d3.interpolateRgb(background, color)(0.5) : background
      node.context = drawing(radius, color, fill)
    }
    node.hitArea = {
      contains(x, y) {
        if (x * x + y * y > graphNodeHitRadius(radius, graph.scale.x) ** 2) return false
        return pick(node.x + x, node.y + y) === node
      },
    }
    // Keep Quartz's label, neighbor and edge styling together. A drag owns
    // that highlight even when Pixi detects the pointer over another node.
    for (const [pointer, effect] of [
      ["pointerover", "graph-highlight"],
      ["pointerleave", "graph-unhighlight"],
    ]) {
      for (const listener of node.listeners(pointer)) {
        node.off(pointer, listener)
        node.on(effect, listener)
      }
    }
    node.on("pointerover", () => {
      hovered = node
      updateHighlight()
    })
    node.on("pointerleave", () => {
      if (hovered === node) hovered = undefined
      updateHighlight()
    })
  }

  installNodeDrag(
    app,
    graph,
    simulation,
    (x, y, pointerType) => (pointerType === "mouse" && hovered) || pick(x, y),
    (node) => {
      grabbed = node
      following = false
      updateHighlight()
    },
    (x, y, pointerType) => {
      hovered = pointerType === "mouse" ? pick(x, y) : undefined
      grabbed = undefined
      updateHighlight()
    },
  )
}

function installNodeDrag(app, graph, simulation, pick, grab, release) {
  const canvas = app.canvas
  const models = new Map(simulation.nodes().map((model) => [model.id, model]))
  const screen = new window.PIXI.Point()
  const local = new window.PIXI.Point()
  const slop = 5
  let press

  function locate(event) {
    app.renderer.events.mapPositionToPoint(screen, event.clientX, event.clientY)
    graph.toLocal(screen, undefined, local)
  }

  // Quartz registers separate mouse/touch drag and zoom behaviors on the canvas.
  // Claim node gestures at pointerdown, before either compatibility event fires.
  window.d3.select(canvas).on(".drag", null)
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (press || !event.isPrimary || event.button !== 0 || event.ctrlKey) return
      locate(event)
      const node = pick(local.x, local.y, event.pointerType)
      const model = models.get(node?.label)
      if (!model) return
      canvas.setPointerCapture(event.pointerId)
      press = {
        id: event.pointerId,
        model,
        moved: false,
        clientX: event.clientX,
        clientY: event.clientY,
        offsetX: model.x - local.x,
        offsetY: model.y - local.y,
      }
      model.fx = model.x
      model.fy = model.y
      grab(node)
      event.preventDefault()
    },
    { capture: true, passive: false },
  )

  function blockPan(event) {
    if (!press) return
    event.preventDefault()
    event.stopImmediatePropagation()
  }
  canvas.addEventListener("mousedown", blockPan, { capture: true, passive: false })
  canvas.addEventListener("touchstart", blockPan, { capture: true, passive: false })

  function distance(event) {
    return Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY)
  }
  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId !== press?.id) return
    if (!press.moved) {
      if (distance(event) <= slop) return
      press.moved = true
      simulation.alphaTarget(0.15).restart()
    }
    locate(event)
    press.model.fx = local.x + press.offsetX
    press.model.fy = local.y + press.offsetY
  })
  function finish(event) {
    if (event.pointerId !== press?.id) return
    const { model, moved } = press
    const clicked = event.type === "pointerup" && !moved && distance(event) <= slop
    press = undefined
    model.fx = model.fy = null
    simulation.alphaTarget(0)
    locate(event)
    const bounds = canvas.getBoundingClientRect()
    const inside =
      event.clientX >= bounds.left &&
      event.clientX < bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY < bounds.bottom
    release(local.x, local.y, event.type === "pointerup" && inside ? event.pointerType : null)
    if (clicked) window.location.assign(resolveBasePath(model.id))
  }
  canvas.addEventListener("pointerup", finish)
  canvas.addEventListener("pointercancel", finish)
  canvas.addEventListener("lostpointercapture", finish)
}
