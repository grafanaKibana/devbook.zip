import assert from "node:assert/strict"
import test from "node:test"
import vm from "node:vm"
import { ExcalidrawExport } from "./excalidraw-export"

const runLoader = (hasScene: boolean) => {
  const listeners = new Map<string, (...args: unknown[]) => void>()
  const appended: unknown[] = []
  const page = {
    hasAttribute: () => false,
    setAttribute() {},
  }
  const document = {
    documentElement: { getAttribute: () => "dark" },
    querySelector(selector: string) {
      if (selector === "script.excalidraw-data") return hasScene ? {} : null
      return null
    },
    querySelectorAll: () => (hasScene ? [page] : []),
    createElement: () => ({ dataset: {}, addEventListener() {} }),
    head: { appendChild: (node: unknown) => appended.push(node) },
    addEventListener: (name: string, listener: (...args: unknown[]) => void) =>
      listeners.set(name, listener),
  }
  const context: Record<string, unknown> = { document, console }
  context.window = context

  const component = ExcalidrawExport(undefined)
  vm.runInNewContext(String(component.afterDOMLoaded), context)
  return { appended, listeners }
}

test("does not load the exporter on pages without Excalidraw scene data", () => {
  const { appended, listeners } = runLoader(false)
  assert.equal(appended.length, 0)
  assert.deepEqual([...listeners.keys()].sort(), ["nav", "prenav", "render", "themechange"])
})

test("loads the exporter once when Excalidraw scene data is present", () => {
  const { appended } = runLoader(true)
  assert.equal(appended.length, 1)
  assert.equal((appended[0] as { src: string }).src, "/static/excalidraw/exporter.js")
})
