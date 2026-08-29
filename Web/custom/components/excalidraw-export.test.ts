import assert from "node:assert/strict"
import test from "node:test"
import vm from "node:vm"
import { ExcalidrawExport } from "./excalidraw-export"

const runLoader = (hasScene: boolean) => {
  const listeners = new Map<string, (...args: unknown[]) => void>()
  const appended: Array<{ src?: string }> = []
  const document = {
    documentElement: { getAttribute: () => "dark" },
    querySelector: (selector: string) =>
      selector === "script.excalidraw-data" && hasScene ? {} : null,
    querySelectorAll: () => (hasScene ? [{ hasAttribute: () => false, setAttribute() {} }] : []),
    createElement: () => ({ dataset: {}, addEventListener() {} }),
    head: { appendChild: (node: { src?: string }) => appended.push(node) },
    addEventListener: (name: string, listener: (...args: unknown[]) => void) =>
      listeners.set(name, listener),
  }
  const context: Record<string, unknown> = { document, console }
  context.window = context
  vm.runInNewContext(String(ExcalidrawExport(undefined).afterDOMLoaded), context)
  return { appended, listeners }
}

test("the exporter loader activates once only when scene data exists", () => {
  const absent = runLoader(false)
  absent.listeners.get("nav")?.()
  assert.equal(absent.appended.length, 0)

  const present = runLoader(true)
  present.listeners.get("nav")?.()
  present.listeners.get("render")?.()
  assert.equal(present.appended.length, 1)
  assert.equal(present.appended[0]?.src, "/static/excalidraw/exporter.js")
})
