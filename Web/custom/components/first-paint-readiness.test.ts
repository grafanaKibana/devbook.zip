import assert from "node:assert/strict"
import test from "node:test"
import vm from "node:vm"
import { PageReveal } from "./page-reveal"

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
