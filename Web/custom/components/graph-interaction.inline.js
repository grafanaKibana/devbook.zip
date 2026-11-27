import "./local-note-graph.js"
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
// Wait one frame for the graph plugin to attach its canvas and populate the scene.
function installGraphPicking() {
  const pixi = window.PIXI
  if (!pixi) return
  document.removeEventListener("load", installGraphPicking, true)
  pixi.extensions.add({
    extension: pixi.ExtensionType.Application,
    init() {
      this.stage.once("childAdded", () => {
        const container = this.canvas.parentElement
        if (!container?.matches(".global-graph-container")) return
        // Quartz constructs its D3 simulation synchronously after attaching this
        // scene. Capture that instance so dragging moves the underlying layout.
        const d3 = window.d3
        const create = d3.forceSimulation
        const capture = (...args) => {
          d3.forceSimulation = create
          const simulation = create(...args)
          this.ticker.addOnce(() => {
            fetchData.then((content) => {
              if (container.isConnected && this.stage && !this.stage.destroyed) {
                enhancePicking(this, container, content, simulation)
              }
            })
          })
          return simulation
        }
        d3.forceSimulation = capture
        queueMicrotask(() => {
          if (d3.forceSimulation === capture) d3.forceSimulation = create
        })
      })
    },
    destroy() {},
  })
}

document.addEventListener("load", installGraphPicking, true)
installGraphPicking()

function enhancePicking(app, container, content, simulation) {
  const graph = app.stage.children[0]
  // Quartz draws one graphic per simulation link, in the same order.
  const links = simulation.force("link").links()
  const current = simplifySlug(document.body.dataset.slug)
  const secondaryEdges = graph.children[0].children.filter((_, index) => {
    const { source, target } = links[index]
    return source.id !== current && target.id !== current
  })
  function setIdleEdges(idle) {
    // Hover already applies 0.2 in the stroke, so only dim the graphics at rest.
    for (const edge of secondaryEdges) edge.alpha = idle ? 0.2 : 1
  }
  setIdleEdges(true)
  const layer = graph?.children.find((child) =>
    child.children.some((node) => node.eventMode === "static" && node.cursor === "pointer"),
  )
  // Transparent labels sit above the dots and must let pointer events through.
  const labels = graph?.children.find((child) =>
    child.children.some((item) => item instanceof window.PIXI.Text),
  )
  if (labels) labels.eventMode = "none"
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
  const maxDegree = Math.max(1, ...Array.from(neighbors.values(), (set) => set.size))
  const zoomLabels = (labels?.children ?? []).map((label, index) => {
    const { node } = nodes[index]
    const priority = neighbors.get(node.label).size / maxDegree
    // First labels fade in above 1×; even isolated notes finish fading at 4×.
    return { label, node, revealAt: 3.25 - 2.25 * priority }
  })
  function updateLabels() {
    for (const { label, node, revealAt } of zoomLabels) {
      const opacity = (graph.scale.x - revealAt) / 0.75
      label.alpha = node === highlighted ? 1 : Math.max(0, Math.min(1, opacity))
    }
  }
  // Quartz writes a uniform opacity on every D3 zoom transform (including pans).
  // Apply the per-note opacity before Pixi draws each changed transform.
  let lastTransform
  app.ticker.add(() => {
    const transform = window.d3.zoomTransform(app.canvas)
    if (transform !== lastTransform) {
      lastTransform = transform
      updateLabels()
    }
  })
  function updateHighlight() {
    const next = grabbed ?? hovered
    if (next === highlighted) return
    if (!highlighted || !next) setIdleEdges(!next)
    highlighted?.emit("graph-unhighlight")
    highlighted = next
    highlighted?.emit("graph-highlight")
    updateLabels()
  }

  for (const { node, radius } of nodes) {
    if (!node.label.startsWith("tags/")) {
      const topic = node.label.split("/", 1)[0]
      const color = topicColors[topic + "/index"] ?? topicColors[topic] ?? neutral
      // Quartz uses trailing slashes for folder indexes and "/" for Home.
      const slug = node.label.replace(/\/$/, "/index").replace(/^\//, "")
      const folder = content[slug]?.tags?.includes("foldernote")
      const fill = folder ? window.d3.interpolateRgb(background, color)(0.5) : background
      const width = 1.5
      node.clear().circle(0, 0, radius).fill(fill)
      node.circle(0, 0, radius - width / 2).stroke({ color, width })
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
