import type { FlowmaidProgram } from "../../domain/types"
import { createFlowmaidEngine } from "../../engine"
import { cloneNativeMermaid } from "../../mermaid/adapter"

const STYLE_URL = "/static/flowmaid/flowmaid.css"
const engine = createFlowmaidEngine()
const mounted = new Map<HTMLElement, () => void>()
let style: Promise<void> | undefined

const fail = (mount: HTMLElement, error: unknown) => {
  if (mount.querySelector(":scope > .flowmaid-diagnostic")) return
  const diagnostic = mount.ownerDocument.createElement("p")
  diagnostic.className = "flowmaid-diagnostic"
  diagnostic.textContent = `Flowmaid: ${error instanceof Error ? error.message : String(error)}`
  mount.append(diagnostic)
}

const clearFailure = (mount: HTMLElement) =>
  mount.querySelector(":scope > .flowmaid-diagnostic")?.remove()

const loadStyle = (): Promise<void> => {
  if (style) return style
  style = new Promise((resolve, reject) => {
    let link = document.querySelector<HTMLLinkElement>('link[data-flowmaid-style="1"]')
    if (link?.sheet) return resolve()
    const created = !link
    link ??= document.createElement("link")
    link.rel = "stylesheet"
    link.href = STYLE_URL
    link.dataset.flowmaidStyle = "1"
    link.setAttribute("data-persist", "")
    link.addEventListener("load", () => resolve(), { once: true })
    link.addEventListener(
      "error",
      () => {
        style = undefined
        reject(new Error(`could not load ${STYLE_URL}`))
      },
      { once: true },
    )
    if (created) document.head.append(link)
  })
  return style
}

const bind = (mount: HTMLElement): void => {
  if (mounted.has(mount) || !mount.isConnected) return
  const id = mount.dataset.flowmaidId
  const pair = mount.previousElementSibling
  if (!id || !(pair instanceof HTMLElement) || pair.dataset.flowmaidId !== id) {
    fail(mount, "the local Mermaid diagram could not be resolved")
    return
  }

  let handle: ReturnType<ReturnType<typeof createFlowmaidEngine>["mount"]> | undefined
  let current: SVGSVGElement | null = null
  let timer: number | undefined
  let destroyed = false
  let program: FlowmaidProgram
  try {
    program = JSON.parse(mount.dataset.flowmaidProgram ?? "null") as FlowmaidProgram
  } catch (error) {
    fail(mount, error)
    return
  }

  const refresh = () => {
    if (destroyed) return
    const next = pair.querySelector<SVGSVGElement>("code.mermaid > svg, :scope > svg")
    if (!next || next === current) return
    if (timer !== undefined) window.clearTimeout(timer)
    timer = undefined
    try {
      if (handle) handle.replaceSvg(next)
      else handle = engine.mount(mount, next, program)
      current = next
      clearFailure(mount)
    } catch (error) {
      fail(mount, error)
      destroy()
    }
  }
  const observer = new MutationObserver(refresh)
  const destroy = () => {
    if (destroyed) return
    destroyed = true
    if (timer !== undefined) window.clearTimeout(timer)
    observer.disconnect()
    handle?.destroy()
    mounted.delete(mount)
  }
  mounted.set(mount, destroy)
  observer.observe(pair, { childList: true, subtree: true })
  refresh()
  if (!handle && !destroyed)
    timer = window.setTimeout(() => {
      if (!handle) {
        fail(mount, "the Mermaid SVG was not ready")
        destroy()
      }
    }, 10_000)
}

const destroyAll = () => {
  Array.from(mounted.values()).forEach((destroy) => destroy())
}

export const hydrateFlowmaid = () => {
  const mounts = Array.from(
    document.querySelectorAll<HTMLElement>(".flowmaid-mount[data-flowmaid-program]"),
  ).filter((mount) => !mounted.has(mount))
  if (!mounts.length) return
  void loadStyle().then(
    () => mounts.forEach(bind),
    (error) => mounts.forEach((mount) => fail(mount, error)),
  )
}

const sanitizePopup = (event: MouseEvent) => {
  const target = event.target
  if (!(target instanceof Element)) return
  const popup = target
    .closest("button.expand-button")
    ?.closest<HTMLElement>("pre[data-flowmaid-id]")
    ?.querySelector<SVGSVGElement>("#mermaid-container.active .mermaid-content > svg")
  if (popup) popup.replaceWith(cloneNativeMermaid(popup))
}

document.addEventListener("prenav", destroyAll)
document.addEventListener("nav", hydrateFlowmaid)
document.addEventListener("render", hydrateFlowmaid)
document.addEventListener("click", sanitizePopup)
;(window as Window & { addCleanup?: (cleanup: () => void) => void }).addCleanup?.(destroyAll)
hydrateFlowmaid()
