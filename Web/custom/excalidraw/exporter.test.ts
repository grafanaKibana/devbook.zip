import assert from "node:assert/strict"
import test from "node:test"
import { invalidate, renderPageWith } from "./exporter"

type FakeNode = { cloneNode(deep?: boolean): FakeNode; id: string }
type FakeText = { getAttribute(name: string): string | null; style: { fill: string } }

const node = (id: string): FakeNode => ({
  id,
  cloneNode: () => node(id),
})

const fixture = (payload: object, options: { overlay?: boolean; connected?: boolean } = {}) => {
  const attributes = new Map<string, string>([["data-bg-color", "#ffffff"]])
  const originalChildren: FakeNode[] = [node("server")]
  const svg = {
    childNodes: originalChildren,
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    replaceChildren: (...children: FakeNode[]) => {
      originalChildren.splice(0, originalChildren.length, ...children)
    },
  }
  const pageAttributes = new Map<string, string>()
  const page = {
    isConnected: options.connected ?? true,
    querySelector(selector: string) {
      if (selector === "script.excalidraw-data") return { textContent: JSON.stringify(payload) }
      if (selector === ".excalidraw-overlay") return options.overlay ? {} : null
      if (selector === ".excalidraw-container > svg") return svg
      return null
    },
    getAttribute: (name: string) => pageAttributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => pageAttributes.set(name, value),
  }
  return { page, pageAttributes, svg, attributes, originalChildren }
}

const exportedSvg = (
  viewBox = "0 0 640 480",
  texts: FakeText[] = [],
  filter: string | null = null,
) => ({
  childNodes: [node("canonical")],
  getAttribute: (name: string) => {
    if (name === "viewBox") return viewBox
    if (name === "filter") return filter
    return null
  },
  querySelectorAll: (selector: string) => (selector === "text[fill]" ? texts : []),
})

const exportedText = (fill: string | null, inlineFill = ""): FakeText => ({
  getAttribute: (name: string) => (name === "fill" ? fill : null),
  style: { fill: inlineFill },
})

test("uses the canonical exporter with a transparent dark app state and preserves SVG identity", async () => {
  const scene = fixture({
    elements: [{ id: "shape" }],
    appState: { viewBackgroundColor: "#fff" },
    files: {},
  })
  const originalSvg = scene.svg
  let received: Record<string, unknown> | undefined

  const result = await renderPageWith(scene.page as never, "dark", async (options) => {
    received = options
    return exportedSvg("0 0 640 480", [], "invert(93%) hue-rotate(180deg)") as never
  })

  assert.equal(result, "ready")
  assert.equal(scene.svg, originalSvg)
  assert.equal(scene.attributes.get("viewBox"), "0 0 640 480")
  assert.equal(scene.attributes.get("filter"), "invert(93%) hue-rotate(180deg)")
  assert.equal(scene.attributes.has("data-bg-color"), false)
  assert.deepEqual(
    scene.originalChildren.map(({ id }) => id),
    ["canonical"],
  )
  assert.equal(scene.pageAttributes.get("data-devbook-excalidraw-export"), "ready")
  assert.equal(scene.pageAttributes.get("data-devbook-excalidraw-theme"), "dark")
  assert.deepEqual(received?.appState, {
    viewBackgroundColor: "#fff",
    exportBackground: false,
    exportEmbedScene: false,
    exportWithDarkMode: true,
    theme: "dark",
  })
  assert.equal(received?.exportPadding, 10)
  assert.equal(received?.skipInliningFonts, true)

  await renderPageWith(scene.page as never, "light", async () => exportedSvg() as never)
  assert.equal(scene.attributes.has("filter"), false)
})

test("preserves canonical SVG text colors against Quartz global text styles", async () => {
  const scene = fixture({ elements: [], appState: {}, files: {} })
  const exported = exportedText("#2563eb")
  const existing = exportedText("#475569", "#111827")

  await renderPageWith(
    scene.page as never,
    "dark",
    async () => exportedSvg("0 0 640 480", [exported, existing]) as never,
  )

  assert.equal(exported.style.fill, "#2563eb")
  assert.equal(existing.style.fill, "#111827")
})

test("leaves the server SVG intact for overlays and unresolved binary files", async () => {
  const cases = [
    fixture({ elements: [], appState: {}, files: {} }, { overlay: true }),
    fixture({ elements: [], appState: {}, files: { image: { mimeType: "image/png" } } }),
  ]

  for (const scene of cases) {
    let called = false
    const result = await renderPageWith(scene.page as never, "light", async () => {
      called = true
      return exportedSvg() as never
    })
    assert.equal(result, "skipped")
    assert.equal(called, false)
    assert.deepEqual(
      scene.originalChildren.map(({ id }) => id),
      ["server"],
    )
    assert.equal(scene.pageAttributes.get("data-devbook-excalidraw-export"), "skipped")
  }
})

test("does not apply an export invalidated during navigation", async () => {
  const scene = fixture({ elements: [], appState: {}, files: {} })
  let finish: ((svg: unknown) => void) | undefined
  const pending = renderPageWith(
    scene.page as never,
    "light",
    () => new Promise((resolve) => (finish = resolve as (svg: unknown) => void)),
  )

  invalidate()
  finish?.(exportedSvg())

  assert.equal(await pending, "stale")
  assert.deepEqual(
    scene.originalChildren.map(({ id }) => id),
    ["server"],
  )
})
