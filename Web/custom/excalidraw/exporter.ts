type Theme = "light" | "dark"

type ScenePayload = {
  elements?: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

type ExportToSvg = (options: Record<string, unknown>) => Promise<SVGSVGElement>

let generation = 0
let renderSequence = 0
let exporterPromise: Promise<ExportToSvg> | undefined
const pageTickets = new WeakMap<HTMLElement, number>()

const setStatus = (page: HTMLElement, status: "loading" | "ready" | "skipped" | "error") => {
  page.setAttribute("data-devbook-excalidraw-export", status)
}

const hasUnsupportedFiles = (files: Record<string, unknown> | undefined) =>
  Object.values(files ?? {}).some((file) => {
    if (!file || typeof file !== "object") return true
    return !("dataURL" in file) || typeof file.dataURL !== "string" || file.dataURL.length === 0
  })

const readScene = (page: HTMLElement): ScenePayload | undefined => {
  const source = page.querySelector<HTMLScriptElement>("script.excalidraw-data")
  if (!source?.textContent) return undefined
  return JSON.parse(source.textContent) as ScenePayload
}

const canonicalExporter = async (): Promise<ExportToSvg> => {
  exporterPromise ??= import("@excalidraw/excalidraw").then(
    ({ exportToSvg }) => exportToSvg as unknown as ExportToSvg,
  )
  return exporterPromise
}

export const invalidate = () => {
  generation += 1
}

export async function renderPageWith(
  page: HTMLElement,
  theme: Theme,
  exportToSvg: ExportToSvg,
): Promise<"ready" | "skipped" | "stale"> {
  const scene = readScene(page)
  const currentGeneration = generation
  const ticket = ++renderSequence
  pageTickets.set(page, ticket)

  if (!scene || page.querySelector(".excalidraw-overlay") || hasUnsupportedFiles(scene.files)) {
    setStatus(page, "skipped")
    return "skipped"
  }

  const target = page.querySelector<SVGSVGElement>(".excalidraw-container > svg")
  if (!target) {
    setStatus(page, "skipped")
    return "skipped"
  }

  if (page.getAttribute("data-devbook-excalidraw-export") !== "ready") {
    setStatus(page, "loading")
  }
  const background = scene.appState?.viewBackgroundColor
  const exportBackground =
    scene.appState?.exportBackground !== false &&
    typeof background === "string" &&
    !["", "#fff", "#ffffff", "#ffffffff", "#00000000", "transparent"].includes(
      background.trim().toLowerCase(),
    )
  const exported = await exportToSvg({
    elements: scene.elements ?? [],
    appState: {
      ...(scene.appState ?? {}),
      exportBackground,
      exportEmbedScene: false,
      exportWithDarkMode: theme === "dark",
      theme,
    },
    files: scene.files ?? {},
    exportPadding: 10,
    renderEmbeddables: false,
    skipInliningFonts: true,
  })

  for (const text of exported.querySelectorAll<SVGTextElement>("text[fill]")) {
    if (!text.style.fill) text.style.fill = text.getAttribute("fill")!
  }

  if (generation !== currentGeneration || pageTickets.get(page) !== ticket || !page.isConnected) {
    return "stale"
  }

  const viewBox = exported.getAttribute("viewBox")
  if (viewBox) target.setAttribute("viewBox", viewBox)
  const filter = exported.getAttribute("filter")
  if (filter) target.setAttribute("filter", filter)
  else target.removeAttribute("filter")
  target.removeAttribute("data-bg-color")
  target.replaceChildren(...Array.from(exported.childNodes, (node) => node.cloneNode(true)))
  setStatus(page, "ready")
  page.setAttribute("data-devbook-excalidraw-theme", theme)
  return "ready"
}

export async function renderAll(theme: Theme): Promise<void> {
  const pages = Array.from(document.querySelectorAll<HTMLElement>(".excalidraw-page"))
  if (pages.length === 0) return

  let exportToSvg: ExportToSvg
  try {
    exportToSvg = await canonicalExporter()
  } catch (error) {
    pages.forEach((page) => setStatus(page, "error"))
    throw error
  }

  await Promise.all(
    pages.map(async (page) => {
      try {
        await renderPageWith(page, theme, exportToSvg)
      } catch (error) {
        if (page.isConnected) setStatus(page, "error")
        console.warn("DevBook Excalidraw export failed; keeping the server-rendered SVG.", error)
      }
    }),
  )
}
