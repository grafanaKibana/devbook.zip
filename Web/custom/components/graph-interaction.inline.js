import { resolveBasePath } from "@quartz-community/utils"

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
      this.ticker.addOnce(() => {
        const container = this.canvas.parentElement
        if (!container?.matches(".graph-container, .global-graph-container")) return
        fetchData.then((content) => enhancePicking(this, container, content))
      })
    },
    destroy() {},
  })
}

document.addEventListener("load", installGraphPicking, true)
installGraphPicking()

function enhancePicking(app, container, content) {
  const local = container.classList.contains("graph-container")
  const graph = app.stage.children[0]
  const layer = graph?.children.find((child) =>
    child.children.some((node) => node.eventMode === "static" && node.cursor === "pointer"),
  )
  const nodes = (layer?.children ?? []).map((node) => ({
    node,
    radius: node.getLocalBounds().width / 2,
  }))
  const topicColors = JSON.parse(document.querySelector(".ec-color-map")?.textContent || "{}")
  const surface = getComputedStyle(local ? container.parentElement : container)
  const background = surface.backgroundColor
  const neutral = surface.getPropertyValue("--gray").trim()

  // Drawn sizes stay untouched. Hit areas keep a minimum 24px diameter on
  // screen when zoomed out. In overlapping targets, the closest center wins.
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
        const distance = x * x + y * y
        const scale = graph.scale.x
        if (distance > Math.max(radius + 4 / scale, 12 / scale) ** 2) return false
        return !nodes.some(
          ({ node: other }) =>
            other !== node && (other.x - node.x - x) ** 2 + (other.y - node.y - y) ** 2 < distance,
        )
      },
    }

    if (local) {
      // The plugin binds its local navigation to Pixi's mouse-only click.
      node.on("tap", (event) => node.emit("click", event))
    } else {
      // D3 owns global node dragging/navigation within radius + 5 graph units.
      // Use the additional hit area only when D3 did not claim this press.
      let extraTarget = false
      let start
      node.on("pointerdown", (e) => {
        start = { x: e.global.x, y: e.global.y }
        const p = e.getLocalPosition(layer)
        extraTarget = !nodes.some(
          ({ node: n, radius: r }) => (p.x - n.x) ** 2 + (p.y - n.y) ** 2 < (r + 5) ** 2,
        )
      })
      node.on("pointertap", (e) => {
        if (
          extraTarget &&
          e.button === 0 &&
          Math.hypot(e.global.x - start.x, e.global.y - start.y) <= 5
        ) {
          window.location.assign(resolveBasePath(node.label))
        }
        extraTarget = false
      })
    }
  }

  if (!local) return
  app.renderer.events.cursorStyles.default = "zoom-in"
  const canvas = app.canvas
  const opener = container.parentElement.querySelector(".global-graph-icon")
  let start
  function isBackground(event) {
    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) * app.screen.width) / rect.width
    const y = ((event.clientY - rect.top) * app.screen.height) / rect.height
    return app.renderer.events.rootBoundary.hitTest(x, y)?.cursor !== "pointer"
  }
  canvas.addEventListener("pointerdown", (event) => {
    start =
      event.isPrimary && event.button === 0 && isBackground(event)
        ? { x: event.clientX, y: event.clientY }
        : null
  })
  canvas.addEventListener("pointermove", (event) => {
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) start = null
  })
  canvas.addEventListener("pointercancel", () => {
    start = null
  })
  canvas.addEventListener("click", (event) => {
    if (start && isBackground(event)) {
      event.stopPropagation()
      opener.setAttribute("data-pointer-focus", "")
      opener.click()
    }
    start = null
  })
}
