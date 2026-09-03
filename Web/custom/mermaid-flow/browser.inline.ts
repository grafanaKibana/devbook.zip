import { observePairSvg, resolveConfiguredQuartzPair, type PairLifecycle } from "./pairing"
import type { MountHandle } from "./src/mount"

const ENGINE_URL = "/static/mermaid-flow/engine.js"
const STYLE_URL = "/static/mermaid-flow/engine.css"
interface MermaidFlowEngine {
  mount(container: HTMLElement, svg: SVGSVGElement, source: string): MountHandle
  cloneNativeMermaidSvg(svg: SVGSVGElement): SVGSVGElement
}

const host = window as Window & {
  __devbookMermaidFlow?: boolean
  addCleanup?: (cleanup: () => void) => void
  mermaidFlow?: MermaidFlowEngine
}

if (!host.__devbookMermaidFlow) {
  host.__devbookMermaidFlow = true
  let stylePromise: Promise<void> | undefined
  let enginePromise: Promise<MermaidFlowEngine> | undefined
  const mounted = new Map<HTMLElement, () => void>()
  const pending = new Set<HTMLElement>()

  const loadStyle = (): Promise<void> => {
    if (stylePromise) return stylePromise
    stylePromise = new Promise((resolve, reject) => {
      let link = document.querySelector<HTMLLinkElement>('link[data-mermaid-flow-style="1"]')
      if (link?.sheet) {
        resolve()
        return
      }
      const created = !link
      link ??= document.createElement("link")
      link.rel = "stylesheet"
      link.href = STYLE_URL
      link.dataset.mermaidFlowStyle = "1"
      link.setAttribute("data-persist", "")
      link.addEventListener("load", () => resolve(), { once: true })
      link.addEventListener("error", () => reject(new Error(`could not load ${STYLE_URL}`)), {
        once: true,
      })
      if (created) document.head.append(link)
    })
    return stylePromise
  }

  const loadEngine = (): Promise<MermaidFlowEngine> => {
    if (enginePromise) return enginePromise
    enginePromise = new Promise((resolve, reject) => {
      if (host.mermaidFlow?.mount) {
        resolve(host.mermaidFlow)
        return
      }
      let script = document.querySelector<HTMLScriptElement>('script[data-mermaid-flow-engine="1"]')
      const created = !script
      script ??= document.createElement("script")
      script.src = ENGINE_URL
      script.dataset.mermaidFlowEngine = "1"
      script.setAttribute("data-persist", "")
      script.addEventListener(
        "load",
        () =>
          host.mermaidFlow?.mount
            ? resolve(host.mermaidFlow)
            : reject(new Error("Mermaid Flow engine exposed no mount()")),
        { once: true },
      )
      script.addEventListener("error", () => reject(new Error(`could not load ${ENGINE_URL}`)), {
        once: true,
      })
      if (created) document.head.append(script)
    })
    return enginePromise
  }

  const loadAssets = async (): Promise<MermaidFlowEngine> => {
    const [, engine] = await Promise.all([loadStyle(), loadEngine()])
    return engine
  }

  const renderFailure = (mount: HTMLElement, message: string): void => {
    if (mount.dataset.mermaidFlowFailed) return
    mount.dataset.mermaidFlowFailed = "1"
    const diagnostic = mount.ownerDocument.createElement("p")
    diagnostic.className = "mermaid-flow-diagnostic"
    diagnostic.textContent = `Mermaid Flow: ${message}`
    mount.replaceChildren(diagnostic)
  }

  const sanitizeNativePopup = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>("button.expand-button")
    const pairRoot = button?.closest<HTMLElement>("pre[data-mermaid-flow-pair]")
    const popupSvg = pairRoot?.querySelector<SVGSVGElement>(
      "#mermaid-container.active .mermaid-content > svg",
    )
    if (!popupSvg) return
    if (host.mermaidFlow) popupSvg.replaceWith(host.mermaidFlow.cloneNativeMermaidSvg(popupSvg))
  }

  const destroyAll = () => {
    for (const destroy of Array.from(mounted.values())) destroy()
    mounted.clear()
    pending.clear()
  }

  const bind = (mount: HTMLElement, pairRoot: HTMLElement, engine: MermaidFlowEngine) => {
    if (mounted.has(pairRoot) || !mount.isConnected || !pairRoot.isConnected) return
    let handle: MountHandle | undefined
    let lifecycle: PairLifecycle | undefined
    let readinessTimeout: number | undefined
    let destroyed = false

    const destroy = () => {
      if (destroyed) return
      destroyed = true
      if (readinessTimeout !== undefined) window.clearTimeout(readinessTimeout)
      lifecycle?.destroy()
      handle?.destroy()
      mounted.delete(pairRoot)
    }
    const fail = (error: unknown) => {
      renderFailure(mount, error instanceof Error ? error.message : String(error))
      destroy()
    }

    lifecycle = observePairSvg(
      pairRoot,
      (svg) => {
        if (destroyed) return
        if (readinessTimeout !== undefined) {
          window.clearTimeout(readinessTimeout)
          readinessTimeout = undefined
        }
        try {
          if (handle) handle.replaceSvg(svg)
          else handle = engine.mount(pairRoot, svg, mount.dataset.config ?? "")
        } catch (error) {
          fail(error)
        }
      },
      () => {},
    )
    if (destroyed) {
      lifecycle.destroy()
      return
    }
    if (!handle && !destroyed) {
      readinessTimeout = window.setTimeout(() => {
        readinessTimeout = undefined
        if (!handle) fail(new Error("the paired Mermaid SVG was not ready"))
      }, 10_000)
    }
    mounted.set(pairRoot, destroy)
    if (host.addCleanup) host.addCleanup(destroy)
    else
      document.addEventListener("nav", () => (host.addCleanup ?? (() => {}))(destroy), {
        once: true,
      })
  }

  const discover = () => {
    const pairs = Array.from(
      document.querySelectorAll<HTMLElement>(".mermaid-flow-mount[data-mermaid-flow-pair]"),
    ).flatMap((mount) => {
      if (pending.has(mount) || mount.dataset.mermaidFlowFailed) return []
      const pairRoot = resolveConfiguredQuartzPair(mount)
      return pairRoot && !mounted.has(pairRoot) ? [{ mount, pairRoot }] : []
    })
    if (!pairs.length) return
    pairs.forEach(({ mount }) => pending.add(mount))
    void loadAssets().then(
      (engine) =>
        pairs.forEach(({ mount, pairRoot }) => {
          pending.delete(mount)
          bind(mount, pairRoot, engine)
        }),
      (error) =>
        pairs.forEach(({ mount }) => {
          pending.delete(mount)
          if (mount.isConnected)
            renderFailure(mount, error instanceof Error ? error.message : String(error))
        }),
    )
  }

  document.addEventListener("prenav", destroyAll)
  document.addEventListener("nav", discover)
  document.addEventListener("render", discover)
  document.addEventListener("click", sanitizeNativePopup)
  discover()
}
