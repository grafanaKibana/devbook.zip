import assert from "node:assert/strict"
import test from "node:test"
import vm from "node:vm"
import { PageReveal } from "./page-reveal"
import { ExcalidrawExport } from "./excalidraw-export"

{
  const resource = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value.join("\n") : (value ?? "")

  test("page reveal clears its readiness gate after the explorer is ready", async () => {
    const rootAttributes = new Map<string, string>()
    const articleAttributes = new Map<string, string>()
    let releaseExplorer = () => {}
    const explorerReady = new Promise<void>((resolve) => (releaseExplorer = resolve))
    const context: Record<string, unknown> = {
      document: {
        documentElement: {
          setAttribute: (name: string, value: string) => rootAttributes.set(name, value),
          removeAttribute: (name: string) => rootAttributes.delete(name),
        },
        addEventListener() {},
        querySelector: () => ({
          offsetWidth: 0,
          setAttribute: (name: string, value: string) => articleAttributes.set(name, value),
          removeAttribute: (name: string) => articleAttributes.delete(name),
        }),
      },
      Promise,
      requestIdleCallback: (callback: () => void) => callback(),
    }
    context.window = context
    ;(
      context.window as { __devbookExplorerFirstPaint: { ready: Promise<void> } }
    ).__devbookExplorerFirstPaint = { ready: explorerReady }

    const component = PageReveal(undefined)
    vm.runInNewContext(resource(component.beforeDOMLoaded), context)
    vm.runInNewContext(resource(component.afterDOMLoaded), context)
    await new Promise<void>((resolve) => setImmediate(resolve))
    assert.equal(rootAttributes.get("data-page-reveal-first-paint"), "pending")

    releaseExplorer()
    await new Promise<void>((resolve) => setImmediate(resolve))
    assert.equal(rootAttributes.has("data-page-reveal-first-paint"), false)
    assert.equal(articleAttributes.get("data-reveal"), "initial")
  })
}

{
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
}
