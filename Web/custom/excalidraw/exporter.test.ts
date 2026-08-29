import assert from "node:assert/strict"
import test from "node:test"
import { renderPageWith } from "./exporter"

type FakeNode = { cloneNode(deep?: boolean): FakeNode; id: string }

const node = (id: string): FakeNode => ({ id, cloneNode: () => node(id) })

const fixture = (payload: object) => {
  const children = [node("server")]
  const attributes = new Map<string, string>([["data-bg-color", "#fff"]])
  const svg = {
    childNodes: children,
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    replaceChildren: (...next: FakeNode[]) => children.splice(0, children.length, ...next),
  }
  const pageAttributes = new Map<string, string>()
  const page = {
    isConnected: true,
    querySelector(selector: string) {
      if (selector === "script.excalidraw-data") return { textContent: JSON.stringify(payload) }
      if (selector === ".excalidraw-container > svg") return svg
      return null
    },
    getAttribute: (name: string) => pageAttributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => pageAttributes.set(name, value),
  }
  return { page, children, attributes, pageAttributes }
}

const exportedSvg = {
  childNodes: [node("exported")],
  getAttribute: (name: string) => (name === "viewBox" ? "0 0 100 100" : null),
  querySelectorAll: () => [],
}

test("valid scene data replaces the server SVG through the canonical exporter", async () => {
  const scene = fixture({ elements: [], appState: {}, files: {} })
  let options: Record<string, unknown> | undefined

  const result = await renderPageWith(scene.page as never, "dark", async (received) => {
    options = received
    return exportedSvg as never
  })

  assert.equal(result, "ready")
  assert.deepEqual(
    scene.children.map(({ id }) => id),
    ["exported"],
  )
  assert.equal(scene.attributes.get("viewBox"), "0 0 100 100")
  assert.equal(scene.pageAttributes.get("data-devbook-excalidraw-export"), "ready")
  assert.equal((options?.appState as Record<string, unknown>).exportWithDarkMode, true)
})

test("unsupported binary scenes preserve the server SVG", async () => {
  const scene = fixture({ elements: [], appState: {}, files: { image: { mimeType: "image/png" } } })
  let called = false

  const result = await renderPageWith(scene.page as never, "light", async () => {
    called = true
    return exportedSvg as never
  })

  assert.equal(result, "skipped")
  assert.equal(called, false)
  assert.deepEqual(
    scene.children.map(({ id }) => id),
    ["server"],
  )
})
